package com.foodsave.backend.dto.telegram;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelegramMessage(
        @JsonProperty("message_id") Long messageId,
        TelegramUser from,
        TelegramChat chat,
        String text,
        @JsonProperty("web_app_data") TelegramWebAppData webAppData,
        Long date, @JsonProperty("edit_date") Long editDate, TelegramLocation location
) {
    public TelegramMessage(Long messageId, TelegramUser from, TelegramChat chat, String text, TelegramWebAppData webAppData) {
        this(messageId, from, chat, text, webAppData, null, null, null);
    }
}
