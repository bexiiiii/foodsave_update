package com.foodsave.backend.entity;

import com.foodsave.backend.domain.enums.NotificationGroupStatus;
import com.foodsave.backend.domain.enums.NotificationTriggerType;
import com.foodsave.backend.domain.enums.NotificationWindowType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "notification_groups")
@EqualsAndHashCode(callSuper = true)
public class NotificationGroup extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "city_id")
    private Long cityId;

    @Column(name = "district_id")
    private Long districtId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationGroupStatus status = NotificationGroupStatus.COLLECTING;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "failed_at")
    private LocalDateTime failedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "telegram_message_id")
    private String telegramMessageId;

    @Column(name = "notification_type", nullable = false)
    private String notificationType = "MARKETING";

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false)
    private NotificationTriggerType triggerType = NotificationTriggerType.NEW_BOX;

    @Enumerated(EnumType.STRING)
    @Column(name = "time_window", nullable = false)
    private NotificationWindowType timeWindow = NotificationWindowType.LUNCH;

    @Column(name = "total_partners")
    private Integer totalPartners = 0;

    @Column(name = "total_boxes")
    private Integer totalBoxes = 0;

    @Column(name = "minimum_price")
    private BigDecimal minimumPrice;

    @Column(name = "maximum_discount")
    private Integer maximumDiscount = 0;

    @Column(name = "deep_link", columnDefinition = "TEXT")
    private String deepLink;

    @Column(name = "campaign_id")
    private String campaignId;

    @Column(name = "idempotency_key", unique = true)
    private String idempotencyKey;

    @OneToMany(mappedBy = "notificationGroup", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<NotificationGroupItem> items = new ArrayList<>();
}
