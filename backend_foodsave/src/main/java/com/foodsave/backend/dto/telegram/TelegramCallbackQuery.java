package com.foodsave.backend.dto.telegram;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelegramCallbackQuery(
        String id,
        TelegramUser from,
        TelegramMessage message,
        String data,
        @JsonProperty("web_app_data") TelegramWebAppData webAppData
) {
}
