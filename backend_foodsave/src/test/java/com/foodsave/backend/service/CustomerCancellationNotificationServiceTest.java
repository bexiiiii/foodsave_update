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
        var telegram = new TelegramOrderNotificationService(bot, orders, settings);
        ReflectionTestUtils.setField(telegram, "recipientChatIds", "999");
        telegram.notifyStatusChanged(order, OrderStatus.CREATED, OrderStatus.CANCELLED);
        verify(bot).sendMessage(eq(555L), argThat(p -> p.text().equals(CustomerCancellationNotificationService.MESSAGE)));
        verify(bot).sendManagerMessage(eq(999L), argThat(p -> p.text().contains("Статус:")));
    }
    @Test void missingCustomerDoesNotCreateNotification() {
        order.setUser(null); service.record(order, OrderStatus.CREATED, OrderStatus.CANCELLED); verifyNoInteractions(repository, realtime);
    }
}
