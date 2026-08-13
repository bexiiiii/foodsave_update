package com.foodsave.backend.dto.communications;

import com.foodsave.backend.domain.enums.NotificationWindowType;
import com.foodsave.backend.entity.NotificationScheduleSetting;

import java.time.LocalTime;

public record NotificationScheduleSettingDTO(
        Long id,
        Long cityId,
        NotificationWindowType notificationWindowType,
        boolean enabled,
        LocalTime startTime,
        LocalTime sendTime,
        LocalTime endTime,
        Integer minimumTotalBoxes,
        Integer minimumPartners,
        Integer maximumMessagesPerUserPerDay,
        Integer minimumHoursBetweenMessages,
        LocalTime quietHoursStart,
        LocalTime quietHoursEnd
) {
    public static NotificationScheduleSettingDTO fromEntity(NotificationScheduleSetting setting) {
        return new NotificationScheduleSettingDTO(
                setting.getId(),
                setting.getCityId(),
                setting.getNotificationWindowType(),
                setting.isEnabled(),
                setting.getStartTime(),
                setting.getSendTime(),
                setting.getEndTime(),
                setting.getMinimumTotalBoxes(),
                setting.getMinimumPartners(),
                setting.getMaximumMessagesPerUserPerDay(),
                setting.getMinimumHoursBetweenMessages(),
                setting.getQuietHoursStart(),
                setting.getQuietHoursEnd()
        );
    }
}
