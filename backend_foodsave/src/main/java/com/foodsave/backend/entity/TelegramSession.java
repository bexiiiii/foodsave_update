package com.foodsave.backend.entity;

import com.foodsave.backend.domain.enums.TelegramSessionState;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "telegram_sessions")
@Data
@NoArgsConstructor
public class TelegramSession {

    @Id
    @Column(name = "chat_id")
    private Long chatId;

    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TelegramSessionState state = TelegramSessionState.NONE;

    @Column(name = "selected_product_id")
    private Long selectedProductId;

    @Column(name = "pending_value_type")
    private String pendingValueType;

    @Column(name = "pending_email")
    private String pendingEmail;

    @Column(name = "pending_page")
    private Integer pendingPage;

    @Column(name = "last_interaction_at")
    private LocalDateTime lastInteractionAt;

    public boolean isAuthenticated() {
        return userId != null && state == TelegramSessionState.AUTHENTICATED;
    }

    @PrePersist
    public void onCreate() {
        lastInteractionAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        lastInteractionAt = LocalDateTime.now();
    }
}
