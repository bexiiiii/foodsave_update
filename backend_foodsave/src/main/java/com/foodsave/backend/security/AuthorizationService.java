package com.foodsave.backend.security;

import com.foodsave.backend.domain.enums.ReservationActorType;
import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.entity.Order;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.exception.AccessDeniedException;
import com.foodsave.backend.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthorizationService {

    private final SecurityUtils securityUtils;
    private final StoreRepository storeRepository;

    public boolean isSuperAdmin() {
        return securityUtils.getCurrentUser().getRole() == UserRole.SUPER_ADMIN;
    }

    public boolean isCurrentUser(Long userId) {
        return userId != null && securityUtils.getCurrentUser().getId().equals(userId);
    }

    public boolean canManageStore(Long storeId) {
        if (storeId == null) {
            return false;
        }
        if (isSuperAdmin()) {
            return true;
        }
        Long userId = securityUtils.getCurrentUser().getId();
        return storeRepository.existsByIdAndOwnerId(storeId, userId)
                || storeRepository.existsByIdAndManagerId(storeId, userId);
    }

    public void requireSuperAdmin() {
        if (!isSuperAdmin()) {
            throw new AccessDeniedException("Super administrator access is required");
        }
    }

    public void requireCanManageStore(Long storeId) {
        if (!canManageStore(storeId)) {
            throw new AccessDeniedException("You do not have access to this store");
        }
    }

    public void requireCanAccessOrder(Order order) {
        if (order == null) {
            throw new AccessDeniedException("Order access denied");
        }
        if (isSuperAdmin()) {
            return;
        }
        Long userId = securityUtils.getCurrentUser().getId();
        if (order.getUser() != null && userId.equals(order.getUser().getId())) {
            return;
        }
        if (order.getStore() != null && canManageStore(order.getStore().getId())) {
            return;
        }
        throw new AccessDeniedException("You do not have access to this order");
    }

    public ReservationActorType currentActorType() {
        UserRole role = securityUtils.getCurrentUser().getRole();
        return switch (role) {
            case SUPER_ADMIN -> ReservationActorType.ADMIN;
            case STORE_OWNER, STORE_MANAGER -> ReservationActorType.PARTNER;
            case CUSTOMER -> ReservationActorType.USER;
        };
    }
}
