package com.foodsave.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "notification_group_items")
@EqualsAndHashCode(callSuper = true)
public class NotificationGroupItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notification_group_id", nullable = false)
    private NotificationGroup notificationGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", nullable = false)
    private Store partner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private Store branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "box_id")
    private Product box;

    @Column(name = "available_quantity")
    private Integer availableQuantity = 0;

    @Column(name = "price")
    private BigDecimal price;

    @Column(name = "original_price")
    private BigDecimal originalPrice;

    @Column(name = "discount_percent")
    private Integer discountPercent = 0;

    @Column(name = "pickup_end_at")
    private LocalDateTime pickupEndAt;
}
