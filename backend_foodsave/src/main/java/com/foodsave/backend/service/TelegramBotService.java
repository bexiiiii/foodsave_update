package com.foodsave.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramBotService {

    @Value("${telegram.bot.token:}")
    private String botToken;

    @Value("${telegram.manager.bot.token:}")
    private String managerBotToken;

    @Value("${telegram.miniapp.base-url:}")
    private String miniAppBaseUrl;

    private final RestTemplateBuilder restTemplateBuilder;

    private RestTemplate restTemplate;

    public record TelegramMessagePayload(String text, String imageUrl, String buttonText, String buttonUrl) {}

    private RestTemplate getRestTemplate() {
        if (restTemplate == null) {
            restTemplate = restTemplateBuilder
                    .setConnectTimeout(Duration.ofSeconds(10))
                    .setReadTimeout(Duration.ofSeconds(20))
                    .build();
        }
        return restTemplate;
    }

    public boolean sendMessage(Long chatId, TelegramMessagePayload message) {
        return sendMessageWithToken(botToken, chatId, message);
    }

    // Telegram has no idempotency key for sendMessage. Keep the inbox copy if delivery is uncertain.
    public boolean sendOfferOnce(Long chatId, TelegramMessagePayload message) {
        return sendMessageWithToken(botToken, chatId, message, true, 1);
    }

    public boolean sendManagerMessage(Long chatId, TelegramMessagePayload message) {
        return sendMessageWithToken(resolveManagerBotToken(), chatId, message);
    }

    public boolean sendMessageWithoutLinkPreview(Long chatId, TelegramMessagePayload message) {
        return sendMessageWithToken(botToken, chatId, message, true, 3);
    }

    public boolean sendMessageWithToken(String token, Long chatId, TelegramMessagePayload message) {
        return sendMessageWithToken(token, chatId, message, false, 3);
    }

    public enum DeliveryResult {
        SENT, BLOCKED, DEACTIVATED, CHAT_NOT_FOUND, FAILED;
        public boolean recipientUnavailable() {
            return this == BLOCKED || this == DEACTIVATED || this == CHAT_NOT_FOUND;
        }
    }

    public DeliveryResult sendMarketingMessage(Long chatId, TelegramMessagePayload message, boolean once) {
        return deliverMessage(botToken, chatId, message, once, once ? 1 : 3);
    }

    private boolean sendMessageWithToken(String token, Long chatId, TelegramMessagePayload message, boolean disableLinkPreview, int maxAttempts) {
        return deliverMessage(token, chatId, message, disableLinkPreview, maxAttempts) == DeliveryResult.SENT;
    }

    private DeliveryResult deliverMessage(String token, Long chatId, TelegramMessagePayload message,
                                         boolean disableLinkPreview, int maxAttempts) {
        if (token == null || token.isBlank()) {
            log.warn("Telegram bot token is not configured");
            return DeliveryResult.FAILED;
        }
        if (chatId == null) {
            log.warn("Cannot send Telegram message without chat id");
            return DeliveryResult.FAILED;
        }
        if (message == null || (message.text() == null && message.imageUrl() == null)) {
            log.warn("Telegram message payload is empty");
            return DeliveryResult.FAILED;
        }

        boolean hasImage = message.imageUrl() != null && !message.imageUrl().isBlank();
        String endpoint = hasImage ? "/sendPhoto" : "/sendMessage";
        String url = "https://api.telegram.org/bot" + token + endpoint;

        Map<String, Object> payload = new HashMap<>();
        payload.put("chat_id", chatId);
        payload.put("parse_mode", "HTML");

        if (hasImage) {
            payload.put("photo", message.imageUrl());
            payload.put("caption", message.text());
        } else {
            payload.put("text", message.text());
            if (disableLinkPreview) {
                payload.put("link_preview_options", Map.of("is_disabled", true));
            }
        }

        if (message.buttonText() != null && message.buttonUrl() != null) {
            Map<String, Object> button = new HashMap<>();
            button.put("text", message.buttonText());

            String buttonUrl = message.buttonUrl();
            String miniAppUrl = ensureHttps(miniAppBaseUrl);
            if (miniAppUrl != null && buttonUrl.startsWith(miniAppUrl)) {
                button.put("web_app", Map.of("url", buttonUrl));
            } else {
                button.put("url", buttonUrl);
            }

            Map<String, Object> replyMarkup = Map.of(
                    "inline_keyboard",
                    List.of(List.of(button))
            );
            payload.put("reply_markup", replyMarkup);
        }

        Exception lastError = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                ResponseEntity<String> response = getRestTemplate().postForEntity(url, payload, String.class);
                if (!response.getStatusCode().is2xxSuccessful()
                        || response.getBody() == null
                        || !response.getBody().contains("\"ok\":true")) {
                    throw new IllegalStateException("Telegram rejected request: " + response.getBody());
                }
                log.debug("Telegram {} status: {} chatId={} attempt={}",
                        endpoint, response.getStatusCode().value(), chatId, attempt);
                return DeliveryResult.SENT;
            } catch (Exception e) {
                lastError = e;
                DeliveryResult unavailable = recipientFailure(e);
                if (unavailable.recipientUnavailable()) {
                    log.info("Telegram recipient unavailable: {}", unavailable);
                    return unavailable;
                }
                if (isPermanentTelegramError(e)) {
                    break;
                }
                if (attempt < maxAttempts) {
                    log.warn("Telegram {} failed for chatId={} attempt={}, retrying",
                            endpoint, chatId, attempt, e);
                    sleepBeforeRetry(attempt);
                }
            }
        }

        log.error("Failed to send Telegram {} to chatId={} after retries", endpoint, chatId, lastError);
        return DeliveryResult.FAILED;
    }

    static DeliveryResult recipientFailure(Exception error) {
        if (!(error instanceof HttpClientErrorException http)) return DeliveryResult.FAILED;
        int code = http.getStatusCode().value();
        String description;
        try {
            description = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readTree(http.getResponseBodyAsString()).path("description").asText("");
        } catch (Exception malformed) {
            return DeliveryResult.FAILED;
        }
        if (code == 403 && description.equals("Forbidden: bot was blocked by the user")) return DeliveryResult.BLOCKED;
        if (code == 403 && description.equals("Forbidden: user is deactivated")) return DeliveryResult.DEACTIVATED;
        if (code == 400 && description.equals("Bad Request: chat not found")) return DeliveryResult.CHAT_NOT_FOUND;
        return DeliveryResult.FAILED;
    }

    private boolean isPermanentTelegramError(Exception error) {
        if (!(error instanceof HttpClientErrorException clientError)) {
            return false;
        }
        int status = clientError.getStatusCode().value();
        return status == 400 || status == 403;
    }

    private void sleepBeforeRetry(int attempt) {
        try {
            Thread.sleep(500L * attempt);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public boolean sendVideo(Long chatId, String videoUrl, String caption) {
        return sendVideo(chatId, videoUrl, caption, null, null);
    }

    public boolean sendVideo(Long chatId, String videoUrl, String caption, String buttonText, String buttonUrl) {
        if (botToken == null || botToken.isBlank()) {
            log.warn("Telegram bot token is not configured");
            return false;
        }
        if (chatId == null || videoUrl == null || videoUrl.isBlank()) {
            return false;
        }

        String url = "https://api.telegram.org/bot" + botToken + "/sendVideo";
        Map<String, Object> payload = new HashMap<>();
        payload.put("chat_id", chatId);
        payload.put("video", videoUrl);
        if (caption != null && !caption.isBlank()) {
            payload.put("caption", caption);
            payload.put("parse_mode", "HTML");
        }
        payload.put("supports_streaming", true);
        if (buttonText != null && !buttonText.isBlank() && buttonUrl != null && !buttonUrl.isBlank()) {
            payload.put("reply_markup", Map.of(
                    "inline_keyboard",
                    List.of(List.of(Map.of(
                            "text", buttonText,
                            "web_app", Map.of("url", ensureHttps(buttonUrl))
                    )))
            ));
        }

        return postWithRetry(url, payload, "sendVideo", chatId);
    }

    public void sendWebAppMessage(Long chatId, String text, String buttonText, String webAppUrl) {
        if (botToken == null || botToken.isBlank()) {
            log.warn("Telegram bot token is not configured");
            return;
        }
        if (chatId == null) {
            log.warn("Cannot send Telegram message without chat id");
            return;
        }
        if (text == null || text.isBlank()) {
            log.warn("Telegram message text is empty");
            return;
        }
        if (buttonText == null || buttonText.isBlank() || webAppUrl == null || webAppUrl.isBlank()) {
            log.warn("WebApp button requires non-empty text and url. buttonText={}, webAppUrl={}", buttonText, webAppUrl);
            return;
        }

        String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";

        Map<String, Object> payload = new HashMap<>();
        payload.put("chat_id", chatId);
        payload.put("text", text);
        payload.put("parse_mode", "HTML");

        Map<String, Object> button = new HashMap<>();
        button.put("text", buttonText);
        button.put("web_app", Map.of("url", webAppUrl));

        payload.put("reply_markup", Map.of(
                "inline_keyboard",
                List.of(List.of(button))
        ));

        log.info("Sending WebApp message to chatId={}, webAppUrl={}, payload={}", chatId, webAppUrl, payload);

        postWithRetry(url, payload, "sendWebAppMessage", chatId);
    }

    public boolean sendMessageWithKeyboard(Long chatId,
                                           String text,
                                           List<List<Map<String, Object>>> inlineKeyboard) {
        return sendMessageWithKeyboard(botToken, chatId, text, inlineKeyboard);
    }

    public boolean sendManagerMessageWithKeyboard(Long chatId,
                                                  String text,
                                                  List<List<Map<String, Object>>> inlineKeyboard) {
        return sendMessageWithKeyboard(resolveManagerBotToken(), chatId, text, inlineKeyboard);
    }

    public boolean answerCallbackQuery(String callbackQueryId, String text, boolean showAlert) {
        return answerCallbackQueryWithToken(botToken, callbackQueryId, text, showAlert);
    }

    private boolean answerCallbackQueryWithToken(String token,
                                                 String callbackQueryId,
                                                 String text,
                                                 boolean showAlert) {
        if (token == null || token.isBlank()) {
            log.warn("Telegram bot token is not configured");
            return false;
        }
        if (callbackQueryId == null || callbackQueryId.isBlank()) {
            log.warn("Cannot answer Telegram callback without callback query id");
            return false;
        }

        String url = "https://api.telegram.org/bot" + token + "/answerCallbackQuery";
        Map<String, Object> payload = new HashMap<>();
        payload.put("callback_query_id", callbackQueryId);
        payload.put("show_alert", showAlert);
        if (text != null && !text.isBlank()) {
            payload.put("text", text);
        }
        return postWithRetry(url, payload, "answerCallbackQuery", null);
    }

    private boolean sendMessageWithKeyboard(String token,
                                            Long chatId,
                                            String text,
                                            List<List<Map<String, Object>>> inlineKeyboard) {
        if (token == null || token.isBlank()) {
            log.warn("Telegram bot token is not configured");
            return false;
        }
        if (chatId == null) {
            log.warn("Cannot send Telegram message without chat id");
            return false;
        }
        if (text == null || text.isBlank()) {
            log.warn("Telegram message text is empty");
            return false;
        }

        String url = "https://api.telegram.org/bot" + token + "/sendMessage";
        Map<String, Object> payload = new HashMap<>();
        payload.put("chat_id", chatId);
        payload.put("text", text);
        payload.put("parse_mode", "HTML");

        if (inlineKeyboard != null && !inlineKeyboard.isEmpty()) {
            payload.put("reply_markup", Map.of("inline_keyboard", inlineKeyboard));
        }

        return postWithRetry(url, payload, "sendMessageWithKeyboard", chatId);
    }

    private boolean postWithRetry(String url, Map<String, Object> payload, String operation, Long chatId) {
        Exception lastError = null;
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                ResponseEntity<String> response = getRestTemplate().postForEntity(url, payload, String.class);
                if (!response.getStatusCode().is2xxSuccessful()
                        || response.getBody() == null
                        || !response.getBody().contains("\"ok\":true")) {
                    throw new IllegalStateException("Telegram rejected request: " + response.getBody());
                }
                return true;
            } catch (Exception e) {
                lastError = e;
                if (attempt < 3) sleepBeforeRetry(attempt);
            }
        }
        log.error("Telegram {} failed for chatId={} after retries", operation, chatId, lastError);
        return false;
    }

    private String resolveManagerBotToken() {
        if (managerBotToken != null && !managerBotToken.isBlank()) {
            return managerBotToken;
        }
        return botToken;
    }

    public String resolveButtonUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return null;
        }
        String trimmed = rawUrl.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        String base = ensureHttps(miniAppBaseUrl);
        if (base == null) {
            log.warn("Mini app base URL is not configured, returning raw button path");
            return trimmed.startsWith("/") ? trimmed : "/" + trimmed;
        }

        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        String path = trimmed.startsWith("/") ? trimmed : "/" + trimmed;
        return base + path;
    }

    private String ensureHttps(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String trimmed = url.trim();
        if (trimmed.startsWith("http://")) {
            return "https://" + trimmed.substring(7);
        }
        if (!trimmed.startsWith("https://")) {
            return "https://" + trimmed;
        }
        return trimmed;
    }
}
