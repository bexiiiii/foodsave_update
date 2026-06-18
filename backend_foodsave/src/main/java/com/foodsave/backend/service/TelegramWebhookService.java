package com.foodsave.backend.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodsave.backend.dto.telegram.TelegramCallbackQuery;
import com.foodsave.backend.dto.telegram.TelegramMessage;
import com.foodsave.backend.dto.telegram.TelegramUpdate;
import com.foodsave.backend.dto.telegram.TelegramUser;
import com.foodsave.backend.dto.telegram.TelegramWebAppData;
import com.foodsave.backend.entity.Order;
import com.foodsave.backend.entity.OrderItem;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.PaymentMethod;
import com.foodsave.backend.domain.enums.PaymentStatus;
import com.foodsave.backend.repository.OrderRepository;
import com.foodsave.backend.exception.InsufficientStockException;
import com.foodsave.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookService {

    private final TelegramBotService telegramBotService;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ProductService productService;
    private final TelegramOrderNotificationService telegramOrderNotificationService;
    // Note: TelegramStoreManagerBotService is for a separate manager bot (token: 8489367964)

    @Value("${telegram.miniapp.base-url:https://miniapp.foodsave.kz}")
    private String miniAppBaseUrl;

    @Value("${telegram.support.username:@FoodSave_kz}")
    private String supportUsername;

    @Value("${telegram.welcome.video-url:}")
    private String welcomeVideoUrl;

    private static final DateTimeFormatter RESERVATION_TIME_FORMAT =
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm", new Locale("ru"));
    private static final ZoneId DEFAULT_TIME_ZONE = ZoneId.of("Asia/Almaty");

    public void handleUpdate(TelegramUpdate update) {
        log.info("=== TELEGRAM WEBHOOK UPDATE RECEIVED ===");
        
        if (update == null) {
            log.warn("Update is null!");
            return;
        }

        log.info("Update details: message={}, callbackQuery={}", 
            update.message() != null, 
            update.callbackQuery() != null);

        if (update.message() != null) {
            TelegramMessage msg = update.message();
            log.info("Message: messageId={}, chatId={}, text='{}', from={}", 
                msg.messageId(),
                msg.chat() != null ? msg.chat().id() : null,
                msg.text(),
                msg.from() != null ? msg.from().id() : null);
        }

        log.info("Received Telegram update: messageId={}, hasCallback={}, hasWebAppData={}",
                update.message() != null ? update.message().messageId() : null,
                update.callbackQuery() != null,
                (update.message() != null && update.message().webAppData() != null)
                        || (update.callbackQuery() != null && update.callbackQuery().webAppData() != null));

        TelegramMessage message = resolveMessage(update);
        TelegramUser from = resolveUser(update);
        Long chatId = resolveChatId(message);

        log.info("Resolved: chatId={}, from={}, hasMessage={}", chatId, from != null ? from.id() : null, message != null);

        if (chatId == null) {
            log.warn("Received Telegram update without chat id: {}", update);
            return;
        }

        if (handleWebAppData(update, message, from, chatId)) {
            log.info("WebAppData handled");
            return;
        }

        // Handle text messages (including /start and /help)
        if (message != null && message.text() != null) {
            log.info("Handling text message: '{}'", message.text());
            handleTextMessage(message.text(), chatId, from);
        } else {
            log.info("No text message to handle");
        }
    }

    private TelegramMessage resolveMessage(TelegramUpdate update) {
        if (update.message() != null) {
            return update.message();
        }
        TelegramCallbackQuery callbackQuery = update.callbackQuery();
        if (callbackQuery != null) {
            return callbackQuery.message();
        }
        return null;
    }

    private TelegramUser resolveUser(TelegramUpdate update) {
        if (update.message() != null && update.message().from() != null) {
            return update.message().from();
        }
        TelegramCallbackQuery callbackQuery = update.callbackQuery();
        if (callbackQuery != null) {
            if (callbackQuery.webAppData() != null && callbackQuery.from() != null) {
                return callbackQuery.from();
            }
            TelegramMessage message = callbackQuery.message();
            if (message != null) {
                return message.from();
            }
        }
        return null;
    }

    private Long resolveChatId(TelegramMessage message) {
        if (message != null && message.chat() != null) {
            return message.chat().id();
        }
        return null;
    }

    private boolean handleWebAppData(TelegramUpdate update,
                                      TelegramMessage message,
                                      TelegramUser from,
                                      Long chatId) {
        TelegramWebAppData webAppData = null;
        if (message != null && message.webAppData() != null) {
            webAppData = message.webAppData();
        } else if (update.callbackQuery() != null) {
            webAppData = update.callbackQuery().webAppData();
        }

        if (webAppData == null || webAppData.data() == null || webAppData.data().isBlank()) {
            return false;
        }

        try {
            ReservationPayload payload = objectMapper.readValue(webAppData.data(), ReservationPayload.class);
            log.info("Processing web_app_data reservation for chat {}: action={}, productId={}, quantity={}",
                    chatId, payload.action(), payload.productId(), payload.quantity());
            respondToReservation(chatId, from, payload);
        } catch (Exception e) {
            log.error("Failed to parse web_app_data: {}", webAppData.data(), e);
            telegramBotService.sendMessage(chatId, new TelegramBotService.TelegramMessagePayload(
                    "Не удалось обработать бронирование. Пожалуйста, попробуйте ещё раз.",
                    null,
                    null,
                    null
            ));
        }
        return true;
    }

    private void handleTextMessage(String text, Long chatId, TelegramUser from) {
        String trimmed = text.trim();
        if (trimmed.isEmpty()) {
            return;
        }

        String command = trimmed.split("\\s+")[0];

        log.info("Handling text command '{}' from chat {} (user={})", command, chatId,
                from != null ? from.id() : null);

        if (isCommand(command, "start")) {
            sendWelcomeMessage(chatId);
            return;
        }

        if (isCommand(command, "help")) {
            sendSupportMessage(chatId);
            return;
        }

        // Fallback for any other text input
        String fallbackText = String.join("\n",
                "Не удалось распознать команду.",
                "Доступные команды:",
                "• /start — открыть мини‑приложение",
                "• /help — помощь и поддержка");

        telegramBotService.sendWebAppMessage(
                chatId,
                fallbackText,
                "Открыть FoodSave",
                ensureHttps(miniAppBaseUrl)
        );
    }

    private void sendWelcomeMessage(Long chatId) {
        String supportHandle = normalizeSupportUsername(supportUsername);
        String welcomeText = String.join("\n",
                "Привет! Я бот FoodSave 👋",
                "Помогу открыть мини‑приложение и быстро оформить бронь.",
                "",
                "Доступные команды:",
                "• /start — открыть мини‑приложение",
                "• /help — помощь и контакты поддержки",
                "",
                "Поддержка: " + supportHandle);

        String webAppUrl = ensureHttps(miniAppBaseUrl);
        log.info("Sending welcome message to chatId={}, webAppUrl={}", chatId, webAppUrl);

        if (welcomeVideoUrl != null && !welcomeVideoUrl.isBlank()) {
            telegramBotService.sendVideo(chatId, welcomeVideoUrl,
                    "Короткая инструкция: как пользоваться FoodSave");
        }

        telegramBotService.sendWebAppMessage(chatId, welcomeText, "Открыть FoodSave", webAppUrl);
    }

    private void sendSupportMessage(Long chatId) {
        String supportHandle = normalizeSupportUsername(supportUsername);
        String webAppUrl = ensureHttps(miniAppBaseUrl);
        String supportText = String.join("\n",
                "Помощь FoodSave",
                "",
                "1) Нажмите кнопку ниже, чтобы открыть мини‑приложение.",
                "2) Выберите бокс и нажмите «Забронировать».",
                "3) Подтверждение заказа придёт в этот чат.",
                "",
                "Поддержка: " + supportHandle,
                "",
                "Чтобы заново открыть мини‑приложение, используйте /start.");

        telegramBotService.sendWebAppMessage(chatId, supportText, "Открыть FoodSave", webAppUrl);
    }

    private boolean isCommand(String commandToken, String expectedCommand) {
        if (commandToken == null || commandToken.isBlank() || expectedCommand == null || expectedCommand.isBlank()) {
            return false;
        }

        String token = commandToken.trim();
        if (!token.startsWith("/")) {
            return false;
        }

        String withoutSlash = token.substring(1);
        int botMentionIndex = withoutSlash.indexOf('@');
        String normalizedCommand = botMentionIndex >= 0
                ? withoutSlash.substring(0, botMentionIndex)
                : withoutSlash;

        return normalizedCommand.equalsIgnoreCase(expectedCommand);
    }

    private String normalizeSupportUsername(String rawUsername) {
        if (rawUsername == null || rawUsername.isBlank()) {
            return "@FoodSave_kz";
        }

        String trimmed = rawUsername.trim();
        if (trimmed.startsWith("@")) {
            return trimmed;
        }

        return "@" + trimmed;
    }

    private void respondToReservation(Long chatId, TelegramUser from, ReservationPayload payload) {
        ReservationResult reservationResult = createReservationOrder(from, payload);
        if (!reservationResult.success()) {
            telegramBotService.sendMessage(chatId, new TelegramBotService.TelegramMessagePayload(
                    reservationResult.errorMessage(),
                    null,
                    null,
                    null
            ));
            return;
        }

        Order order = reservationResult.order();
        String reserverName = from != null ? from.displayName() : "вас";
        String formattedTotal = formatPrice(order.getTotal().doubleValue());
        String formattedUnit = formatPrice(order.getItems().get(0).getUnitPrice().doubleValue());
        String formattedTime = formatTimestamp(payload.timestamp());

        Product product = reservationResult.product();
        Store store = product.getStore();

        StringBuilder messageBuilder = new StringBuilder();
        messageBuilder.append("🧾 Заказ №").append(order.getOrderNumber()).append("\n");
        messageBuilder.append("Бокс: ").append(orUnknown(product.getName())).append("\n");
        messageBuilder.append("Заведение: ").append(orUnknown(store.getName())).append("\n");
        if (store.getAddress() != null && !store.getAddress().isBlank()) {
            messageBuilder.append("Адрес: ").append(store.getAddress()).append("\n");
        }
        messageBuilder.append("Количество: ").append(order.getItems().get(0).getQuantity()).append(" шт.").append("\n");
        messageBuilder.append("Цена за шт.: ").append(formattedUnit).append("\n");
        messageBuilder.append("Сумма: ").append(formattedTotal).append("\n");
      

        if (formattedTime != null) {
            messageBuilder.append("\nВремя бронирования: ").append(formattedTime);
        }

        messageBuilder.append("\n\nЗаказ закреплён за ").append(reserverName).append(".  Если появятся вопросы — используйте команду /help.");

        telegramBotService.sendMessage(chatId, new TelegramBotService.TelegramMessagePayload(
                messageBuilder.toString(),
                null,
                null,
                null
        ));

        User user = order.getUser();
        try {
            telegramOrderNotificationService.notifyNewOrder(order);
        } catch (Exception e) {
            log.error("Failed to send configured Telegram order notification for order {}",
                    order.getOrderNumber(), e);
        }

        log.info("Reservation confirmation sent for order {} (telegram user={}, chat={})",
                order.getOrderNumber(), user != null ? user.getId() : null, chatId);
    }

    private String formatPrice(double value) {
        return String.format(Locale.US, "%,.0f ₸", value).replace(',', ' ');
    }

    private String formatTimestamp(String timestamp) {
        if (timestamp == null || timestamp.isBlank()) {
            return null;
        }
        try {
            Instant instant = Instant.parse(timestamp);
            return RESERVATION_TIME_FORMAT.format(instant.atZone(DEFAULT_TIME_ZONE));
        } catch (DateTimeParseException ignored) {
            try {
                OffsetDateTime offsetDateTime = OffsetDateTime.parse(timestamp);
                return RESERVATION_TIME_FORMAT.format(offsetDateTime.atZoneSameInstant(DEFAULT_TIME_ZONE));
            } catch (DateTimeParseException ignoredOffset) {
                try {
                    LocalDateTime localDateTime = LocalDateTime.parse(timestamp);
                    return RESERVATION_TIME_FORMAT.format(localDateTime.atZone(DEFAULT_TIME_ZONE));
                } catch (DateTimeParseException ex) {
                    log.debug("Unable to parse reservation timestamp: {}", timestamp, ex);
                    return null;
                }
            }
        }
    }

    private String ensureHttps(String url) {
        if (url == null || url.isBlank()) {
            return "https://miniapp.foodsave.kz";
        }
        if (url.startsWith("http://")) {
            return "https://" + url.substring(7);
        }
        return url;
    }

    private String generateOrderNumber() {
        int random = ThreadLocalRandom.current().nextInt(0, 1_000_000);
        return String.format("%06d", random);
    }

    private String orUnknown(String value) {
        if (value == null || value.isBlank()) {
            return "не указано";
        }
        return value;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ReservationPayload(
            String action,
            Long productId,
            String productName,
            String storeName,
            int quantity,
            double unitPrice,
            double totalPrice,
            String timestamp,
            String message
    ) {
    }

    private record ReservationResult(boolean success, Order order, Product product, String errorMessage) {
    }

    private ReservationResult createReservationOrder(TelegramUser from, ReservationPayload payload) {
        if (payload.productId() == null) {
            return new ReservationResult(false, null, null, "Не удалось определить продукт для бронирования. Пожалуйста, обновите мини‑приложение и попробуйте снова.");
        }

        int requestedQuantity = Math.max(payload.quantity(), 1);

        User user = null;
        if (from != null && from.id() != null) {
            user = userRepository.findByTelegramUserId(from.id()).orElse(null);
        }

        if (user == null) {
            log.warn("Reservation attempted without linked user. telegramId={} payload={}" ,
                    from != null ? from.id() : null, payload);
            return new ReservationResult(false, null, null, "Не удалось найти ваш профиль. Откройте мини‑приложение FoodSave ещё раз через кнопку бота и повторите попытку.");
        }

        Product product;
        try {
            product = productService.reserveProductStock(payload.productId(), requestedQuantity);
        } catch (EntityNotFoundException ex) {
            log.warn("Reservation failed: product {} not found", payload.productId());
            return new ReservationResult(false, null, null, "Выбранный продукт больше не доступен. Попробуйте выбрать другую коробку.");
        } catch (InsufficientStockException ex) {
            log.warn("Reservation failed: insufficient stock for product {} (requested={} telegramId={})",
                    payload.productId(), requestedQuantity, from != null ? from.id() : null);
            return new ReservationResult(false, null, null, "Упс! боксы уже закончились. Выберите, пожалуйста, другую позицию.");
        } catch (IllegalArgumentException ex) {
            log.warn("Reservation failed: invalid quantity {} for product {}", requestedQuantity, payload.productId(), ex);
            return new ReservationResult(false, null, null, "Количество для бронирования указано неверно. Попробуйте ещё раз.");
        }

        Order order = new Order();
        order.setUser(user);
        order.setStore(product.getStore());
        order.setOrderNumber(generateUniqueOrderNumber());
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setPaymentMethod(PaymentMethod.CASH);
        order.setContactPhone(orFallbackPhone(user.getPhone()));
        order.setDeliveryAddress(product.getStore() != null ? product.getStore().getAddress() : null);
        order.setDeliveryNotes(payload.message() != null ? payload.message() : "Telegram бронирование");

        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setProduct(product);
        item.setQuantity(requestedQuantity);

        BigDecimal unitPrice = payload.unitPrice() > 0
                ? BigDecimal.valueOf(payload.unitPrice())
                : (product.getPrice() != null ? product.getPrice() : BigDecimal.ZERO);

        item.setUnitPrice(unitPrice);
        item.calculateTotalPrice();

        order.addItem(item);
        order.calculateTotals();

        Order savedOrder = orderRepository.save(order);

        log.info("Order {} successfully saved for telegram user {} (product {} store {})",
                savedOrder.getOrderNumber(), user.getId(), product.getId(),
                product.getStore() != null ? product.getStore().getId() : null);

        return new ReservationResult(true, savedOrder, product, null);
    }

    private String generateUniqueOrderNumber() {
        String orderNumber;
        do {
            orderNumber = generateOrderNumber();
        } while (orderRepository.existsByOrderNumber(orderNumber));
        return orderNumber;
    }

    private String orFallbackPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return "+7 000 000 0000";
        }
        return phone;
    }
}
