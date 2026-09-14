package com.foodsave.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class ProductStatsDTO {
    private long totalProducts;
    private long activeProducts;
    private long outOfStockProducts;
    private long lowStockProducts;
    private BigDecimal totalValue;
    private Double averagePrice;
}
