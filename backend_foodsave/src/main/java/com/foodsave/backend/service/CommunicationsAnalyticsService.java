package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.NotificationGroupStatus;
import com.foodsave.backend.domain.enums.ProductEventType;
import com.foodsave.backend.dto.communications.CommunicationsOverviewDTO;
import com.foodsave.backend.repository.NotificationFrequencyStateRepository;
import com.foodsave.backend.repository.NotificationGroupRepository;
import com.foodsave.backend.repository.OrderRepository;
import com.foodsave.backend.repository.ProductEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommunicationsAnalyticsService {

    private final ProductEventRepository productEventRepository;
    private final NotificationGroupRepository notificationGroupRepository;
    private final NotificationFrequencyStateRepository frequencyStateRepository;
    private final OrderRepository orderRepository;

    public CommunicationsOverviewDTO getOverview() {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();

        Map<String, Long> eventCounts = productEventRepository.countByTypeBetween(start, end).stream()
                .collect(Collectors.toMap(row -> row.getEventType().name(), ProductEventRepository.EventCountProjection::getCount));

        long sent = eventCounts.getOrDefault(ProductEventType.NOTIFICATION_SENT.name(), 0L);
        long delivered = eventCounts.getOrDefault(ProductEventType.NOTIFICATION_DELIVERED.name(), 0L);
        long opened = eventCounts.getOrDefault(ProductEventType.NOTIFICATION_OPENED.name(), 0L);
        long miniAppOpened = eventCounts.getOrDefault(ProductEventType.MINI_APP_OPENED.name(), 0L);
        long boxViewed = eventCounts.getOrDefault(ProductEventType.BOX_VIEWED.name(), 0L);
        long reservationsCreated = eventCounts.getOrDefault(ProductEventType.RESERVATION_CREATED.name(), 0L);
        long completed = eventCounts.getOrDefault(ProductEventType.ORDER_COMPLETED.name(), 0L);
        long suppressed = frequencyStateRepository.findAll().stream()
                .filter(state -> state.getSuppressedUntil() != null && state.getSuppressedUntil().isAfter(LocalDateTime.now()))
                .count();
        long groupsSentToday = notificationGroupRepository.countByStatusAndCreatedAtBetween(NotificationGroupStatus.SENT, start, end);
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
}
