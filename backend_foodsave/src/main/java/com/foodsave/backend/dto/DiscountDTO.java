package com.foodsave.backend.dto;

import com.foodsave.backend.entity.Discount;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DiscountDTO {
    private Long id;
    private String code;
    private String description;
    private Double discountPercentage;
    private BigDecimal minOrderAmount;
    private BigDecimal maxDiscountAmount;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private boolean active;
    private Long storeId;

    public static DiscountDTO fromEntity(Discount discount) {
        DiscountDTO dto = new DiscountDTO();
        dto.setId(discount.getId());
        dto.setCode(discount.getCode());
        dto.setDescription(discount.getDescription());
        dto.setDiscountPercentage(discount.getDiscountPercentage());
        dto.setMinOrderAmount(discount.getMinOrderAmount());
        dto.setMaxDiscountAmount(discount.getMaxDiscountAmount());
        dto.setStartDate(discount.getStartDate());
        dto.setEndDate(discount.getEndDate());
        dto.setActive(discount.isActive());
        dto.setStoreId(discount.getStore().getId());
        return dto;
    }
} 