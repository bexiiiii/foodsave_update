package com.foodsave.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
public class SystemHealthDTO {
    private Long id;

    @NotNull(message = "Timestamp is required")
    private LocalDateTime timestamp;

    private String status;
    private double cpuUsage;
    private double memoryUsage;
    private double diskUsage;
    private int activeUsers;
    private int activeStores;
    private int activeProducts;
    private int pendingOrders;
    private Map<String, String> serviceStatus;
    private Map<String, Long> responseTimes;
    private Map<String, Integer> errorCounts;
    private Map<String, String> databaseStatus;
    private Map<String, String> cacheStatus;
    private Map<String, String> queueStatus;
} 