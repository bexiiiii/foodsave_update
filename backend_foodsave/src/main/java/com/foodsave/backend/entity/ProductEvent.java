package com.foodsave.backend.entity;

import com.foodsave.backend.domain.enums.ProductEventSource;
import com.foodsave.backend.domain.enums.ProductEventType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Data
@Entity
@Table(name = "product_events")
@EqualsAndHashCode(callSuper = true)
public class ProductEvent extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private ProductEventType eventType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "anonymous_session_id")
    private String anonymousSessionId;

    @Column(name = "telegram_user_id")
    private Long telegramUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id")
    private Order reservation;

    @Column(name = "partner_id")
    private Long partnerId;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "box_id")
    private Long boxId;

    @Column(name = "city_id")
    private Long cityId;

    @Column(name = "district_id")
    private Long districtId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source")
    private ProductEventSource source = ProductEventSource.unknown;

    @Column(name = "source_type")
    private String sourceType;

    @Column(name = "campaign_id")
    private String campaignId;

    @Column(name = "telegram_post_id")
    private String telegramPostId;

    @Column(name = "notification_id")
    private Long notificationId;

    @Column(name = "notification_group_id")
    private Long notificationGroupId;

    @Column(name = "deep_link", columnDefinition = "TEXT")
    private String deepLink;

    @Column(name = "start_param")
    private String startParam;

    @Column(name = "session_id")
    private String sessionId;

    @Column(name = "platform")
    private String platform;

    @Column(name = "device_type")
    private String deviceType;

    @Column(name = "telegram_version")
    private String telegramVersion;

    @Column(name = "app_version")
    private String appVersion;

    @Column(name = "language")
    private String language;

    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata = new HashMap<>();

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt = LocalDateTime.now();
}
