package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.ProductEventSource;
import com.foodsave.backend.domain.enums.ProductEventType;
import com.foodsave.backend.dto.analytics.ProductEventRequest;
import com.foodsave.backend.dto.analytics.DecisionHelpResponse;
import com.foodsave.backend.entity.Order;
import com.foodsave.backend.entity.ProductEvent;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.repository.OrderRepository;
import com.foodsave.backend.repository.ProductEventRepository;
import com.foodsave.backend.repository.UserRepository;
import com.foodsave.backend.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductEventService {

    private static final int DECISION_HELP_MIN_VIEWS = 4;
    private static final int DECISION_HELP_MIN_UNIQUE_BOXES = 3;
    private static final int DECISION_HELP_WINDOW_MINUTES = 20;
    private static final int DECISION_HELP_COOLDOWN_HOURS = 24;
    private static final Set<ProductEventType> DECISION_HELP_EVENTS = Set.of(
            ProductEventType.DECISION_HELP_SHOWN,
            ProductEventType.DECISION_HELP_OPENED,
            ProductEventType.DECISION_HELP_DISMISSED
    );

    private static final int MAX_METADATA_ENTRIES = 50;
    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "phone", "email", "name", "firstName", "lastName", "password", "token",
            "auth", "authorization", "initData", "init_data", "hash"
    );

    private final ProductEventRepository productEventRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final SecurityUtil securityUtil;
    @Qualifier("telegramNotificationExecutor")
    private final TaskExecutor analyticsExecutor;

    public void trackAsync(ProductEventRequest request) {
        if (request == null || request.eventType() == null) {
            return;
        }
        try {
            analyticsExecutor.execute(() -> {
                try {
                    saveEvent(request);
                } catch (Exception e) {
                    log.warn("Product analytics event failed but user flow continues: type={}", request.eventType(), e);
                }
            });
        } catch (Exception e) {
            log.warn("Failed to enqueue product analytics event: type={}", request.eventType(), e);
        }
    }

    @Transactional
    public void saveEvent(ProductEventRequest request) {
        if (request.idempotencyKey() != null && !request.idempotencyKey().isBlank()
                && productEventRepository.findByIdempotencyKey(request.idempotencyKey()).isPresent()) {
            return;
        }

        User user = resolveUser(request);
        Order reservation = request.reservationId() != null
                ? orderRepository.findById(request.reservationId()).orElse(null)
                : null;

        ProductEvent event = new ProductEvent();
        event.setEventType(request.eventType());
        event.setUser(user);
        event.setAnonymousSessionId(limit(request.anonymousSessionId(), 120));
        event.setTelegramUserId(resolveTelegramUserId(request, user));
        event.setReservation(reservation);
        event.setPartnerId(request.partnerId());
        event.setBranchId(request.branchId());
        event.setBoxId(request.boxId());
        event.setCityId(request.cityId());
        event.setDistrictId(request.districtId());
        event.setSource(request.source() != null ? request.source() : ProductEventSource.unknown);
        event.setSourceType(limit(request.sourceType(), 120));
        event.setCampaignId(limit(request.campaignId(), 120));
        event.setTelegramPostId(limit(request.telegramPostId(), 120));
        event.setNotificationId(request.notificationId());
        event.setNotificationGroupId(request.notificationGroupId());
        event.setDeepLink(limit(request.deepLink(), 1000));
        event.setStartParam(limit(request.startParam(), 255));
        event.setSessionId(limit(request.sessionId(), 120));
        event.setPlatform(limit(request.platform(), 80));
        event.setDeviceType(limit(request.deviceType(), 80));
        event.setTelegramVersion(limit(request.telegramVersion(), 80));
        event.setAppVersion(limit(request.appVersion(), 80));
        event.setLanguage(limit(resolveLanguage(request, user), 16));
        event.setIdempotencyKey(limit(request.idempotencyKey(), 180));
        event.setMetadata(sanitizeMetadata(request.metadata()));
        event.setOccurredAt(LocalDateTime.now());
        productEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public DecisionHelpResponse getDecisionHelp(String sessionId) {
        Long userId = securityUtil.getCurrentUserId();
        String normalizedSessionId = limit(sessionId == null || sessionId.isBlank() ? null : sessionId, 120);
        if (userId == null && normalizedSessionId == null) {
            return new DecisionHelpResponse(false, 0, 0);
        }

        if (productEventRepository.countRecentDecisionHelpEvents(
                DECISION_HELP_EVENTS, userId, normalizedSessionId,
                LocalDateTime.now().minusHours(DECISION_HELP_COOLDOWN_HOURS)) > 0) {
            return new DecisionHelpResponse(false, 0, 0);
        }

        ProductEventRepository.DecisionHelpProjection activity = productEventRepository.findDecisionHelpActivity(
                ProductEventType.BOX_VIEWED, userId, normalizedSessionId,
                LocalDateTime.now().minusMinutes(DECISION_HELP_WINDOW_MINUTES));
        long views = activity == null || activity.getViewCount() == null ? 0 : activity.getViewCount();
        long uniqueBoxes = activity == null || activity.getUniqueBoxCount() == null ? 0 : activity.getUniqueBoxCount();
        return new DecisionHelpResponse(
                views >= DECISION_HELP_MIN_VIEWS && uniqueBoxes >= DECISION_HELP_MIN_UNIQUE_BOXES,
                views,
                uniqueBoxes
        );
    }

    private User resolveUser(ProductEventRequest request) {
        Long currentUserId = securityUtil.getCurrentUserId();
        if (currentUserId != null) {
            return userRepository.findById(currentUserId).orElse(null);
        }
        if (request.telegramUserId() != null) {
            return userRepository.findByTelegramUserId(request.telegramUserId()).orElse(null);
        }
        return null;
    }

    private Long resolveTelegramUserId(ProductEventRequest request, User user) {
        if (request.telegramUserId() != null) return request.telegramUserId();
        return user != null ? user.getTelegramUserId() : null;
    }

    private String resolveLanguage(ProductEventRequest request, User user) {
        if (request.language() != null && !request.language().isBlank()) return request.language();
        if (user != null && user.getTelegramLanguageCode() != null) return user.getTelegramLanguageCode();
        return "ru";
    }

    private Map<String, Object> sanitizeMetadata(Map<String, Object> metadata) {
        Map<String, Object> result = new HashMap<>();
        if (metadata == null || metadata.isEmpty()) {
            return result;
        }
        for (Map.Entry<String, Object> entry : metadata.entrySet()) {
            if (result.size() >= MAX_METADATA_ENTRIES) break;
            String key = entry.getKey();
            if (key == null || isSensitive(key)) continue;
            Object value = entry.getValue();
            if (value instanceof String stringValue) {
                result.put(limit(key, 100), limit(stringValue, 500));
            } else if (value instanceof Number || value instanceof Boolean || value == null) {
                result.put(limit(key, 100), value);
            } else {
                result.put(limit(key, 100), limit(String.valueOf(value), 500));
            }
        }
        return result;
    }

    private boolean isSensitive(String key) {
        String normalized = key.toLowerCase(Locale.ROOT);
        return SENSITIVE_KEYS.stream().anyMatch(normalized::contains);
    }

    private String limit(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
