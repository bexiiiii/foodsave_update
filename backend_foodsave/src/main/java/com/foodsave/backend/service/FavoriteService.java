package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.FavoriteType;
import com.foodsave.backend.dto.FavoriteListDTO;
import com.foodsave.backend.dto.ProductDTO;
import com.foodsave.backend.dto.StorePublicDTO;
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

    public void addStoreFavorite(String email, Long storeId) {
        Long userId = resolveUserId(email);
        if (!storeRepository.existsById(storeId)) {
            throw new ResourceNotFoundException("Store not found");
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

    public void removeStoreFavorite(String email, Long storeId) {
        favoriteRepository.deleteByUserIdAndStoreIdAndType(resolveUserId(email), storeId, FavoriteType.STORE);
    }

    public void addProductFavorite(String email, Long productId) {
        Long userId = resolveUserId(email);
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found");
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

    public void removeProductFavorite(String email, Long productId) {
        favoriteRepository.deleteByUserIdAndProductIdAndType(resolveUserId(email), productId, FavoriteType.PRODUCT);
    }

    public FavoriteListDTO getFavorites(String email) {
        List<Favorite> favorites = favoriteRepository.findByUserId(resolveUserId(email));
        List<StorePublicDTO> stores = favorites.stream()
                .filter(favorite -> favorite.getType() == FavoriteType.STORE && favorite.getStoreId() != null)
                .map(favorite -> storeRepository.findById(favorite.getStoreId()).orElse(null))
                .filter(Objects::nonNull)
                .map(store -> StorePublicDTO.fromEntity(store, (int) productRepository.countByStore(store)))
                .toList();
        List<ProductDTO> products = favorites.stream()
                .filter(favorite -> favorite.getType() == FavoriteType.PRODUCT && favorite.getProductId() != null)
                .map(favorite -> productRepository.findById(favorite.getProductId()).orElse(null))
                .filter(Objects::nonNull)
                .map(product -> {
                    ProductDTO dto = ProductDTO.fromEntity(product);
                    dto.setIsFavorite(true);
                    return dto;
                })
                .toList();
        return new FavoriteListDTO(stores, products);
    }

    private Long resolveUserId(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getId();
    }
}
