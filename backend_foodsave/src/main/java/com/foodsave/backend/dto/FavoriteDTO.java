package com.foodsave.backend.dto;

import com.foodsave.backend.domain.enums.FavoriteType;
import com.foodsave.backend.entity.Favorite;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FavoriteDTO {
    private Long id;

    @NotNull(message = "User ID is required")
    private Long userId;

    private Long storeId;
    private Long productId;
    private FavoriteType type;
    private LocalDateTime dateAdded;

    public static FavoriteDTO fromEntity(Favorite favorite) {
        FavoriteDTO dto = new FavoriteDTO();
        dto.setId(favorite.getId());
        dto.setUserId(favorite.getUserId());
        dto.setStoreId(favorite.getStoreId());
        dto.setProductId(favorite.getProductId());
        dto.setType(favorite.getType());
        dto.setDateAdded(favorite.getDateAdded());
        return dto;
    }
}
