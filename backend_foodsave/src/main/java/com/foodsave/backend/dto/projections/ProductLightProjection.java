package com.foodsave.backend.dto.projections;

import java.math.BigDecimal;

/**
 * Легкая проекция продукта для списков
 */
public interface ProductLightProjection {
    Long getId();
    String getName();
    BigDecimal getPrice();
    Integer getStockQuantity();
    Double getDiscountPercentage();
    String getFirstImage();
    StoreLightProjection getStore();
    
    interface StoreLightProjection {
        Long getId();
        String getName();
    }
}