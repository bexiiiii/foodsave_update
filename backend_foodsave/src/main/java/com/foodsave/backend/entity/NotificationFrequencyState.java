package com.foodsave.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "notification_frequency_states")
@EqualsAndHashCode(callSuper = true)
public class NotificationFrequencyState extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "last_marketing_sent_at")
    private LocalDateTime lastMarketingSentAt;

    @Column(name = "marketing_sent_today")
    private Integer marketingSentToday = 0;

    @Column(name = "marketing_sent_date")
    private LocalDate marketingSentDate;

    @Column(name = "consecutive_unopened_count")
    private Integer consecutiveUnopenedCount = 0;

    @Column(name = "last_opened_at")
    private LocalDateTime lastOpenedAt;

    @Column(name = "suppressed_until")
    private LocalDateTime suppressedUntil;

    @Column(name = "engagement_score")
    private Double engagementScore = 0.0;
}
