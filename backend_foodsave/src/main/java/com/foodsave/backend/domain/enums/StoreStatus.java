package com.foodsave.backend.domain.enums;

public enum StoreStatus {
    ACTIVE("ACTIVE"),
    INACTIVE("INACTIVE"),
    SUSPENDED("SUSPENDED"),
    PENDING("PENDING"),
    PENDING_APPROVAL("PENDING_APPROVAL");

    private final String value;

    StoreStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
} 