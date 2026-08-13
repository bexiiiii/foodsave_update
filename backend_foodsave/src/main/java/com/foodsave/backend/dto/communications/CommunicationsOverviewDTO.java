package com.foodsave.backend.dto.communications;

import java.math.BigDecimal;
import java.util.Map;

public record CommunicationsOverviewDTO(
        long sentToday,
        long deliveredToday,
        long openedToday,
        long miniAppOpenedToday,
        long boxViewedToday,
        long reservationsCreatedToday,
        long completedOrdersToday,
        double ctr,
        double notificationToReservationConversion,
        double notificationToCompletedConversion,
        long suppressedUsers,
        double averageMessagesPerUser,
        BigDecimal attributedRevenue,
        Map<String, Long> eventCounts
) {
}
