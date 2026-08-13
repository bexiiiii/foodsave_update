package com.foodsave.backend.dto.analytics;

import com.foodsave.backend.domain.enums.ProductEventSource;
import com.foodsave.backend.domain.enums.ProductEventType;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record ProductEventRequest(
        @NotNull ProductEventType eventType,
        String anonymousSessionId,
        Long telegramUserId,
        Long reservationId,
        Long partnerId,
        Long branchId,
        Long boxId,
        Long cityId,
        Long districtId,
        ProductEventSource source,
        String sourceType,
        String campaignId,
        String telegramPostId,
        Long notificationId,
        Long notificationGroupId,
        String deepLink,
        String startParam,
        String sessionId,
        String platform,
        String deviceType,
        String telegramVersion,
        String appVersion,
        String language,
        String idempotencyKey,
        Map<String, Object> metadata
) {
}
