package com.foodsave.backend.dto;

import com.foodsave.backend.entity.Cart;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartDTO {
    private Long id;
    
    @NotNull
    private Long userId;
    
    private String userName;
    
    private String userEmail;
    
    private List<CartItemDTO> items;
    
    private Integer itemCount;
    
    private BigDecimal subtotal;
    
    private BigDecimal totalDiscount;
    private BigDecimal total;
    private String createdAt;
    private String updatedAt;

    public static CartDTO fromEntity(Cart cart) {
        return CartDTO.builder()
                .id(cart.getId())
                .userId(cart.getUser().getId())
                .userName(cart.getUser().getFirstName() + " " + cart.getUser().getLastName())
                .userEmail(cart.getUser().getEmail())
                .items(cart.getItems().stream()
                        .map(CartItemDTO::fromEntity)
                        .toList())
                .itemCount(cart.getItems().size())
                .subtotal(cart.getSubtotal())
                .totalDiscount(cart.getTotalDiscount())
                .total(cart.getTotal())
                .createdAt(cart.getCreatedAt() != null ? cart.getCreatedAt().toString() : null)
                .updatedAt(cart.getUpdatedAt() != null ? cart.getUpdatedAt().toString() : null)
                .build();
    }
}
