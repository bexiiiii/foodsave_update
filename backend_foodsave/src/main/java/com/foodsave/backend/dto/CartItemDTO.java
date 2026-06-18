package com.foodsave.backend.dto;

import com.foodsave.backend.entity.CartItem;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class CartItemDTO {
    private Long id;
    
    private Long cartId;
    
    @NotNull
    private Long productId;
    
    private String productName;
    
    private List<String> productImages;
    
    @NotNull
    @Min(1)
    private Integer quantity;
    
    private BigDecimal price;
    
    private BigDecimal discountPrice;
    
    private BigDecimal subtotal;
    
    private BigDecimal discount;
    
    private BigDecimal total;
    
    public static CartItemDTO fromEntity(CartItem item) {
        if (item == null) {
            // Логируем ошибку
            System.err.println("CartItemDTO.fromEntity: item is null");
            return null;
        }
        if (item.getProduct() == null) {
            System.err.println("CartItemDTO.fromEntity: product is null for cartItem id=" + item.getId());
            return null;
        }
        if (item.getCart() == null) {
            System.err.println("CartItemDTO.fromEntity: cart is null for cartItem id=" + item.getId());
            return null;
        }
        List<String> imageUrls = new ArrayList<>();
        try {
            List<String> images = item.getProduct().getImages();
            if (images != null && org.hibernate.Hibernate.isInitialized(images)) {
                imageUrls = new ArrayList<>(images);
            }
        } catch (Exception e) {
            System.err.println("CartItemDTO.fromEntity: error accessing images for product id=" + item.getProduct().getId() + ": " + e.getMessage());
            imageUrls = new ArrayList<>();
        }
        return CartItemDTO.builder()
                .id(item.getId())
                .cartId(item.getCart().getId())
                .productId(item.getProduct().getId())
                .productName(item.getProduct().getName())
                .productImages(imageUrls)
                .quantity(item.getQuantity())
                .price(item.getPrice())
                .discountPrice(item.getDiscountPrice())
                .subtotal(item.getSubtotal())
                .discount(item.getDiscount())
                .total(item.getTotal())
                .build();
    }
}
