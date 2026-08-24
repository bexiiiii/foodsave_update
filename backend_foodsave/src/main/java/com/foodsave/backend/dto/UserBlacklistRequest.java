package com.foodsave.backend.dto;

public record UserBlacklistRequest(
        Boolean blacklisted,
        String reason
) {
}
