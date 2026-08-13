package com.foodsave.backend.domain.enums;

public enum OrderStatus {
    CREATED("Created"),
    PENDING("Pending"),
    CONFIRMED("Confirmed"),
    PREPARING("Preparing"),
    READY_FOR_PICKUP("Ready for Pickup"),
    PICKED_UP("Picked Up"),
    COMPLETED("Completed"),
    OUT_FOR_DELIVERY("Out for Delivery"),
    DELIVERED("Delivered"),
    CANCELLED("Cancelled"),
    CANCELLED_BY_USER("Cancelled by User"),
    CANCELLED_BY_PARTNER("Cancelled by Partner"),
    EXPIRED("Expired"),
    NO_SHOW("No Show"),
    REJECTED("Rejected"),
    REFUNDED("Refunded");

    private final String value;

    OrderStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
} 
