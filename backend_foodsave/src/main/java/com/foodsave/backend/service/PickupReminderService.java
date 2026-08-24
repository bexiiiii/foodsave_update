package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.StoreStatus;
import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.entity.Order;
import com.foodsave.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class PickupReminderService {

    private static final Set<OrderStatus> ACTIVE_PICKUP_STATUSES = Set.of(
            OrderStatus.CREATED,
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY_FOR_PICKUP
    );

    private final OrderRepository orderRepository;
    private final TelegramOrderNotificationService telegramOrderNotificationService;

    @Value("${orders.pickup-reminder.delay-minutes:120}")
    private long reminderDelayMinutes;

    @Value("${orders.pickup-reminder.batch-size:50}")
    private int batchSize;

    @Value("${orders.pickup-reminder.max-age-minutes:720}")
    private long maxAgeMinutes;

    @Value("${orders.pickup-reminder.excluded-chat-ids:}")
    private String excludedChatIds;

    @Scheduled(fixedDelayString = "${orders.pickup-reminder.scan-delay-ms:300000}")
    @Transactional
    public void sendDuePickupReminders() {
        if (reminderDelayMinutes <= 0 || batchSize <= 0) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusMinutes(reminderDelayMinutes);
        LocalDateTime oldestCreatedAt = now.minusMinutes(Math.max(maxAgeMinutes, reminderDelayMinutes));
        Pageable pageable = PageRequest.of(0, Math.min(batchSize, 100));
        var candidates = orderRepository.findPickupReminderCandidates(
                ACTIVE_PICKUP_STATUSES,
                oldestCreatedAt,
                cutoff,
                UserRole.CUSTOMER,
                StoreStatus.ACTIVE,
                pageable
        );
        if (candidates.isEmpty()) {
            return;
        }

        Set<Long> excludedChatIdSet = parseExcludedChatIds();
        Map<Long, List<Order>> ordersByUser = new LinkedHashMap<>();
        List<Order> skippedOrders = new ArrayList<>();
        for (Order order : candidates.getContent()) {
            if (order.getUser() == null || order.getUser().getId() == null) {
                skippedOrders.add(order);
                continue;
            }
            Long telegramUserId = order.getUser().getTelegramUserId();
            if (telegramUserId == null || excludedChatIdSet.contains(telegramUserId)) {
                skippedOrders.add(order);
                continue;
            }
            ordersByUser.computeIfAbsent(order.getUser().getId(), ignored -> new ArrayList<>()).add(order);
        }

        int sent = 0;
        int skipped = skippedOrders.size();
        LocalDateTime processedAt = LocalDateTime.now();
        skippedOrders.forEach(order -> order.setPickupReminderSentAt(processedAt));

        for (List<Order> userOrders : ordersByUser.values()) {
            try {
                TelegramOrderNotificationService.PickupReminderResult result =
                        telegramOrderNotificationService.notifyPickupReminders(userOrders);
                if (result == TelegramOrderNotificationService.PickupReminderResult.SENT
                        || result == TelegramOrderNotificationService.PickupReminderResult.SKIPPED) {
                    userOrders.forEach(order -> order.setPickupReminderSentAt(processedAt));
                }
                if (result == TelegramOrderNotificationService.PickupReminderResult.SENT) {
                    sent += userOrders.size();
                } else if (result == TelegramOrderNotificationService.PickupReminderResult.SKIPPED) {
                    skipped += userOrders.size();
                }
            } catch (Exception e) {
                log.warn("Failed to send pickup reminder for {} order(s)", userOrders.size(), e);
            }
        }

        log.info("Pickup reminder scan completed: candidates={}, userGroups={}, sent={}, skipped={}",
                candidates.getNumberOfElements(), ordersByUser.size(), sent, skipped);
    }

    private Set<Long> parseExcludedChatIds() {
        if (excludedChatIds == null || excludedChatIds.isBlank()) {
            return Set.of();
        }

        Set<Long> chatIds = new java.util.HashSet<>();
        for (String token : excludedChatIds.split("[,;\\s]+")) {
            if (token == null || token.isBlank()) {
                continue;
            }
            try {
                chatIds.add(Long.parseLong(token.trim()));
            } catch (NumberFormatException e) {
                log.warn("Invalid pickup reminder excluded chat id configured: {}", token);
            }
        }
        return chatIds;
    }
}
