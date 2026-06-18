package com.foodsave.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TelegramBroadcastRequest {
    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    private Boolean buttonEnabled;
    private String buttonText;
    private String buttonUrl;

    private String imageUrl;
}
