package com.foodsave.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class HistoryDTO {
    private Long id;

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Action is required")
    private String action;

    @NotBlank(message = "Target type is required")
    private String targetType;

    @NotNull(message = "Target ID is required")
    private Long targetId;

    private LocalDateTime timestamp;
} 