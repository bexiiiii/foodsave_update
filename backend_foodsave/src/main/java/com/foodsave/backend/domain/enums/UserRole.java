package com.foodsave.backend.domain.enums;

public enum UserRole {
    SUPER_ADMIN("SUPER_ADMIN"),
    STORE_MANAGER("STORE_MANAGER"),
    STORE_OWNER("STORE_OWNER"),
    CUSTOMER("CUSTOMER");

    private final String value;

    UserRole(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
} 