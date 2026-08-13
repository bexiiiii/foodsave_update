package com.foodsave.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "user_notification_preferences")
@EqualsAndHashCode(callSuper = true)
public class UserNotificationPreferences extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private boolean telegramNotificationsEnabled = true;
    private boolean lunchDigestEnabled = true;
    private boolean eveningDigestEnabled = true;
    private boolean lastChanceEnabled = true;
    private boolean favoritePartnerAlertsEnabled = true;
    private boolean nearbyOffersEnabled = true;

    @Column(name = "city_id")
    private Long cityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "district_ids", columnDefinition = "jsonb")
    private List<Long> districtIds = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "category_ids", columnDefinition = "jsonb")
    private List<Long> categoryIds = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "favorite_partner_ids", columnDefinition = "jsonb")
    private List<Long> favoritePartnerIds = new ArrayList<>();

    @Column(name = "max_distance_km")
    private Double maxDistanceKm = 8.0;

    @Column(name = "min_discount_percent")
    private Integer minDiscountPercent;

    @Column(name = "max_price")
    private BigDecimal maxPrice;

    @Column(name = "maximum_messages_per_day")
    private Integer maximumMessagesPerDay = 2;

    @Column(name = "quiet_hours_start")
    private LocalTime quietHoursStart = LocalTime.of(22, 0);

    @Column(name = "quiet_hours_end")
    private LocalTime quietHoursEnd = LocalTime.of(9, 0);

    @Column(name = "timezone")
    private String timezone = "Asia/Almaty";

    @Column(name = "language")
    private String language = "ru";
}
