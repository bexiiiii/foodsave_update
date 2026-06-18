package com.foodsave.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsDTO {
    private Long storeId;
    private String storeName;
    private LocalDate date;
    private Integer totalOrders;
    private Integer completedOrders;
    private Integer canceledOrders;
    private BigDecimal totalRevenue;
    private BigDecimal completedRevenue;
    private BigDecimal canceledRevenue;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailySalesAnalytics {
        private Long storeId;
        private String storeName;
        private LocalDate date;
        private Integer totalOrders;
        private Integer completedOrders;
        private Integer canceledOrders;
        private BigDecimal totalRevenue;
        private BigDecimal completedRevenue;
        private BigDecimal canceledRevenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailySalesOrderDetail {
        private Long orderId;
        private String orderNumber;
        private LocalDate orderDate;
        private LocalDateTime orderCreatedAt;
        private String orderStatus;
        private Long buyerId;
        private String buyerName;
        private String buyerPhone;
        private Long buyerTelegramUserId;
        private String buyerTelegramUsername;
        private String contactPhone;
        private String orderSummary;
        private String buyerSummary;
        private String telegramSummary;
        private String storeSummary;
        private String addressSummary;
        private String detailSummary;
        private Long storeId;
        private String storeName;
        private String storeAddress;
        private String deliveryAddress;
        private BigDecimal orderTotal;
        private List<DailySalesOrderItem> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailySalesOrderItem {
        private Long productId;
        private String productName;
        private String productDescription;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
        private String itemSummary;
    }
} 
