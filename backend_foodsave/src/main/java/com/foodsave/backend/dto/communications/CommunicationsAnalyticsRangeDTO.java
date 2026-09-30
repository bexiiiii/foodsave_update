package com.foodsave.backend.dto.communications;

import java.time.LocalDate;
import java.util.List;

/** Calendar event totals and ratios; these are not sent-cohort or causal conversion metrics. */
public record CommunicationsAnalyticsRangeDTO(LocalDate fromDate, LocalDate toDate, String groupBy,
                                             Summary summary, List<Bucket> buckets) {
    public record Summary(long notificationSent, long notificationOpened, long miniAppOpened,
                          long partnerViewed, long boxViewed, long reservationsCreated,
                          long pickedUpOrders, long completedOrders, double pickupConversionPerThousand,
                          double notificationToReservationConversion, double reservationToCompletionConversion,
                          double reservationToPickupEventRatio) { }

    public record Bucket(String period, long notificationSent, long notificationOpened, long miniAppOpened,
                         long partnerViewed, long reservationsCreated, long pickedUpOrders, long completedOrders,
                         double pickupConversionPerThousand, double notificationToReservationConversion,
                         double reservationToCompletionConversion, double reservationToPickupEventRatio) { }
}
