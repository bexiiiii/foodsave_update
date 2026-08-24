package com.foodsave.backend.dto;

import com.foodsave.backend.domain.enums.StoreStatus;
import com.foodsave.backend.entity.Store;

import java.time.LocalDateTime;

public record StorePublicDTO(
        Long id,
        String name,
        String description,
        String address,
        String logo,
        String coverImage,
        String openingHours,
        String closingHours,
        Double latitude,
        Double longitude,
        String category,
        StoreStatus status,
        boolean active,
        Integer productCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static StorePublicDTO fromEntity(Store store, Integer productCount) {
        return new StorePublicDTO(
                store.getId(),
                store.getName(),
                store.getDescription(),
                store.getAddress(),
                store.getLogo(),
                store.getCoverImage(),
                store.getOpeningHours(),
                store.getClosingHours(),
                store.getLatitude(),
                store.getLongitude(),
                store.getCategory(),
                store.getStatus(),
                store.isActive(),
                productCount,
                store.getCreatedAt(),
                store.getUpdatedAt()
        );
    }
}
