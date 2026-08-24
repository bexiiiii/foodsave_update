package com.foodsave.backend.controller;

import com.foodsave.backend.dto.telegram.TelegramUpdate;
import com.foodsave.backend.service.TelegramWebhookService;
import com.foodsave.backend.service.TelegramStoreManagerBotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/api/telegram")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookController {

    private final TelegramWebhookService telegramWebhookService;
    private final TelegramStoreManagerBotService telegramStoreManagerBotService;

    @Value("${telegram.webhook.secret:}")
    private String clientWebhookSecret;

    @Value("${telegram.manager.webhook.secret:}")
    private String managerWebhookSecret;

    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(
            @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secret,
            @RequestBody TelegramUpdate update) {
        if (!validSecret(clientWebhookSecret, secret)) {
            log.warn("Rejected client bot webhook with invalid secret");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long chatId = extractChatId(update);
        Long userId = extractUserId(update);
        log.info("Client bot webhook received: chatId={}, userId={}", chatId, userId);
        telegramWebhookService.handleUpdate(update);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/webhook/manager")
    public ResponseEntity<Void> handleManagerWebhook(
            @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secret,
            @RequestBody TelegramUpdate update) {
        if (!validSecret(managerWebhookSecret, secret)) {
            log.warn("Rejected manager bot webhook with invalid secret");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long chatId = extractChatId(update);
        Long userId = extractUserId(update);
        log.info("Manager bot webhook received: chatId={}, userId={}", chatId, userId);
        
        if (update == null) {
            log.warn("Received null update");
            return ResponseEntity.ok().build();
        }
        
        log.info("Manager bot update: message={}, callback={}",
            update.message() != null,
            update.callbackQuery() != null);
        
        com.foodsave.backend.dto.telegram.TelegramMessage message = resolveMessage(update);
        com.foodsave.backend.dto.telegram.TelegramUser from = resolveUser(update);
        Long managerChatId = resolveChatId(message);
        
        if (managerChatId == null) {
            log.warn("No chatId in manager bot update");
            return ResponseEntity.ok().build();
        }
        
        telegramStoreManagerBotService.handleUpdate(update, message, from, managerChatId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/webhook")
    public ResponseEntity<String> webhookHealthcheck() {
        return ResponseEntity.ok("Telegram webhook endpoint is ready");
    }
    
    @GetMapping("/webhook/manager")
    public ResponseEntity<String> managerWebhookHealthcheck() {
        return ResponseEntity.ok("Telegram manager webhook endpoint is ready");
    }
    
    private com.foodsave.backend.dto.telegram.TelegramMessage resolveMessage(TelegramUpdate update) {
        if (update.message() != null) {
            return update.message();
        }
        com.foodsave.backend.dto.telegram.TelegramCallbackQuery callbackQuery = update.callbackQuery();
        if (callbackQuery != null) {
            return callbackQuery.message();
        }
        return null;
    }

    private com.foodsave.backend.dto.telegram.TelegramUser resolveUser(TelegramUpdate update) {
        if (update.message() != null && update.message().from() != null) {
            return update.message().from();
        }
        com.foodsave.backend.dto.telegram.TelegramCallbackQuery callbackQuery = update.callbackQuery();
        if (callbackQuery != null) {
            if (callbackQuery.webAppData() != null && callbackQuery.from() != null) {
                return callbackQuery.from();
            }
            com.foodsave.backend.dto.telegram.TelegramMessage message = callbackQuery.message();
            if (message != null) {
                return message.from();
            }
        }
        return null;
    }

    private Long resolveChatId(com.foodsave.backend.dto.telegram.TelegramMessage message) {
        if (message != null && message.chat() != null) {
            return message.chat().id();
        }
        return null;
    }
    
    private Long extractChatId(TelegramUpdate update) {
        if (update == null) return null;
        if (update.message() != null && update.message().chat() != null) {
            return update.message().chat().id();
        }
        if (update.callbackQuery() != null && update.callbackQuery().message() != null 
            && update.callbackQuery().message().chat() != null) {
            return update.callbackQuery().message().chat().id();
        }
        return null;
    }
    
    private Long extractUserId(TelegramUpdate update) {
        if (update == null) return null;
        if (update.message() != null && update.message().from() != null) {
            return update.message().from().id();
        }
        if (update.callbackQuery() != null && update.callbackQuery().from() != null) {
            return update.callbackQuery().from().id();
        }
        return null;
    }
    
    private String extractText(TelegramUpdate update) {
        if (update == null) return null;
        if (update.message() != null && update.message().text() != null) {
            return update.message().text();
        }
        if (update.callbackQuery() != null && update.callbackQuery().data() != null) {
            return "callback: " + update.callbackQuery().data();
        }
        return null;
    }

    private boolean validSecret(String expected, String actual) {
        if (!StringUtils.hasText(expected) || !StringUtils.hasText(actual)) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }
}
