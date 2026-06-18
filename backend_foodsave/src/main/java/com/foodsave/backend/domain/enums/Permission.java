package com.foodsave.backend.domain.enums;

public enum Permission {
    // User permissions
    USER_CREATE("user:create"),
    USER_READ("user:read"),
    USER_UPDATE("user:update"),
    USER_DELETE("user:delete"),
    USER_MANAGE("user:manage"),
    
    // Store permissions
    STORE_CREATE("store:create"),
    STORE_READ("store:read"),
    STORE_UPDATE("store:update"),
    STORE_DELETE("store:delete"),
    STORE_MANAGE("store:manage"),
    
    // Product permissions
    PRODUCT_CREATE("product:create"),
    PRODUCT_READ("product:read"),
    PRODUCT_UPDATE("product:update"),
    PRODUCT_DELETE("product:delete"),
    PRODUCT_MANAGE("product:manage"),
    
    // Order permissions
    ORDER_CREATE("order:create"),
    ORDER_READ("order:read"),
    ORDER_UPDATE("order:update"),
    ORDER_DELETE("order:delete"),
    ORDER_MANAGE("order:manage"),
    
    // Analytics permissions
    ANALYTICS_READ("analytics:read"),
    ANALYTICS_EXPORT("analytics:export"),
    ANALYTICS_MANAGE("analytics:manage"),
    
    // Review permissions
    REVIEW_CREATE("review:create"),
    REVIEW_READ("review:read"),
    REVIEW_UPDATE("review:update"),
    REVIEW_DELETE("review:delete"),
    REVIEW_MANAGE("review:manage"),
    
    // Discount permissions
    DISCOUNT_CREATE("discount:create"),
    DISCOUNT_READ("discount:read"),
    DISCOUNT_UPDATE("discount:update"),
    DISCOUNT_DELETE("discount:delete"),
    DISCOUNT_MANAGE("discount:manage"),
    
    // Category permissions
    CATEGORY_CREATE("category:create"),
    CATEGORY_READ("category:read"),
    CATEGORY_UPDATE("category:update"),
    CATEGORY_DELETE("category:delete"),
    CATEGORY_MANAGE("category:manage"),

    // Role permissions
    ROLE_CREATE("role:create"),
    ROLE_READ("role:read"),
    ROLE_UPDATE("role:update"),
    ROLE_DELETE("role:delete"),
    ROLE_MANAGE("role:manage"),

    // Settings permissions
    SETTINGS_READ("settings:read"),
    SETTINGS_UPDATE("settings:update"),
    SETTINGS_MANAGE("settings:manage"),

    // Notification permissions
    NOTIFICATION_CREATE("notification:create"),
    NOTIFICATION_READ("notification:read"),
    NOTIFICATION_UPDATE("notification:update"),
    NOTIFICATION_DELETE("notification:delete"),
    NOTIFICATION_MANAGE("notification:manage");

    private final String value;

    Permission(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
} 