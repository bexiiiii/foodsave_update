package com.foodsave.backend.dto;

import com.foodsave.backend.entity.OrderItem;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemDTO {
    private Long id;
    
    @NotNull
    private Long orderId;
    
    @NotNull
    private Long productId;
    
    private String productName;
    
    private String productImage;
    
    @NotNull
    @Min(1)
    private Integer quantity;
    
    private BigDecimal unitPrice;
    
    private BigDecimal totalPrice;
    
    private String categoryName;
    
    public static OrderItemDTO fromEntity(OrderItem item) {
        String productImage = null;
        try {
            List<String> images = item.getProduct().getImages();
            if (images != null && !images.isEmpty()) {
                productImage = images.get(0);
            }
        } catch (Exception e) {
            // fallback: leave productImage null
        }
        return OrderItemDTO.builder()
                .id(item.getId())
                .orderId(item.getOrder().getId())
                .productId(item.getProduct().getId())
                .productName(item.getProduct().getName())
                .productImage(productImage)
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .categoryName(item.getProduct().getCategory().getName())
                .build();
    }
}
