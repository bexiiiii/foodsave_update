package com.foodsave.backend.dto.telegram;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelegramWebAppData(
        String data,
        String buttonText
) {
}
