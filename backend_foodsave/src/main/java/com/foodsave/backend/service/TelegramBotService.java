package com.foodsave.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

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

    public boolean sendManagerMessage(Long chatId, TelegramMessagePayload message) {
        return sendMessageWithToken(resolveManagerBotToken(), chatId, message);
    }

    public boolean sendMessageWithToken(String token, Long chatId, TelegramMessagePayload message) {
        if (token == null || token.isBlank()) {
            log.warn("Telegram bot token is not configured");
            return false;
        }
        if (chatId == null) {
            log.warn("Cannot send Telegram message without chat id");
            return false;
        }
        if (message == null || (message.text() == null && message.imageUrl() == null)) {
            log.warn("Telegram message payload is empty");
            return false;
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
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                ResponseEntity<String> response = getRestTemplate().postForEntity(url, payload, String.class);
                log.debug("Telegram {} status: {} chatId={} attempt={}",
                        endpoint, response.getStatusCode().value(), chatId, attempt);
                return true;
            } catch (Exception e) {
                lastError = e;
                if (attempt < 3) {
                    log.warn("Telegram {} failed for chatId={} attempt={}, retrying",
                            endpoint, chatId, attempt, e);
                    sleepBeforeRetry(attempt);
                }
            }
        }

        log.error("Failed to send Telegram {} to chatId={} after retries", endpoint, chatId, lastError);
        return false;
    }

    private void sleepBeforeRetry(int attempt) {
        try {
            Thread.sleep(500L * attempt);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public void sendVideo(Long chatId, String videoUrl, String caption) {
        if (botToken == null || botToken.isBlank()) {
            log.warn("Telegram bot token is not configured");
            return;
        }
        if (chatId == null || videoUrl == null || videoUrl.isBlank()) {
            return;
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

        try {
            ResponseEntity<String> response = getRestTemplate().postForEntity(url, payload, String.class);
            log.info("Telegram sendVideo status: {}", response.getStatusCode().value());
        } catch (Exception e) {
            log.error("Failed to send Telegram video to chatId={}, videoUrl={}", chatId, videoUrl, e);
        }
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

        try {
            ResponseEntity<String> response = getRestTemplate().postForEntity(url, payload, String.class);
            log.info("Telegram sendWebAppMessage status: {}, response: {}", response.getStatusCode().value(), response.getBody());
        } catch (Exception e) {
            log.error("Failed to send Telegram web app message", e);
        }
    }

    public void sendMessageWithKeyboard(Long chatId,
                                        String text,
                                        List<List<Map<String, Object>>> inlineKeyboard) {
        sendMessageWithKeyboard(botToken, chatId, text, inlineKeyboard);
    }

    public void sendManagerMessageWithKeyboard(Long chatId,
                                               String text,
                                               List<List<Map<String, Object>>> inlineKeyboard) {
        sendMessageWithKeyboard(resolveManagerBotToken(), chatId, text, inlineKeyboard);
    }

    private void sendMessageWithKeyboard(String token,
                                         Long chatId,
                                         String text,
                                         List<List<Map<String, Object>>> inlineKeyboard) {
        if (token == null || token.isBlank()) {
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

        String url = "https://api.telegram.org/bot" + token + "/sendMessage";
        Map<String, Object> payload = new HashMap<>();
        payload.put("chat_id", chatId);
        payload.put("text", text);
        payload.put("parse_mode", "HTML");

        if (inlineKeyboard != null && !inlineKeyboard.isEmpty()) {
            payload.put("reply_markup", Map.of("inline_keyboard", inlineKeyboard));
        }

        try {
            ResponseEntity<String> response = getRestTemplate().postForEntity(url, payload, String.class);
            log.debug("Telegram sendMessageWithKeyboard status: {}", response.getStatusCode().value());
        } catch (Exception e) {
            log.error("Failed to send Telegram message with keyboard", e);
        }
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
