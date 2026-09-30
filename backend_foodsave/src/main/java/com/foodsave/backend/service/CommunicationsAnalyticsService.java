package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.ProductEventType;
import com.foodsave.backend.dto.communications.CommunicationsOverviewDTO;
import com.foodsave.backend.dto.communications.CommunicationsAnalyticsRangeDTO;
import com.foodsave.backend.repository.NotificationFrequencyStateRepository;
import com.foodsave.backend.repository.NotificationGroupRepository;
import com.foodsave.backend.repository.OrderRepository;
import com.foodsave.backend.repository.ProductEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunicationsAnalyticsService {

    private static final ZoneId ALMATY_ZONE = ZoneId.of("Asia/Almaty");
    // BaseEntity/JPA auditing writes LocalDateTime values in Asia/Almaty.
    private static final ZoneId EVENT_STORAGE_ZONE = ALMATY_ZONE;
    private static final int MAX_RANGE_DAYS = 366;

    private final ProductEventRepository productEventRepository;
    private final NotificationGroupRepository notificationGroupRepository;
    private final NotificationFrequencyStateRepository frequencyStateRepository;
    private final OrderRepository orderRepository;

    public CommunicationsOverviewDTO getOverview() {
        LocalDate today = LocalDate.now(ALMATY_ZONE);
        LocalDateTime start = almatyDayStartInStorageZone(today);
        LocalDateTime end = almatyDayStartInStorageZone(today.plusDays(1));

        Map<String, Long> eventCounts = productEventRepository.countByTypeBetween(start, end).stream()
                .collect(Collectors.toMap(row -> row.getEventType().name(), ProductEventRepository.EventCountProjection::getCount));

        long sent = notificationGroupRepository.countBySentAtGreaterThanEqualAndSentAtLessThan(start, end);
        long delivered = eventCounts.getOrDefault(ProductEventType.NOTIFICATION_DELIVERED.name(), 0L);
        long opened = notificationGroupRepository.countByOpenedAtGreaterThanEqualAndOpenedAtLessThan(start, end);
        long miniAppOpened = eventCounts.getOrDefault(ProductEventType.MINI_APP_OPENED.name(), 0L);
        long boxViewed = eventCounts.getOrDefault(ProductEventType.BOX_VIEWED.name(), 0L);
        long reservationsCreated = eventCounts.getOrDefault(ProductEventType.RESERVATION_CREATED.name(), 0L);
        long completed = eventCounts.getOrDefault(ProductEventType.ORDER_PICKED_UP.name(), 0L);
        long suppressed = frequencyStateRepository.findAll().stream()
                .filter(state -> state.getSuppressedUntil() != null && state.getSuppressedUntil().isAfter(LocalDateTime.now()))
                .count();
        long groupsSentToday = sent;
        long totalUsers = Math.max(1, frequencyStateRepository.count());
        BigDecimal attributedRevenue = orderRepository.findByCreatedAtBetween(start, end).stream()
                .filter(order -> order.getNotificationGroupId() != null || order.getNotificationId() != null)
                .map(order -> order.getTotal() != null ? order.getTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CommunicationsOverviewDTO(
                sent,
                delivered,
                opened,
                miniAppOpened,
                boxViewed,
                reservationsCreated,
                completed,
                sent > 0 ? (opened * 100.0 / sent) : 0.0,
                opened > 0 ? (reservationsCreated * 100.0 / opened) : 0.0,
                opened > 0 ? (completed * 100.0 / opened) : 0.0,
                suppressed,
                groupsSentToday * 1.0 / totalUsers,
                attributedRevenue,
                eventCounts
        );
    }

    public CommunicationsAnalyticsRangeDTO getRangeAnalytics(LocalDate fromDate, LocalDate toDate, String groupBy) {
        if (fromDate == null || toDate == null || toDate.isBefore(fromDate)) {
            throw new IllegalArgumentException("Invalid analytics date range");
        }
        if (fromDate.plusDays(MAX_RANGE_DAYS).isBefore(toDate)) {
            throw new IllegalArgumentException("Analytics range cannot exceed one year");
        }

        String normalizedGroupBy = "month".equalsIgnoreCase(groupBy) ? "month" : "day";
        LocalDateTime start = almatyDayStartInStorageZone(fromDate);
        LocalDateTime end = almatyDayStartInStorageZone(toDate.plusDays(1));
        Map<String, Map<ProductEventType, Long>> countsByPeriod = new TreeMap<>();

        for (ProductEventRepository.EventTimestampProjection event : productEventRepository.findEventTimestampsBetween(start, end)) {
            if (event.getCreatedAt() == null || event.getEventType() == null) continue;
            LocalDateTime almatyOccurredAt = event.getCreatedAt()
                    .atZone(EVENT_STORAGE_ZONE)
                    .withZoneSameInstant(ALMATY_ZONE)
                    .toLocalDateTime();
            String period = "month".equals(normalizedGroupBy)
                    ? YearMonth.from(almatyOccurredAt).toString()
                    : almatyOccurredAt.toLocalDate().toString();
            countsByPeriod.computeIfAbsent(period, ignored -> new EnumMap<>(ProductEventType.class))
                    .merge(event.getEventType(), 1L, Long::sum);
        }

        List<CommunicationsAnalyticsRangeDTO.Bucket> buckets = periodsBetween(fromDate, toDate, normalizedGroupBy).stream()
                .map(period -> toBucket(period, countsByPeriod.getOrDefault(period, Map.of())))
                .toList();
        Map<ProductEventType, Long> totals = new EnumMap<>(ProductEventType.class);
        countsByPeriod.values().forEach(counts -> counts.forEach((type, count) -> totals.merge(type, count, Long::sum)));

        return new CommunicationsAnalyticsRangeDTO(
                fromDate,
                toDate,
                normalizedGroupBy,
                toSummary(totals),
                buckets
        );
    }

    private CommunicationsAnalyticsRangeDTO.Bucket toBucket(String period, Map<ProductEventType, Long> counts) {
        long sent = eventCount(counts, ProductEventType.NOTIFICATION_SENT);
        long opened = eventCount(counts, ProductEventType.NOTIFICATION_OPENED);
        long miniAppOpened = eventCount(counts, ProductEventType.MINI_APP_OPENED);
        long partnerViewed = eventCount(counts, ProductEventType.PARTNER_VIEWED);
        long reservations = eventCount(counts, ProductEventType.RESERVATION_CREATED);
        long pickedUp = eventCount(counts, ProductEventType.ORDER_PICKED_UP);
        long completed = eventCount(counts, ProductEventType.ORDER_COMPLETED);
        return new CommunicationsAnalyticsRangeDTO.Bucket(
                period,
                sent,
                opened,
                miniAppOpened,
                partnerViewed,
                reservations,
                pickedUp,
                completed,
                perThousand(sent, pickedUp),
                conversion(opened, reservations),
                conversion(reservations, completed),
                conversion(reservations, pickedUp)
        );
    }

    private List<String> periodsBetween(LocalDate fromDate, LocalDate toDate, String groupBy) {
        List<String> periods = new ArrayList<>();
        if ("month".equals(groupBy)) {
            YearMonth current = YearMonth.from(fromDate);
            YearMonth last = YearMonth.from(toDate);
            while (!current.isAfter(last)) {
                periods.add(current.toString());
                current = current.plusMonths(1);
            }
            return periods;
        }
        LocalDate current = fromDate;
        while (!current.isAfter(toDate)) {
            periods.add(current.toString());
            current = current.plusDays(1);
        }
        return periods;
    }

    private CommunicationsAnalyticsRangeDTO.Summary toSummary(Map<ProductEventType, Long> counts) {
        long sent = eventCount(counts, ProductEventType.NOTIFICATION_SENT);
        long opened = eventCount(counts, ProductEventType.NOTIFICATION_OPENED);
        long miniAppOpened = eventCount(counts, ProductEventType.MINI_APP_OPENED);
        long partnerViewed = eventCount(counts, ProductEventType.PARTNER_VIEWED);
        long boxViewed = eventCount(counts, ProductEventType.BOX_VIEWED);
        long reservations = eventCount(counts, ProductEventType.RESERVATION_CREATED);
        long pickedUp = eventCount(counts, ProductEventType.ORDER_PICKED_UP);
        long completed = eventCount(counts, ProductEventType.ORDER_COMPLETED);
        return new CommunicationsAnalyticsRangeDTO.Summary(
                sent,
                opened,
                miniAppOpened,
                partnerViewed,
                boxViewed,
                reservations,
                pickedUp,
                completed,
                perThousand(sent, pickedUp),
                conversion(opened, reservations),
                conversion(reservations, completed),
                conversion(reservations, pickedUp)
        );
    }

    private long eventCount(Map<ProductEventType, Long> counts, ProductEventType type) {
        return counts.getOrDefault(type, 0L);
    }

    private LocalDateTime almatyDayStartInStorageZone(LocalDate date) {
        return date.atStartOfDay(ALMATY_ZONE)
                .withZoneSameInstant(EVENT_STORAGE_ZONE)
                .toLocalDateTime();
    }

    private double conversion(long denominator, long numerator) {
        return denominator > 0 ? numerator * 100.0 / denominator : 0.0;
    }

    private double perThousand(long delivered, long pickedUp) {
        return delivered > 0 ? pickedUp * 1000.0 / delivered : 0.0;
    }
}
