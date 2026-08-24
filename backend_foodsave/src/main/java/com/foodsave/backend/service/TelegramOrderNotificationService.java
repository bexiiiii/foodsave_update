package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.DeliveryType;
import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.entity.Order;
import com.foodsave.backend.entity.OrderItem;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.repository.OrderRepository;
import com.foodsave.backend.repository.NotificationSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramOrderNotificationService {

    private static final DateTimeFormatter ORDER_TIME_FORMAT =
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm", new Locale("ru"));
    private static final ZoneId DEFAULT_TIME_ZONE = ZoneId.of("Asia/Almaty");

    private final TelegramBotService telegramBotService;
    private final OrderRepository orderRepository;
    private final NotificationSettingsRepository notificationSettingsRepository;

    @Value("${telegram.order-notifications.chat-ids:}")
    private String recipientChatIds;

    public enum PickupReminderResult {
        SENT,
        SKIPPED,
        FAILED
    }

    @Transactional(readOnly = true)
    public void notifyNewOrder(Order order) {
        if (order == null) {
            return;
        }

        Set<Long> chatIds = parseRecipientChatIds();
        if (chatIds.isEmpty()) {
            log.debug("Telegram order notification recipients are not configured");
            return;
        }

        Order notificationOrder = resolveNotificationOrder(order);
        String message;
        try {
            message = buildNewOrderMessage(notificationOrder);
        } catch (Exception e) {
            log.error("Failed to build Telegram order notification for order id={}", order.getId(), e);
            return;
        }

        for (Long chatId : chatIds) {
            try {
                telegramBotService.sendManagerMessage(chatId, new TelegramBotService.TelegramMessagePayload(
                        message,
                        null,
                        null,
                        null
                ));
            } catch (Exception e) {
                log.warn("Failed to send Telegram order notification to chatId={} orderId={}",
                        chatId, notificationOrder.getId(), e);
            }
        }

        log.info("Telegram order notification for order {} sent to {} configured chat(s)",
                resolveOrderNumber(notificationOrder), chatIds.size());
    }

    public void notifyStatusChanged(Order order, OrderStatus previous, OrderStatus current) {
        if (order == null || previous == current) return;
        Set<Long> chatIds = parseRecipientChatIds();
        Long customerChatId = order.getUser() == null ? null : order.getUser().getTelegramUserId();
        boolean customerNotificationsEnabled = order.getUser() != null
                && notificationSettingsRepository.findByUser(order.getUser())
                .map(com.foodsave.backend.entity.NotificationSettings::isOrderUpdates)
                .orElse(true);
        if (chatIds.isEmpty() && (customerChatId == null || !customerNotificationsEnabled)) return;
        String message = "<b>Изменение заказа #" + html(resolveOrderNumber(order)) + "</b>\n"
                + "Статус: " + html(statusLabel(previous)) + " → " + html(statusLabel(current));
        for (Long chatId : chatIds) {
            telegramBotService.sendManagerMessage(chatId,
                    new TelegramBotService.TelegramMessagePayload(message, null, null, null));
        }
        if (customerChatId != null && customerNotificationsEnabled) {
            telegramBotService.sendMessage(customerChatId,
                    new TelegramBotService.TelegramMessagePayload(message, null, "Открыть заказ",
                    telegramBotService.resolveButtonUrl("/orders/" + order.getId())));
        }
    }

    public PickupReminderResult notifyPickupReminder(Order order) {
        return notifyPickupReminders(order == null ? Collections.emptyList() : Collections.singletonList(order));
    }

    public PickupReminderResult notifyPickupReminders(List<Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return PickupReminderResult.SKIPPED;
        }

        Order firstOrder = orders.stream()
                .filter(order -> order != null && order.getUser() != null)
                .findFirst()
                .orElse(null);
        if (firstOrder == null || firstOrder.getUser().getTelegramUserId() == null) {
            return PickupReminderResult.SKIPPED;
        }
        User user = firstOrder.getUser();
        boolean customerNotificationsEnabled = notificationSettingsRepository.findByUser(user)
                .map(com.foodsave.backend.entity.NotificationSettings::isOrderUpdates)
                .orElse(true);
        if (!customerNotificationsEnabled) {
            return PickupReminderResult.SKIPPED;
        }

        String message = buildPickupReminderMessage(orders);
        boolean sent = telegramBotService.sendMessage(user.getTelegramUserId(),
                new TelegramBotService.TelegramMessagePayload(
                        message,
                        null,
                        orders.size() == 1 ? "Открыть заказ" : "Открыть заказы",
                        telegramBotService.resolveButtonUrl(orders.size() == 1 ? "/orders/" + firstOrder.getId() : "/orders")
                ));
        return sent ? PickupReminderResult.SENT : PickupReminderResult.FAILED;
    }

    private String buildPickupReminderMessage(List<Order> orders) {
        if (orders.size() == 1) {
            return buildSinglePickupReminderMessage(orders.get(0));
        }

        StringBuilder text = new StringBuilder();
        text.append("<b>⏰ Напоминание о заказах</b>\n");
        text.append("Ваши боксы всё ещё ждут вас:\n\n");

        int visibleOrders = Math.min(orders.size(), 10);
        for (int i = 0; i < visibleOrders; i++) {
            appendPickupReminderOrderLine(text, orders.get(i));
        }

        if (orders.size() > visibleOrders) {
            text.append("\nИ ещё ").append(orders.size() - visibleOrders).append(" заказ(ов) в приложении.\n");
        }

        text.append("\nЕсли планы изменились, отмените лишние заказы в приложении, чтобы боксы увидели другие.");
        return text.toString();
    }

    private String buildSinglePickupReminderMessage(Order order) {
        Store store = order.getStore();
        OrderItem firstItem = order.getItems() != null && !order.getItems().isEmpty()
                ? order.getItems().get(0)
                : null;
        Product product = firstItem != null ? firstItem.getProduct() : null;

        StringBuilder text = new StringBuilder();
        text.append("<b>⏰ Напоминание о заказе #").append(html(resolveOrderNumber(order))).append("</b>\n");
        text.append("Ваш бокс всё ещё ждёт вас");
        if (store != null && store.getName() != null && !store.getName().isBlank()) {
            text.append(" в ").append(html(store.getName().trim()));
        }
        text.append(".\n\n");

        if (product != null && product.getName() != null && !product.getName().isBlank()) {
            int quantity = firstItem.getQuantity() != null ? firstItem.getQuantity() : 1;
            text.append("Бокс: ").append(html(product.getName())).append(" × ").append(quantity).append("\n");
        }
        if (store != null && store.getAddress() != null && !store.getAddress().isBlank()) {
            text.append("Адрес: ").append(html(store.getAddress())).append("\n");
        }
        if (store != null && store.getClosingHours() != null && !store.getClosingHours().isBlank()) {
            text.append("Заберите до: ").append(html(store.getClosingHours())).append("\n");
        }

        text.append("\nЕсли планы изменились, отмените заказ в приложении, чтобы бокс увидели другие.");
        return text.toString();
    }

    private void appendPickupReminderOrderLine(StringBuilder text, Order order) {
        Store store = order.getStore();
        OrderItem firstItem = order.getItems() != null && !order.getItems().isEmpty()
                ? order.getItems().get(0)
                : null;
        Product product = firstItem != null ? firstItem.getProduct() : null;
        int quantity = firstItem != null && firstItem.getQuantity() != null ? firstItem.getQuantity() : 1;

        text.append("• #").append(html(resolveOrderNumber(order)));
        if (store != null && store.getName() != null && !store.getName().isBlank()) {
            text.append(" — ").append(html(store.getName().trim()));
        }
        text.append("\n");

        if (product != null && product.getName() != null && !product.getName().isBlank()) {
            text.append("  Бокс: ").append(html(product.getName())).append(" × ").append(quantity).append("\n");
        }
        if (store != null && store.getAddress() != null && !store.getAddress().isBlank()) {
            text.append("  Адрес: ").append(html(store.getAddress())).append("\n");
        }
        if (store != null && store.getClosingHours() != null && !store.getClosingHours().isBlank()) {
            text.append("  Заберите до: ").append(html(store.getClosingHours())).append("\n");
        }
    }

    private String statusLabel(OrderStatus status) {
        if (status == null) return "—";
        return switch (status) {
            case CREATED -> "Создан";
            case PENDING -> "Ожидает подтверждения";
            case CONFIRMED -> "Подтверждён";
            case PREPARING -> "Готовится";
            case READY_FOR_PICKUP -> "Готов к выдаче";
            case PICKED_UP -> "Получен клиентом";
            case COMPLETED -> "Завершён";
            case OUT_FOR_DELIVERY -> "Передан в доставку";
            case DELIVERED -> "Выдан";
            case CANCELLED -> "Отменён";
            case CANCELLED_BY_USER -> "Отменён пользователем";
            case CANCELLED_BY_PARTNER -> "Отменён заведением";
            case EXPIRED -> "Истёк";
            case NO_SHOW -> "Клиент не пришёл";
            case REJECTED -> "Отклонён";
            case REFUNDED -> "Возврат";
        };
    }

    private Order resolveNotificationOrder(Order order) {
        if (order.getId() == null) {
            return order;
        }
        return orderRepository.findById(order.getId()).orElse(order);
    }

    private String buildNewOrderMessage(Order order) {
        Store store = order.getStore();
        User customer = order.getUser();
        String orderNumber = resolveOrderNumber(order);

        StringBuilder text = new StringBuilder();
        text.append("<b>🆕 Новая бронь #").append(html(orderNumber)).append("</b>\n");

        if (store != null) {
            text.append("Заведение: ").append(html(orDash(store.getName()))).append("\n");
            if (store.getAddress() != null && !store.getAddress().isBlank()) {
                text.append("Адрес: ").append(html(store.getAddress())).append("\n");
            }
        }

        text.append("\n<b>Состав:</b>\n");
        if (order.getItems() == null || order.getItems().isEmpty()) {
            text.append("—\n");
        } else {
            for (OrderItem item : order.getItems()) {
                Product product = item.getProduct();
                String productName = product != null ? product.getName() : null;
                int quantity = item.getQuantity() != null ? item.getQuantity() : 1;
                text.append("• ").append(html(orDash(productName)))
                        .append(" × ").append(quantity)
                        .append(" — ").append(formatPrice(resolveLineTotal(item)))
                        .append("\n");
            }
        }

        text.append("\nИтого: ").append(formatPrice(order.getTotal())).append("\n");
        text.append("Тип: ").append(resolveDeliveryLabel(order)).append("\n");

        String customerName = resolveCustomerName(customer);
        if (!customerName.isBlank()) {
            text.append("Клиент: ").append(html(customerName)).append("\n");
        }

        text.append("Телефон: ").append(html(orDash(order.getContactPhone()))).append("\n");
        appendBlacklistWarning(text, customer);

        if (order.getDeliveryNotes() != null && !order.getDeliveryNotes().isBlank()) {
            text.append("Комментарий: ").append(html(order.getDeliveryNotes().trim())).append("\n");
        }

        text.append("Создан: ").append(formatOrderTime(order.getCreatedAt()));
        return text.toString();
    }

    private Set<Long> parseRecipientChatIds() {
        Set<Long> chatIds = new LinkedHashSet<>();
        if (recipientChatIds == null || recipientChatIds.isBlank()) {
            return chatIds;
        }

        for (String token : recipientChatIds.split("[,;\\s]+")) {
            if (token == null || token.isBlank()) {
                continue;
            }
            try {
                chatIds.add(Long.parseLong(token.trim()));
            } catch (NumberFormatException e) {
                log.warn("Invalid Telegram order notification chat id configured: {}", token);
            }
        }
        return chatIds;
    }

    private String resolveOrderNumber(Order order) {
        if (order.getOrderNumber() != null && !order.getOrderNumber().isBlank()) {
            return order.getOrderNumber();
        }
        return order.getId() != null ? String.valueOf(order.getId()) : "без номера";
    }

    private String resolveCustomerName(User customer) {
        if (customer == null) {
            return "";
        }

        String name = java.util.stream.Stream.of(customer.getFirstName(), customer.getLastName())
                .filter(value -> value != null && !value.isBlank())
                .reduce((first, second) -> first + " " + second)
                .orElse("");

        if (!name.isBlank()) {
            return name;
        }
        if (customer.getTelegramUsername() != null && !customer.getTelegramUsername().isBlank()) {
            return "@" + customer.getTelegramUsername();
        }
        if (customer.getTelegramUserId() != null) {
            return "TG ID " + customer.getTelegramUserId();
        }
        return "";
    }

    private void appendBlacklistWarning(StringBuilder text, User customer) {
        if (customer == null || !customer.isBlacklisted()) {
            return;
        }

        text.append("\n<b>⚠️ Внимание! Клиент в черном списке.</b>\n");
        if (customer.getBlacklistReason() != null && !customer.getBlacklistReason().isBlank()) {
            text.append("Причина: ").append(html(customer.getBlacklistReason().trim())).append("\n");
        }
    }

    private String resolveDeliveryLabel(Order order) {
        return order.getDeliveryType() == DeliveryType.COURIER ? "Доставка курьером" : "Самовывоз";
    }

    private BigDecimal resolveLineTotal(OrderItem item) {
        if (item.getTotalPrice() != null) {
            return item.getTotalPrice();
        }
        BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
        int quantity = item.getQuantity() != null ? item.getQuantity() : 1;
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    private String formatPrice(BigDecimal value) {
        BigDecimal target = value != null ? value : BigDecimal.ZERO;
        String formatted = String.format(Locale.US, "%,.0f ₸", target.doubleValue());
        return formatted.replace(',', ' ');
    }

    private String formatOrderTime(LocalDateTime createdAt) {
        LocalDateTime target = createdAt != null ? createdAt : LocalDateTime.now(DEFAULT_TIME_ZONE);
        return ORDER_TIME_FORMAT.format(target);
    }

    private String orDash(String value) {
        if (value == null || value.isBlank()) {
            return "—";
        }
        return value.trim();
    }

    private String html(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
