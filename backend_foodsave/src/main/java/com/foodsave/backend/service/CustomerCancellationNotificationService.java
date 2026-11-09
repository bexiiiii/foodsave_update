package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.ReservationActorType;
import com.foodsave.backend.dto.NotificationDTO;
import com.foodsave.backend.entity.Notification;
import com.foodsave.backend.entity.Order;
import com.foodsave.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class CustomerCancellationNotificationService {
    public static final String TYPE = "ORDER_CANCELLED_BY_STAFF";
    public static final String MESSAGE = "Ваш заказ отменили. Чтобы узнать почему напишите нам в поддержку";
    private final NotificationRepository notifications;
    private final RealtimeEventService realtime;

    public static boolean shouldNotify(Order order, OrderStatus previous, OrderStatus current) {
        if (order == null || order.getUser() == null || previous == current || isTerminalCancellation(previous)) return false;
        ReservationActorType actor = order.getStatusActorType();
        return (actor == ReservationActorType.ADMIN || actor == ReservationActorType.PARTNER)
                && (current == OrderStatus.CANCELLED || current == OrderStatus.CANCELLED_BY_PARTNER || current == OrderStatus.REJECTED);
    }

    private static boolean isTerminalCancellation(OrderStatus status) {
        return status == OrderStatus.CANCELLED || status == OrderStatus.CANCELLED_BY_USER
                || status == OrderStatus.CANCELLED_BY_PARTNER || status == OrderStatus.REJECTED
                || status == OrderStatus.EXPIRED || status == OrderStatus.NO_SHOW;
    }

    // Called inside the locked order transition: saving the message and cancelling the order are atomic.
    @Transactional
    public void record(Order order, OrderStatus previous, OrderStatus current) {
        if (!shouldNotify(order, previous, current)) return;
        Notification notification = new Notification();
        String number = order.getOrderNumber() != null ? String.valueOf(order.getOrderNumber()) : String.valueOf(order.getId());
        notification.setTitle("Заказ #" + number + " отменён");
        notification.setMessage(MESSAGE);
        notification.setType(TYPE);
        notification.setUser(order.getUser());
        notification.setRead(false);
        NotificationDTO dto = NotificationDTO.fromEntity(notifications.save(notification));
        Long userId = order.getUser().getId();
        Runnable publish = () -> realtime.publish(userId, "notification-created", dto);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { publish.run(); }
            });
        } else {
            publish.run();
        }
    }
}
