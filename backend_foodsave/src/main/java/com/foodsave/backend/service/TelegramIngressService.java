package com.foodsave.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodsave.backend.dto.telegram.TelegramUpdate;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class TelegramIngressService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final TelegramWebhookService webhook;

    // Set once from the last archived pending update before connecting Telegram.
    // Missing configuration holds all events for review, including after a restart.
    @Value("${telegram.ingress.accept-after-update-id:-1}")
    private long acceptAfterUpdateId;

    @Value("${telegram.ingress.test-chat-id:0}")
    private long testChatId;

    @Value("${telegram.ingress.test-started-at:0}")
    private long testStartedAt;

    @Value("${telegram.ingress.walk-only:false}")
    private boolean walkOnly;

    @Value("${telegram.ingress.walk-started-at:0}")
    private long walkStartedAt;


    private boolean outsideWalkAccess(JsonNode payload) {
        if (testChatId <= 0 && !walkOnly) return false;
        JsonNode message = payload.has("edited_message") ? payload.path("edited_message") : payload.path("message");
        if (payload.has("callback_query") || message.has("web_app_data")
                || !"private".equals(message.path("chat").path("type").asText())
                || message.path("chat").path("id").asLong(0) <= 0
                || message.path("from").path("id").asLong(0) != message.path("chat").path("id").asLong(0)
                || testChatId > 0 && message.path("chat").path("id").asLong(0) != testChatId) return true;
        long date = message.path("date").asLong(0);
        long startedAt = testChatId > 0 ? testStartedAt : walkStartedAt;
        if (startedAt <= 0 || date < startedAt) return true;
        String text = message.path("text").asText("").trim();
        return !(message.path("location").isObject()
                || !payload.has("edited_message") && text.matches("/start walk_(ru|kk|en)"));
    }


    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void receive(JsonNode payload) {
        JsonNode id = payload == null ? null : payload.get("update_id");
        if (id == null || !id.isIntegralNumber() || !id.canConvertToLong() || id.longValue() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Telegram update id");
        }
        long updateId = id.longValue();
        boolean hold = acceptAfterUpdateId < 0 || updateId <= acceptAfterUpdateId || outsideWalkAccess(payload);
        // This insert must commit before any external effect. A processing event is
        // never automatically retried because the previous attempt may have succeeded.
        int inserted = jdbc.update("""
                INSERT INTO telegram_inbound_events(update_id, payload, status)
                VALUES (?, ?, ?) ON CONFLICT (update_id) DO NOTHING
                """, updateId, payload.toString(), hold ? "QUARANTINED" : "PROCESSING");
        if (inserted == 0 || hold) return;
        try {
            TelegramUpdate update = mapper.treeToValue(payload, TelegramUpdate.class);
            webhook.handleUpdate(update);
        } catch (Exception exception) {
            // Keep the original event without replaying a possibly committed order.
            jdbc.update("""
                    UPDATE telegram_inbound_events SET status='NEEDS_REVIEW', finished_at=CURRENT_TIMESTAMP
                    WHERE update_id=? AND status='PROCESSING'
                    """, updateId);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Telegram event requires review");
        }
        jdbc.update("""
                UPDATE telegram_inbound_events SET status='DONE', finished_at=CURRENT_TIMESTAMP
                WHERE update_id=? AND status='PROCESSING'
                """, updateId);
    }
}
