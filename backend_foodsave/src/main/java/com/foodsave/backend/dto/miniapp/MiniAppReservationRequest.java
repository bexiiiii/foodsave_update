package com.foodsave.backend.dto.miniapp;

import com.foodsave.backend.domain.enums.DeliveryType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Payload coming from the Telegram mini-app when a user reserves a product.
 */
public record MiniAppReservationRequest(
        @NotNull Long productId,
        @Min(1) Integer quantity,
        String note,
        String contactPhone,
        DeliveryType deliveryType
) {
    public int normalizedQuantity() {
        return quantity != null && quantity > 0 ? quantity : 1;
    }
}
