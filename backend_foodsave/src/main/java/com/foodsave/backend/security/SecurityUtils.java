package com.foodsave.backend.security;

import com.foodsave.backend.entity.Store;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.exception.ResourceNotFoundException;
import com.foodsave.backend.repository.StoreRepository;
import com.foodsave.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SecurityUtils {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("No authenticated user found");
        }

        String username = authentication.getName();
        return userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + username));
    }

    public Store getCurrentStore() {
        User currentUser = getCurrentUser();
        return storeRepository.findByOwner(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found for user: " + currentUser.getEmail()));
    }

    public boolean isCurrentUser(Long userId) {
        User currentUser = getCurrentUser();
        return currentUser.getId().equals(userId);
    }

    public boolean isStoreOwner(Long storeId) {
        User currentUser = getCurrentUser();
        return storeRepository.existsByIdAndOwner(storeId, currentUser);
    }
} 