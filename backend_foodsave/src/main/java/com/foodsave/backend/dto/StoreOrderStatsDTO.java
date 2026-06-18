package com.foodsave.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreOrderStatsDTO {
    private Long storeId;
    private String storeName;
    private String storeLogo;
    private Long totalOrders;
    private Long successfulOrders;
    private Long failedOrders;
    private Long pendingOrders;
    private Long confirmedOrders;
    private Long preparingOrders;
    private Long readyOrders;
    private Long pickedUpOrders;
    private Long deliveredOrders;
    private Long cancelledOrders;
}
