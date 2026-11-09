package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.*;
import com.foodsave.backend.dto.NotificationDTO;
import com.foodsave.backend.dto.OrderStatusUpdateRequest;
import com.foodsave.backend.entity.*;
import com.foodsave.backend.repository.*;
import com.foodsave.backend.util.SecurityUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CustomerCancellationNotificationServiceTest {
    NotificationRepository repository = mock(NotificationRepository.class);
    RealtimeEventService realtime = mock(RealtimeEventService.class);
    CustomerCancellationNotificationService service = new CustomerCancellationNotificationService(repository, realtime);
    Order order = new Order();
    @BeforeEach void setup() {
        User user = new User(); user.setId(41L); user.setTelegramUserId(555L);
        order.setUser(user); order.setOrderNumber("123456"); order.setStatusActorType(ReservationActorType.ADMIN);
        when(repository.save(any())).thenAnswer(call -> { Notification n = call.getArgument(0); n.setId(7L); return n; });
    }
    @AfterEach void cleanup() { if (TransactionSynchronizationManager.isSynchronizationActive()) TransactionSynchronizationManager.clearSynchronization(); }
    @Test void staffCancellationsAreDelivered() {
        for (ReservationActorType actor : List.of(ReservationActorType.ADMIN, ReservationActorType.PARTNER)) {
            order.setStatusActorType(actor);
            for (OrderStatus status : List.of(OrderStatus.CANCELLED, OrderStatus.CANCELLED_BY_PARTNER, OrderStatus.REJECTED)) {
                assertTrue(CustomerCancellationNotificationService.shouldNotify(order, OrderStatus.CREATED, status));
            }
        }
    }
    @Test void userSystemAndAutomaticStatusesAreExcluded() {
        for (ReservationActorType actor : List.of(ReservationActorType.USER, ReservationActorType.SYSTEM)) {
            order.setStatusActorType(actor);
            assertFalse(CustomerCancellationNotificationService.shouldNotify(order, OrderStatus.CREATED, OrderStatus.CANCELLED));
        }
        order.setStatusActorType(ReservationActorType.ADMIN);
        for (OrderStatus status : List.of(OrderStatus.CANCELLED_BY_USER, OrderStatus.EXPIRED, OrderStatus.NO_SHOW, OrderStatus.COMPLETED)) {
            assertFalse(CustomerCancellationNotificationService.shouldNotify(order, OrderStatus.CREATED, status));
        }
    }
    @Test void repeatAndTerminalCorrectionDoNotSendAnotherAlert() {
        for (OrderStatus previous : List.of(OrderStatus.CANCELLED, OrderStatus.CANCELLED_BY_USER, OrderStatus.CANCELLED_BY_PARTNER, OrderStatus.REJECTED, OrderStatus.EXPIRED, OrderStatus.NO_SHOW)) {
            service.record(order, previous, OrderStatus.CANCELLED_BY_PARTNER);
        }
        verifyNoInteractions(repository, realtime);
    }
    @Test void messageIsStoredForCorrectCustomerBeforeRealtimeIsPublished() {
        TransactionSynchronizationManager.initSynchronization();
        service.record(order, OrderStatus.CREATED, OrderStatus.CANCELLED);
        var captor = ArgumentCaptor.forClass(Notification.class); verify(repository).save(captor.capture());
        assertEquals(CustomerCancellationNotificationService.MESSAGE, captor.getValue().getMessage());
        assertEquals("Заказ #123456 отменён", captor.getValue().getTitle());
        assertEquals(order.getUser(), captor.getValue().getUser()); assertFalse(captor.getValue().isRead());
        verifyNoInteractions(realtime);
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        verify(realtime).publish(eq(41L), eq("notification-created"), any(NotificationDTO.class));
    }
    @Test void rollbackDoesNotPublish() {
        TransactionSynchronizationManager.initSynchronization();
        service.record(order, OrderStatus.CREATED, OrderStatus.CANCELLED);
        TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
        verifyNoInteractions(realtime);
    }
    @Test void repeatedRealStatusTransitionStoresOnlyOneNotification() {
        OrderRepository orders = mock(OrderRepository.class);
        var statusService = new ReservationStatusService(mock(OrderStatusHistoryRepository.class), orders,
                mock(ProductRepository.class), mock(UserRepository.class), mock(SecurityUtil.class), mock(ProductEventService.class));
        ReflectionTestUtils.setField(statusService, "customerCancellationNotifications", service);
        // Production has an after-commit dispatcher; keep this test compatible with both source baselines.
        try { ReflectionTestUtils.setField(statusService, "statusNotifications", mock(Class.forName("com.foodsave.backend.service.OrderStatusNotificationDispatcher"))); } catch (IllegalArgumentException | ClassNotFoundException ignored) {}
        order.setStatus(OrderStatus.CREATED); order.setItems(List.of());
        when(orders.save(any())).thenAnswer(c -> c.getArgument(0));
        var request = new OrderStatusUpdateRequest(OrderStatus.CANCELLED, ReservationActorType.ADMIN, ReservationCancellationReason.OTHER, "Закончились боксы");
        statusService.changeStatus(order, request); statusService.changeStatus(order, request);
        verify(repository, times(1)).save(any());
    }
    @Test void customerReceivesRequestedTextWhileStaffKeepsStatusDetails() {
        var bot = mock(TelegramBotService.class); var orders = mock(OrderRepository.class); var settings = mock(NotificationSettingsRepository.class);
        order.setId(8L); order.setStatus(OrderStatus.CANCELLED); when(orders.findById(8L)).thenReturn(Optional.of(order));
        when(bot.resolveButtonUrl("/orders/8")).thenReturn("https://miniapp.foodsave.kz/orders/8");
        var telegram = new TelegramOrderNotificationService(bot, orders, settings);
        ReflectionTestUtils.setField(telegram, "recipientChatIds", "999");
        telegram.notifyStatusChanged(order, OrderStatus.CREATED, OrderStatus.CANCELLED);
        verify(bot).sendMessage(eq(555L), argThat(p -> p.text().contains("#123456")
                && p.text().contains("<a href=\"https://t.me/FoodSave_kz\">Напишите в поддержку</a>")
                && p.buttonText().equals("Открыть заказ")
                && p.buttonUrl().equals("https://miniapp.foodsave.kz/orders/8")));
        verify(bot).sendManagerMessage(eq(999L), argThat(p -> p.text().contains("Статус:")));
    }
    @Test void supportButtonIsOrdinaryTelegramLinkNotMiniApp() {
        var rest = mock(org.springframework.web.client.RestTemplate.class);
        var bot = new TelegramBotService(new org.springframework.boot.web.client.RestTemplateBuilder());
        ReflectionTestUtils.setField(bot, "restTemplate", rest);
        ReflectionTestUtils.setField(bot, "miniAppBaseUrl", "https://miniapp.foodsave.kz");
        when(rest.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(org.springframework.http.ResponseEntity.ok("{\"ok\":true}"));
        assertTrue(bot.sendMessageWithToken("test-only", 555L,
                new TelegramBotService.TelegramMessagePayload("Message", null, "Написать в поддержку", CustomerCancellationNotificationService.SUPPORT_URL)));
        var payload = ArgumentCaptor.forClass(Map.class);
        verify(rest).postForEntity(eq("https://api.telegram.org/bottest-only/sendMessage"), payload.capture(), eq(String.class));
        Map markup = (Map) payload.getValue().get("reply_markup");
        Map button = (Map) ((List) ((List) markup.get("inline_keyboard")).get(0)).get(0);
        assertEquals("https://t.me/FoodSave_kz", button.get("url"));
        assertFalse(button.containsKey("web_app"));
        assertEquals("HTML", payload.getValue().get("parse_mode"));
        assertFalse(payload.getValue().containsKey("link_preview_options"));
    }
    @Test void otherStatusUpdatesKeepOpenOrderButton() {
        var bot = mock(TelegramBotService.class); var orders = mock(OrderRepository.class); var settings = mock(NotificationSettingsRepository.class);
        order.setId(8L); order.setStatusActorType(ReservationActorType.USER);
        when(orders.findById(8L)).thenReturn(Optional.of(order));
        when(bot.resolveButtonUrl("/orders/8")).thenReturn("https://miniapp.foodsave.kz/orders/8");
        var telegram = new TelegramOrderNotificationService(bot, orders, settings);
        ReflectionTestUtils.setField(telegram, "recipientChatIds", "");
        telegram.notifyStatusChanged(order, OrderStatus.CREATED, OrderStatus.CANCELLED);
        verify(bot).sendMessage(eq(555L), argThat(p -> p.buttonText().equals("Открыть заказ")
                && p.buttonUrl().equals("https://miniapp.foodsave.kz/orders/8") && p.text().contains("Статус:")));
    }
    @Test void cancellationAllowsSupportPreviewAndOpensExactOrder() {
        var rest = mock(org.springframework.web.client.RestTemplate.class);
        var bot = new TelegramBotService(new org.springframework.boot.web.client.RestTemplateBuilder());
        ReflectionTestUtils.setField(bot, "restTemplate", rest);
        ReflectionTestUtils.setField(bot, "botToken", "test-only");
        ReflectionTestUtils.setField(bot, "miniAppBaseUrl", "https://miniapp.foodsave.kz");
        when(rest.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(org.springframework.http.ResponseEntity.ok("{\"ok\":true}"));
        var orders = mock(OrderRepository.class);
        var settings = mock(NotificationSettingsRepository.class);
        order.setId(8L); order.setStatus(OrderStatus.CANCELLED);
        when(orders.findById(8L)).thenReturn(Optional.of(order));
        var telegram = new TelegramOrderNotificationService(bot, orders, settings);
        ReflectionTestUtils.setField(telegram, "recipientChatIds", "");
        telegram.notifyStatusChanged(order, OrderStatus.CREATED, OrderStatus.CANCELLED);
        var payload = ArgumentCaptor.forClass(Map.class);
        verify(rest).postForEntity(eq("https://api.telegram.org/bottest-only/sendMessage"), payload.capture(), eq(String.class));
        assertFalse(payload.getValue().containsKey("link_preview_options"));
        assertTrue(((String) payload.getValue().get("text")).contains("<a href=\"https://t.me/FoodSave_kz\">Напишите в поддержку</a>"));
        Map markup = (Map) payload.getValue().get("reply_markup");
        List rows = (List) markup.get("inline_keyboard");
        assertEquals(1, rows.size()); assertEquals(1, ((List) rows.get(0)).size());
        Map button = (Map) ((List) rows.get(0)).get(0);
        assertEquals("Открыть заказ", button.get("text"));
        assertEquals(Map.of("url", "https://miniapp.foodsave.kz/orders/8"), button.get("web_app"));
        assertFalse(button.containsKey("url"));
    }
    @Test void missingCustomerDoesNotCreateNotification() {
        order.setUser(null); service.record(order, OrderStatus.CREATED, OrderStatus.CANCELLED); verifyNoInteractions(repository, realtime);
    }
}
