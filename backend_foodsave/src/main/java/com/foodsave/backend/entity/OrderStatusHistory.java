package com.foodsave.backend.entity;

import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.ReservationActorType;
import com.foodsave.backend.domain.enums.ReservationCancellationReason;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@Entity
@Table(name = "order_status_history")
@EqualsAndHashCode(callSuper = true)
public class OrderStatusHistory extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status")
    private OrderStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false)
    private OrderStatus newStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false)
    private ReservationActorType actorType = ReservationActorType.SYSTEM;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private User actorUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "cancellation_reason")
    private ReservationCancellationReason cancellationReason;

    @Column(name = "cancellation_comment", columnDefinition = "TEXT")
    private String cancellationComment;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;
}
