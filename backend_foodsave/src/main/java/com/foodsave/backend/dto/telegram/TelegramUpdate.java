package com.foodsave.backend.dto.telegram;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelegramUpdate(
        TelegramMessage message,
        @JsonProperty("callback_query") TelegramCallbackQuery callbackQuery
) {
}
