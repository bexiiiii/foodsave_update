package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.OrderStatus;
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

    @Scheduled(fixedDelayString = "${orders.pickup-reminder.scan-delay-ms:300000}")
    @Transactional
    public void sendDuePickupReminders() {
        if (reminderDelayMinutes <= 0 || batchSize <= 0) {
            return;
        }

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(reminderDelayMinutes);
        Pageable pageable = PageRequest.of(0, Math.min(batchSize, 100));
        var candidates = orderRepository.findPickupReminderCandidates(ACTIVE_PICKUP_STATUSES, cutoff, pageable);
        if (candidates.isEmpty()) {
            return;
        }

        int sent = 0;
        int skipped = 0;
        for (Order order : candidates.getContent()) {
            try {
                TelegramOrderNotificationService.PickupReminderResult result =
                        telegramOrderNotificationService.notifyPickupReminder(order);
                if (result == TelegramOrderNotificationService.PickupReminderResult.SENT
                        || result == TelegramOrderNotificationService.PickupReminderResult.SKIPPED) {
                    order.setPickupReminderSentAt(LocalDateTime.now());
                }
                if (result == TelegramOrderNotificationService.PickupReminderResult.SENT) {
                    sent++;
                } else if (result == TelegramOrderNotificationService.PickupReminderResult.SKIPPED) {
                    skipped++;
                }
            } catch (Exception e) {
                log.warn("Failed to send pickup reminder for order {}", order.getId(), e);
            }
        }

        log.info("Pickup reminder scan completed: candidates={}, sent={}, skipped={}",
                candidates.getNumberOfElements(), sent, skipped);
    }
}
