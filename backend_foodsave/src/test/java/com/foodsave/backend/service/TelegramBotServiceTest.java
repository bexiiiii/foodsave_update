package com.foodsave.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.net.SocketTimeoutException;
import java.util.List;
import java.util.Map;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TelegramBotServiceTest {

    private final RestTemplate restTemplate = mock(RestTemplate.class);
    private TelegramBotService service;
    private final TelegramBotService.TelegramMessagePayload payload =
            new TelegramBotService.TelegramMessagePayload("hello", null, null, null);

    @BeforeEach
    void setUp() {
        service = spy(new TelegramBotService(mock(RestTemplateBuilder.class)));
        ReflectionTestUtils.setField(service, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(service, "botToken", "test-token");
        doNothing().when(service).sleepBeforeRetry(org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void returnsSuccessOnFirstAttempt() {
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"ok\":true}"));

        var result = service.sendMessageDetailed(123L, payload);

        assertTrue(result.sent());
        assertEquals(1, result.attempts());
    }

    @Test
    void categorizesAuthFailureWithoutRetry() {
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.FORBIDDEN));

        var result = service.sendMessageDetailed(123L, payload);

        assertEquals(TelegramBotService.TelegramFailureCategory.FORBIDDEN, result.failureCategory());
        assertEquals(1, result.attempts());
        verify(restTemplate, times(1)).postForEntity(anyString(), any(), eq(String.class));
    }

    @Test
    void retriesExplicitRateLimitAndReportsAttemptCount() {
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.TOO_MANY_REQUESTS))
                .thenThrow(new HttpClientErrorException(HttpStatus.TOO_MANY_REQUESTS))
                .thenReturn(ResponseEntity.ok("{\"ok\":true}"));

        var result = service.sendMessageDetailed(123L, payload);

        assertTrue(result.sent());
        assertEquals(3, result.attempts());
        verify(restTemplate, times(3)).postForEntity(anyString(), any(), eq(String.class));
    }

    @Test
    void doesNotRetryServerErrorBecauseDeliveryMayBeAmbiguous() {
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenThrow(new HttpServerErrorException(HttpStatus.BAD_GATEWAY));

        var result = service.sendMessageDetailed(123L, payload);

        assertEquals(TelegramBotService.TelegramFailureCategory.SERVER_ERROR, result.failureCategory());
        assertEquals(1, result.attempts());
        verify(restTemplate, times(1)).postForEntity(anyString(), any(), eq(String.class));
    }

    @Test
    void doesNotRetryTimeoutBecauseTelegramMayHaveAcceptedTheMessage() {
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenThrow(new ResourceAccessException("timeout", new SocketTimeoutException()));

        var result = service.sendMessageDetailed(123L, payload);

        assertEquals(TelegramBotService.TelegramFailureCategory.TIMEOUT, result.failureCategory());
        assertEquals(1, result.attempts());
        verify(restTemplate, times(1)).postForEntity(anyString(), any(), eq(String.class));
    }

    @Test
    void validatesInputWithoutCallingTelegram() {
        var result = service.sendMessageDetailed(null, payload);

        assertEquals(TelegramBotService.TelegramFailureCategory.INVALID_RECIPIENT, result.failureCategory());
        assertEquals(0, result.attempts());
        verify(restTemplate, times(0)).postForEntity(anyString(), any(), eq(String.class));
    }

    @Test
    void keyboardSendReturnsConfirmedDeliveryResult() {
        var keyboard = List.of(List.<Map<String, Object>>of(Map.of("text", "Picked up", "callback_data", "order:pickup:1")));
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"ok\":true}"));

        assertTrue(service.sendMessageWithKeyboard(123L, "Reminder", keyboard));
        verify(restTemplate).postForEntity(eq("https://api.telegram.org/bottest-token/sendMessage"),
                eq(Map.of("chat_id", 123L, "text", "Reminder", "parse_mode", "HTML",
                        "reply_markup", Map.of("inline_keyboard", keyboard))), eq(String.class));
    }

    @Test
    void keyboardSendReturnsFalseForAmbiguousFailureWithoutRetry() {
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenThrow(new ResourceAccessException("timeout", new SocketTimeoutException()));

        assertFalse(service.sendMessageWithKeyboard(123L, "Reminder", List.of()));
        verify(restTemplate, times(1)).postForEntity(anyString(), any(), eq(String.class));
    }

    @Test
    void invalidKeyboardInputDoesNotSend() {
        assertFalse(service.sendMessageWithKeyboard(null, "Reminder", List.of()));
        assertFalse(service.sendMessageWithKeyboard(123L, " ", List.of()));
        ReflectionTestUtils.setField(service, "botToken", "");
        assertFalse(service.sendMessageWithKeyboard(123L, "Reminder", List.of()));
        verify(restTemplate, times(0)).postForEntity(anyString(), any(), eq(String.class));
    }

    @Test
    void callbackAcknowledgementUsesCustomerBotAndCallbackIdentifier() {
        ReflectionTestUtils.setField(service, "managerBotToken", "manager-test-token");
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"ok\":true}"));

        assertTrue(service.answerCallbackQuery("callback-123", "Done", true));
        verify(restTemplate).postForEntity(eq("https://api.telegram.org/bottest-token/answerCallbackQuery"),
                eq(Map.of("callback_query_id", "callback-123", "text", "Done", "show_alert", true)),
                eq(String.class));
    }

    @Test
    void callbackAcknowledgementCanOmitTextAndReportsRejection() {
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"ok\":false}"));

        assertFalse(service.answerCallbackQuery("callback-123", null, false));
        verify(restTemplate).postForEntity(anyString(),
                eq(Map.of("callback_query_id", "callback-123", "show_alert", false)), eq(String.class));
    }

    @Test
    void invalidCallbackInputDoesNotSend() {
        assertFalse(service.answerCallbackQuery(null, "Done", false));
        assertFalse(service.answerCallbackQuery(" ", "Done", false));
        ReflectionTestUtils.setField(service, "botToken", "");
        assertFalse(service.answerCallbackQuery("callback-123", "Done", false));
        verify(restTemplate, times(0)).postForEntity(anyString(), any(), eq(String.class));
    }


    @Test
    void singleAttemptDeliveryDoesNotRetryEvenExplicitRateLimits() {
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.TOO_MANY_REQUESTS));

        var result = service.sendMessageOnceDetailed(123L, payload);

        assertFalse(result.sent());
        assertEquals(TelegramBotService.TelegramFailureCategory.RATE_LIMITED, result.failureCategory());
        assertEquals(1, result.attempts());
        verify(restTemplate, times(1)).postForEntity(anyString(), any(), eq(String.class));
        verify(service, times(0)).sleepBeforeRetry(org.mockito.ArgumentMatchers.anyInt());
    }

}
