package com.foodsave.backend.dto;

import com.foodsave.backend.entity.Product;
import com.foodsave.backend.domain.enums.ProductStatus;
import com.foodsave.backend.domain.enums.ProductAvailabilityState;
import com.foodsave.backend.util.ProductAvailability;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
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

    private Integer sortOrder;
    
    @NotNull(message = "Store ID is required")
    private Long storeId;
    
    private String storeName;
    private String storeLogo;
    private String storeAddress;
    private Double storeLatitude;
    private Double storeLongitude;
    
    @NotNull(message = "Category ID is required")
    private Long categoryId;
    
    private String categoryName;
    
    private List<String> images;
    @Valid
    @Size(max = 15, message = "A product can have at most 15 gallery images")
    private List<ProductGalleryImageDTO> galleryImages;
    
    private LocalDateTime expiryDate;
    
    @NotNull(message = "Status is required")
    private ProductStatus status;
    
    private Boolean active;
    private Integer orderCount;
    private Double averageRating;
    private Integer reviewCount;
    
    // Computed properties for frontend compatibility
    private Boolean isAvailable;
    private Boolean canReserve;
    private ProductAvailabilityState availabilityState;
    private Integer availableQuantity;
    private String imageUrl;
    private String expirationDate;
    private Boolean isFeatured;
    private Double rating;
    private Boolean isFavorite;
    
    private String createdAt;
    private String updatedAt;
    
    public static ProductDTO fromEntity(Product product) {
        List<String> imagesCopy = new ArrayList<>();
        List<ProductGalleryImageDTO> galleryImagesCopy = new ArrayList<>();
        try {
            if (product.getImages() != null) {
                imagesCopy = new ArrayList<>(product.getImages());
            }
            if (product.getGalleryImages() != null) {
                galleryImagesCopy = product.getGalleryImages().stream()
                        .map(ProductGalleryImageDTO::fromEntity)
                        .toList();
            }
        } catch (Exception e) {
            // fallback: leave image collections empty
        }
        if (galleryImagesCopy.isEmpty()) {
            galleryImagesCopy = legacyGallery(imagesCopy);
        }
        if (!galleryImagesCopy.isEmpty()) {
            imagesCopy = galleryImagesCopy.stream().map(ProductGalleryImageDTO::getUrl).toList();
        }
        BigDecimal discountedPrice = product.getPrice() != null ? product.getPrice() : BigDecimal.ZERO;
        BigDecimal originalPrice = product.getOriginalPrice();
        Double discountPercentage = product.getDiscountPercentage();
        Integer stockQuantity = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        boolean isAvailable = ProductAvailability.isAvailable(product);

        return ProductDTO.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(discountedPrice)
                .originalPrice(originalPrice)
                .discountPercentage(discountPercentage)
                .stockQuantity(stockQuantity)
                .sortOrder(product.getSortOrder())
                .storeId(product.getStore().getId())
                .storeName(product.getStore().getName())
                .storeLogo(product.getStore().getLogo())
                .storeAddress(product.getStore().getAddress())
                .storeLatitude(product.getStore().getLatitude())
                .storeLongitude(product.getStore().getLongitude())
                .categoryId(product.getCategory().getId())
                .categoryName(product.getCategory().getName())
                .images(imagesCopy)
                .galleryImages(galleryImagesCopy)
                .expiryDate(product.getExpiryDate())
                .status(product.getStatus())
                .active(product.getActive())
                // Computed properties for frontend compatibility
                .isAvailable(isAvailable)
                .availableQuantity(stockQuantity)
                .imageUrl(!imagesCopy.isEmpty() ? imagesCopy.get(0) : null)
                .expirationDate(product.getExpiryDate() != null ? product.getExpiryDate().toString() : null)
                .isFeatured(discountPercentage != null && discountPercentage > 0)
                .rating(0.0) // Default rating for now
                .isFavorite(false)
                .createdAt(product.getCreatedAt() != null ? product.getCreatedAt().toString() : null)
                .updatedAt(product.getUpdatedAt() != null ? product.getUpdatedAt().toString() : null)
                .build();
    }

    private static List<ProductGalleryImageDTO> legacyGallery(List<String> images) {
        List<ProductGalleryImageDTO> gallery = new ArrayList<>();
        for (int index = 0; index < images.size(); index++) {
            com.foodsave.backend.domain.enums.ProductImageType type = switch (index) {
                case 0 -> com.foodsave.backend.domain.enums.ProductImageType.COVER;
                case 1 -> com.foodsave.backend.domain.enums.ProductImageType.INSIDE;
                default -> com.foodsave.backend.domain.enums.ProductImageType.OUTSIDE;
            };
            gallery.add(ProductGalleryImageDTO.builder().url(images.get(index)).type(type).build());
        }
        return gallery;
    }
}
