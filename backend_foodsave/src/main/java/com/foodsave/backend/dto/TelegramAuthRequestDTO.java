package com.foodsave.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TelegramAuthRequestDTO {
    @NotBlank(message = "Telegram init data is required")
    private String initData;
}
