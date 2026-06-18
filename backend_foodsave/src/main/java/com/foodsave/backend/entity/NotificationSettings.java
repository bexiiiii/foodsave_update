package com.foodsave.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "notification_settings")
public class NotificationSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private boolean emailEnabled;

    @Column(nullable = false)
    private boolean pushEnabled;

    @Column(nullable = false)
    private boolean smsEnabled;

    @Column(nullable = false)
    private boolean orderUpdates;

    @Column(nullable = false)
    private boolean promotions;

    @Column(nullable = false)
    private boolean systemUpdates;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;
} 