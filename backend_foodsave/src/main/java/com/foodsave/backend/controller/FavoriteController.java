package com.foodsave.backend.controller;

import com.foodsave.backend.dto.FavoriteListDTO;
import com.foodsave.backend.service.FavoriteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
@Tag(name = "Favorites", description = "Operations related to favorite stores and products")
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    @Operation(summary = "Get current user's favorites", description = "Returns favorite stores and products")
    public ResponseEntity<FavoriteListDTO> getFavorites(Authentication authentication) {
        return ResponseEntity.ok(favoriteService.getFavorites(authentication.getName()));
    }

    @PostMapping("/store/{storeId}")
    @Operation(summary = "Add store to favorites")
    public ResponseEntity<Void> addStoreFavorite(@PathVariable Long storeId, Authentication authentication) {
        favoriteService.addStoreFavorite(authentication.getName(), storeId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/store/{storeId}")
    @Operation(summary = "Remove store from favorites")
    public ResponseEntity<Void> removeStoreFavorite(@PathVariable Long storeId, Authentication authentication) {
        favoriteService.removeStoreFavorite(authentication.getName(), storeId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/product/{productId}")
    @Operation(summary = "Add product to favorites")
    public ResponseEntity<Void> addProductFavorite(@PathVariable Long productId, Authentication authentication) {
        favoriteService.addProductFavorite(authentication.getName(), productId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/product/{productId}")
    @Operation(summary = "Remove product from favorites")
    public ResponseEntity<Void> removeProductFavorite(@PathVariable Long productId, Authentication authentication) {
        favoriteService.removeProductFavorite(authentication.getName(), productId);
        return ResponseEntity.noContent().build();
    }
}
