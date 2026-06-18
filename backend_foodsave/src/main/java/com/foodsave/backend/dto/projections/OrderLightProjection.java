package com.foodsave.backend.dto.projections;

import com.foodsave.backend.domain.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Легкая проекция заказа для списков
 */
public interface OrderLightProjection {
    Long getId();
    String getOrderNumber();
    OrderStatus getStatus();
    BigDecimal getTotal();
    LocalDateTime getCreatedAt();
    StoreLightProjection getStore();
    
    interface StoreLightProjection {
        Long getId();
        String getName();
        String getLogo();
    }
}