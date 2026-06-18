package com.foodsave.backend.domain.enums;

public enum TelegramSessionState {
    NONE,
    AWAITING_EMAIL,
    AWAITING_PASSWORD,
    AUTHENTICATED,
    AWAITING_STOCK_INPUT,
    AWAITING_PRICE_INPUT,
    AWAITING_ORIGINAL_PRICE_INPUT
}
