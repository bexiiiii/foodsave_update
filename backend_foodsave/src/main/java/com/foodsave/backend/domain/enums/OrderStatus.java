package com.foodsave.backend.domain.enums;

public enum OrderStatus {
    PENDING("Pending"),
    CONFIRMED("Confirmed"),
    PREPARING("Preparing"),
    READY_FOR_PICKUP("Ready for Pickup"),
    OUT_FOR_DELIVERY("Out for Delivery"),
    DELIVERED("Delivered"),
    CANCELLED("Cancelled"),
    REFUNDED("Refunded");

    private final String value;

    OrderStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
} 