package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.NotificationGroupStatus;
import com.foodsave.backend.entity.NotificationGroup;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.repository.NotificationGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class NotificationAttributionService {

    static final Duration ATTRIBUTION_WINDOW = Duration.ofHours(24);

    private final NotificationGroupRepository groupRepository;

    public ResolvedNotificationAttribution resolve(Long requestedGroupId, String startParam, User currentUser) {
        return resolve(requestedGroupId, startParam, currentUser, LocalDateTime.now());
    }

    ResolvedNotificationAttribution resolve(Long requestedGroupId, String startParam, User currentUser,
                                             LocalDateTime now) {
        if (currentUser == null || currentUser.getId() == null || now == null) return empty();

        Long startParamGroupId = parseNotificationGroupId(startParam);
        Long groupId = requestedGroupId != null ? requestedGroupId : startParamGroupId;
        if (groupId == null || (startParam != null && !Objects.equals(groupId, startParamGroupId))) {
            return empty();
        }

        NotificationGroup group = groupRepository.findById(groupId).orElse(null);
        if (group == null || group.getStatus() != NotificationGroupStatus.SENT || group.getUser() == null
                || !Objects.equals(group.getUser().getId(), currentUser.getId()) || group.getSentAt() == null) {
            return empty();
        }

        LocalDateTime sentAt = group.getSentAt();
        if (now.isBefore(sentAt) || Duration.between(sentAt, now).compareTo(ATTRIBUTION_WINDOW) > 0) {
            return empty();
        }

        return new ResolvedNotificationAttribution(groupId, "notification_" + groupId, true);
    }

    private Long parseNotificationGroupId(String startParam) {
        if (startParam == null || !startParam.startsWith("notification_")) return null;
        try {
            long parsed = Long.parseLong(startParam.substring("notification_".length()));
            return parsed > 0 ? parsed : null;
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private ResolvedNotificationAttribution empty() {
        return new ResolvedNotificationAttribution(null, null, false);
    }

    public record ResolvedNotificationAttribution(Long notificationGroupId, String startParam, boolean valid) {
    }
}
