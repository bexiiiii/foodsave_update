package com.foodsave.backend.dto;

import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.ReservationActorType;
import com.foodsave.backend.domain.enums.ReservationCancellationReason;
import jakarta.validation.constraints.NotNull;

public record OrderStatusUpdateRequest(
        @NotNull OrderStatus status,
        ReservationActorType actorType,
        ReservationCancellationReason cancellationReason,
        String cancellationComment
) {
}
