package com.foodsave.backend.service;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
class TelegramDeliveryFailureTest {
    TelegramBotService.DeliveryResult classify(HttpStatus status, String description) {
        var error = HttpClientErrorException.create(status, "Telegram rejection", null,
                ("{\"description\":\"" + description + "\"}").getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
        return TelegramBotService.recipientFailure(error);
    }
    @Test void identifiesExactlyTheThreeRecipientFailures() {
        assertEquals(TelegramBotService.DeliveryResult.BLOCKED, classify(HttpStatus.FORBIDDEN,"Forbidden: bot was blocked by the user"));
        assertEquals(TelegramBotService.DeliveryResult.DEACTIVATED, classify(HttpStatus.FORBIDDEN,"Forbidden: user is deactivated"));
        assertEquals(TelegramBotService.DeliveryResult.CHAT_NOT_FOUND, classify(HttpStatus.BAD_REQUEST,"Bad Request: chat not found"));
    }
    @Test void requestAndRateLimitErrorsDoNotExcludeCustomers() {
        for (var code : new HttpStatus[]{HttpStatus.BAD_REQUEST,HttpStatus.FORBIDDEN,HttpStatus.TOO_MANY_REQUESTS}) {
            assertEquals(TelegramBotService.DeliveryResult.FAILED,classify(code,"Bad Request: can't parse entities"));
        }
        assertEquals(TelegramBotService.DeliveryResult.FAILED,TelegramBotService.recipientFailure(new RuntimeException("timeout")));
    }
}
