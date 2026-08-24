package com.foodsave.backend.controller;

import com.foodsave.backend.dto.FavoriteListDTO;
import com.foodsave.backend.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {
    private final FavoriteService favoriteService;

    @GetMapping
    public ResponseEntity<FavoriteListDTO> getFavorites(Authentication authentication) {
        return ResponseEntity.ok(favoriteService.getFavorites(authentication.getName()));
    }

    @PostMapping("/store/{storeId}")
    public ResponseEntity<Void> addStoreFavorite(@PathVariable Long storeId, Authentication authentication) {
        favoriteService.addStoreFavorite(authentication.getName(), storeId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/store/{storeId}")
    public ResponseEntity<Void> removeStoreFavorite(@PathVariable Long storeId, Authentication authentication) {
        favoriteService.removeStoreFavorite(authentication.getName(), storeId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/product/{productId}")
    public ResponseEntity<Void> addProductFavorite(@PathVariable Long productId, Authentication authentication) {
        favoriteService.addProductFavorite(authentication.getName(), productId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/product/{productId}")
    public ResponseEntity<Void> removeProductFavorite(@PathVariable Long productId, Authentication authentication) {
        favoriteService.removeProductFavorite(authentication.getName(), productId);
        return ResponseEntity.noContent().build();
    }
}
