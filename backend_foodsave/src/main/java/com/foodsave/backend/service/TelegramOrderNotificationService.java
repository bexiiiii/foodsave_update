package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.DeliveryType;
import com.foodsave.backend.entity.Order;
import com.foodsave.backend.entity.OrderItem;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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

    @Value("${telegram.order-notifications.chat-ids:}")
    private String recipientChatIds;

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
