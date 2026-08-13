package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.FavoriteType;
import com.foodsave.backend.dto.FavoriteListDTO;
import com.foodsave.backend.dto.ProductDTO;
import com.foodsave.backend.dto.StoreDTO;
import com.foodsave.backend.entity.Favorite;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.exception.ResourceNotFoundException;
import com.foodsave.backend.repository.FavoriteRepository;
import com.foodsave.backend.repository.ProductRepository;
import com.foodsave.backend.repository.StoreRepository;
import com.foodsave.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public void addStoreFavorite(String userEmail, Long storeId) {
        Long userId = resolveUserId(userEmail);
        if (!storeRepository.existsById(storeId)) {
            throw new ResourceNotFoundException("Store not found with id: " + storeId);
        }
        if (favoriteRepository.existsByUserIdAndStoreIdAndType(userId, storeId, FavoriteType.STORE)) {
            return;
        }
        Favorite favorite = new Favorite();
        favorite.setUserId(userId);
        favorite.setStoreId(storeId);
        favorite.setType(FavoriteType.STORE);
        favoriteRepository.save(favorite);
    }

    public void removeStoreFavorite(String userEmail, Long storeId) {
        Long userId = resolveUserId(userEmail);
        favoriteRepository.deleteByUserIdAndStoreIdAndType(userId, storeId, FavoriteType.STORE);
    }

    public void addProductFavorite(String userEmail, Long productId) {
        Long userId = resolveUserId(userEmail);
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found with id: " + productId);
        }
        if (favoriteRepository.existsByUserIdAndProductIdAndType(userId, productId, FavoriteType.PRODUCT)) {
            return;
        }
        Favorite favorite = new Favorite();
        favorite.setUserId(userId);
        favorite.setProductId(productId);
        favorite.setType(FavoriteType.PRODUCT);
        favoriteRepository.save(favorite);
    }

    public void removeProductFavorite(String userEmail, Long productId) {
        Long userId = resolveUserId(userEmail);
        favoriteRepository.deleteByUserIdAndProductIdAndType(userId, productId, FavoriteType.PRODUCT);
    }

    public FavoriteListDTO getFavorites(String userEmail) {
        Long userId = resolveUserId(userEmail);
        List<Favorite> favorites = favoriteRepository.findByUserId(userId);

        List<StoreDTO> stores = favorites.stream()
                .filter(f -> f.getType() == FavoriteType.STORE && f.getStoreId() != null)
                .map(f -> storeRepository.findById(f.getStoreId()).orElse(null))
                .filter(Objects::nonNull)
                .map(StoreDTO::fromEntity)
                .peek(dto -> dto.setIsFavorite(true))
                .toList();

        List<ProductDTO> products = favorites.stream()
                .filter(f -> f.getType() == FavoriteType.PRODUCT && f.getProductId() != null)
                .map(f -> productRepository.findById(f.getProductId()).orElse(null))
                .filter(Objects::nonNull)
                .map(product -> {
                    ProductDTO dto = ProductDTO.fromEntity(product);
                    dto.setIsFavorite(true);
                    return dto;
                })
                .toList();

        return new FavoriteListDTO(stores, products);
    }

    private Long resolveUserId(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + userEmail));
        return user.getId();
    }
}
