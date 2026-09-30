package com.foodsave.backend.dto;

import com.foodsave.backend.domain.enums.ProductImageType;
import com.foodsave.backend.entity.ProductGalleryImage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductGalleryImageDTO {

    @NotBlank
    private String url;

    @NotNull
    private ProductImageType type;

    public static ProductGalleryImageDTO fromEntity(ProductGalleryImage image) {
        return ProductGalleryImageDTO.builder()
                .url(image.getUrl())
                .type(image.getType())
                .build();
    }

    public ProductGalleryImage toEntity() {
        return ProductGalleryImage.builder()
                .url(url)
                .type(type)
                .build();
    }
}
