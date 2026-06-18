package com.foodsave.backend.dto;

import com.foodsave.backend.entity.Product;
import com.foodsave.backend.domain.enums.ProductStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO {
    private Long id;
    
    @NotBlank(message = "Product name is required")
    @Size(min = 3, max = 100, message = "Product name must be between 3 and 100 characters")
    private String name;
    
    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;
    
    @Positive(message = "Price must be greater than 0")
    private BigDecimal price;
    
    @Positive(message = "Original price must be greater than 0")
    private BigDecimal originalPrice;
    
    @PositiveOrZero(message = "Discount percentage must be 0 or greater")
    private Double discountPercentage;
    
    @PositiveOrZero(message = "Stock quantity must be 0 or greater")
    private Integer stockQuantity;
    
    @NotNull(message = "Store ID is required")
    private Long storeId;
    
    private String storeName;
    private String storeLogo;
    private String storeAddress;
    
    @NotNull(message = "Category ID is required")
    private Long categoryId;
    
    private String categoryName;
    
    private List<String> images;
    
    private LocalDateTime expiryDate;
    
    @NotNull(message = "Status is required")
    private ProductStatus status;
    
    private Boolean active;
    private Integer orderCount;
    private Double averageRating;
    private Integer reviewCount;
    
    // Computed properties for frontend compatibility
    private Boolean isAvailable;
    private Integer availableQuantity;
    private String imageUrl;
    private String expirationDate;
    private Boolean isFeatured;
    private Double rating;
    
    private String createdAt;
    private String updatedAt;
    
    public static ProductDTO fromEntity(Product product) {
        List<String> imagesCopy = new ArrayList<>();
        try {
            if (product.getImages() != null) {
                imagesCopy = new ArrayList<>(product.getImages());
            }
        } catch (Exception e) {
            // fallback: leave imagesCopy empty
        }
        BigDecimal discountedPrice = product.getPrice() != null ? product.getPrice() : BigDecimal.ZERO;
        BigDecimal originalPrice = product.getOriginalPrice();
        Double discountPercentage = product.getDiscountPercentage();
        Integer stockQuantity = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        boolean isActive = Boolean.TRUE.equals(product.getActive());

        return ProductDTO.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(discountedPrice)
                .originalPrice(originalPrice)
                .discountPercentage(discountPercentage)
                .stockQuantity(stockQuantity)
                .storeId(product.getStore().getId())
                .storeName(product.getStore().getName())
                .storeLogo(product.getStore().getLogo())
                .storeAddress(product.getStore().getAddress())
                .categoryId(product.getCategory().getId())
                .categoryName(product.getCategory().getName())
                .images(imagesCopy)
                .expiryDate(product.getExpiryDate())
                .status(product.getStatus())
                .active(product.getActive())
                // Computed properties for frontend compatibility
                .isAvailable(isActive &&
                           product.getStatus() == ProductStatus.AVAILABLE &&
                           stockQuantity > 0)
                .availableQuantity(stockQuantity)
                .imageUrl(!imagesCopy.isEmpty() ? imagesCopy.get(0) : null)
                .expirationDate(product.getExpiryDate() != null ? product.getExpiryDate().toString() : null)
                .isFeatured(discountPercentage != null && discountPercentage > 0)
                .rating(0.0) // Default rating for now
                .createdAt(product.getCreatedAt() != null ? product.getCreatedAt().toString() : null)
                .updatedAt(product.getUpdatedAt() != null ? product.getUpdatedAt().toString() : null)
                .build();
    }
}
