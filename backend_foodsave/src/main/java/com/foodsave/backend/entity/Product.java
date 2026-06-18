package com.foodsave.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.ToString;
import java.util.List;
import com.foodsave.backend.domain.enums.ProductStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import lombok.Builder;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "products")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@ToString(callSuper = true)
public class Product extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Product name is required")
    @Size(min = 3, max = 100, message = "Product name must be between 3 and 100 characters")
    @Column(nullable = false)
    private String name;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    @Column(columnDefinition = "TEXT")
    private String description;

    @Positive(message = "Price must be greater than 0")
    @Column
    private BigDecimal price;

    @Positive(message = "Original price must be greater than 0")
    private BigDecimal originalPrice;

    @Min(value = 0, message = "Discount percentage must be between 0 and 100")
    @Max(value = 100, message = "Discount percentage must be between 0 and 100")
    private Double discountPercentage;

    @Min(value = 0, message = "Stock quantity cannot be negative")
    @Column
    private Integer stockQuantity;

    @NotNull(message = "Product status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProductStatus status = ProductStatus.AVAILABLE;

    @NotNull(message = "Category is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    @NotNull
    @ToString.Exclude
    private Category category;

    @ElementCollection
    @CollectionTable(name = "product_images", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "image_url", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> images = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    @NotNull
    @ToString.Exclude
    private Store store;

    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @Builder.Default
    private List<Review> reviews = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @Builder.Default
    private List<CartItem> cartItems = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @Builder.Default
    private List<OrderItem> orderItems = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void addImage(String imageUrl) {
        images.add(imageUrl);
    }

    public void removeImage(String imageUrl) {
        images.remove(imageUrl);
    }

    public String getFirstImage() {
        return images != null && !images.isEmpty() ? images.get(0) : null;
    }

    public double getDiscountedPrice() {
        double safePrice = price != null ? price.doubleValue() : 0.0;
        if (discountPercentage != null && discountPercentage > 0 && safePrice > 0) {
            return safePrice * (1 - discountPercentage / 100.0);
        }
        return safePrice;
    }
} 
