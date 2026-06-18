package com.foodsave.backend.domain.enums;

import java.util.Set;
import java.util.HashSet;

public enum Role {
    SUPER_ADMIN(new HashSet<>(Set.of(
        Permission.values()
    ))),

    ADMIN(new HashSet<>(Set.of(
        // User permissions
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_MANAGE,

        // Store permissions
        Permission.STORE_CREATE,
        Permission.STORE_READ,
        Permission.STORE_UPDATE,
        Permission.STORE_DELETE,
        Permission.STORE_MANAGE,

        // Product permissions
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_READ,
        Permission.PRODUCT_UPDATE,
        Permission.PRODUCT_DELETE,
        Permission.PRODUCT_MANAGE,

        // Order permissions
        Permission.ORDER_READ,
        Permission.ORDER_UPDATE,
        Permission.ORDER_MANAGE,

        // Analytics permissions
        Permission.ANALYTICS_READ,
        Permission.ANALYTICS_MANAGE,

        // Review permissions
        Permission.REVIEW_READ,
        Permission.REVIEW_UPDATE,
        Permission.REVIEW_DELETE,
        Permission.REVIEW_MANAGE,

        // Discount permissions
        Permission.DISCOUNT_CREATE,
        Permission.DISCOUNT_READ,
        Permission.DISCOUNT_UPDATE,
        Permission.DISCOUNT_DELETE,
        Permission.DISCOUNT_MANAGE,

        // Category permissions
        Permission.CATEGORY_CREATE,
        Permission.CATEGORY_READ,
        Permission.CATEGORY_UPDATE,
        Permission.CATEGORY_DELETE,
        Permission.CATEGORY_MANAGE
    ))),

    STORE_OWNER(new HashSet<>(Set.of(
        // Store permissions
        Permission.STORE_READ,
        Permission.STORE_UPDATE,

        // Product permissions
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_READ,
        Permission.PRODUCT_UPDATE,
        Permission.PRODUCT_DELETE,

        // Order permissions
        Permission.ORDER_READ,
        Permission.ORDER_UPDATE,

        // Analytics permissions
        Permission.ANALYTICS_READ,

        // Review permissions
        Permission.REVIEW_READ,

        // Discount permissions
        Permission.DISCOUNT_CREATE,
        Permission.DISCOUNT_READ,
        Permission.DISCOUNT_UPDATE,
        Permission.DISCOUNT_DELETE,

        // Category permissions
        Permission.CATEGORY_READ
    ))),

    CUSTOMER(new HashSet<>(Set.of(
        // Store permissions
        Permission.STORE_READ,

        // Product permissions
        Permission.PRODUCT_READ,

        // Order permissions
        Permission.ORDER_CREATE,
        Permission.ORDER_READ,

        // Review permissions
        Permission.REVIEW_CREATE,
        Permission.REVIEW_READ,
        Permission.REVIEW_UPDATE,
        Permission.REVIEW_DELETE
    )));

    private final Set<Permission> permissions;

    Role(Set<Permission> permissions) {
        this.permissions = permissions;
    }

    public Set<Permission> getPermissions() {
        return permissions;
    }
} 