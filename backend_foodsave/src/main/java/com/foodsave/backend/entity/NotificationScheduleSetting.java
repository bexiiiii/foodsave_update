package com.foodsave.backend.entity;

import com.foodsave.backend.domain.enums.NotificationWindowType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalTime;

@Data
@Entity
@Table(name = "notification_schedule_settings")
@EqualsAndHashCode(callSuper = true)
public class NotificationScheduleSetting extends BaseEntity {

    @Column(name = "city_id")
    private Long cityId;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_window_type", nullable = false)
    private NotificationWindowType notificationWindowType;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "send_time", nullable = false)
    private LocalTime sendTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "minimum_total_boxes", nullable = false)
    private Integer minimumTotalBoxes = 2;

    @Column(name = "minimum_partners", nullable = false)
    private Integer minimumPartners = 1;

    @Column(name = "maximum_messages_per_user_per_day", nullable = false)
    private Integer maximumMessagesPerUserPerDay = 2;

    @Column(name = "minimum_hours_between_messages", nullable = false)
    private Integer minimumHoursBetweenMessages = 4;

    @Column(name = "quiet_hours_start", nullable = false)
    private LocalTime quietHoursStart = LocalTime.of(22, 0);

    @Column(name = "quiet_hours_end", nullable = false)
    private LocalTime quietHoursEnd = LocalTime.of(9, 0);
}
