package com.foodsave.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteListDTO {
    private List<StorePublicDTO> stores;
    private List<ProductDTO> products;
}
