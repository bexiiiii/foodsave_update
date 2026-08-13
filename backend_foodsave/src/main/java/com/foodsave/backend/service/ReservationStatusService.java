package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.ProductEventType;
import com.foodsave.backend.domain.enums.ReservationActorType;
import com.foodsave.backend.domain.enums.ReservationCancellationReason;
import com.foodsave.backend.dto.OrderStatusUpdateRequest;
import com.foodsave.backend.dto.analytics.ProductEventRequest;
import com.foodsave.backend.entity.Order;
import com.foodsave.backend.entity.OrderStatusHistory;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.repository.OrderRepository;
import com.foodsave.backend.repository.OrderStatusHistoryRepository;
import com.foodsave.backend.repository.UserRepository;
import com.foodsave.backend.util.SecurityUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ReservationStatusService {

    private final OrderStatusHistoryRepository historyRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final SecurityUtil securityUtil;
    private final ProductEventService productEventService;

    @Transactional
    public Order changeStatus(Long orderId, OrderStatusUpdateRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
        return changeStatus(order, request);
    }

    @Transactional
    public Order changeStatus(Order order, OrderStatusUpdateRequest request) {
        if (request == null || request.status() == null) {
            throw new IllegalArgumentException("Status is required");
        }
        validateCancellation(request);

        OrderStatus previous = order.getStatus();
        OrderStatus next = request.status();
        if (previous == next) {
            return order;
        }

        order.setStatus(next);
        order.setStatusActorType(request.actorType() != null ? request.actorType() : ReservationActorType.SYSTEM);
        order.setStatusChangedByUser(resolveActorUser());
        applyStatusTimestamp(order, next);
        if (isCancellation(next)) {
            order.setCancellationReason(request.cancellationReason());
            order.setCancellationComment(cleanComment(request.cancellationComment()));
        }

        Order saved = orderRepository.save(order);
        saveHistory(saved, previous, request);
        trackStatusEvent(saved, next);
        return saved;
    }

    public void recordInitialStatus(Order order, ReservationActorType actorType) {
        if (order == null || order.getId() == null) return;
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrder(order);
        history.setPreviousStatus(null);
        history.setNewStatus(order.getStatus());
        history.setActorType(actorType != null ? actorType : ReservationActorType.SYSTEM);
        history.setActorUser(resolveActorUser());
        historyRepository.save(history);
    }

    private void validateCancellation(OrderStatusUpdateRequest request) {
        if (!isCancellation(request.status())) return;
        if (request.cancellationReason() == null) {
            throw new IllegalArgumentException("Cancellation reason is required");
        }
        if (request.cancellationReason() == ReservationCancellationReason.OTHER
                && (request.cancellationComment() == null || request.cancellationComment().isBlank())) {
            throw new IllegalArgumentException("Cancellation comment is required for OTHER reason");
        }
    }

    private boolean isCancellation(OrderStatus status) {
        return status == OrderStatus.CANCELLED
                || status == OrderStatus.CANCELLED_BY_USER
                || status == OrderStatus.CANCELLED_BY_PARTNER
                || status == OrderStatus.EXPIRED
                || status == OrderStatus.NO_SHOW
                || status == OrderStatus.REJECTED;
    }

    private void applyStatusTimestamp(Order order, OrderStatus status) {
        LocalDateTime now = LocalDateTime.now();
        switch (status) {
            case CONFIRMED -> order.setConfirmedAt(now);
            case READY_FOR_PICKUP -> order.setReadyForPickupAt(now);
            case PICKED_UP -> order.setPickedUpAt(now);
            case COMPLETED, DELIVERED -> order.setCompletedAt(now);
            case CANCELLED, CANCELLED_BY_USER, CANCELLED_BY_PARTNER -> order.setCancelledAt(now);
            case EXPIRED -> order.setExpiredAt(now);
            case NO_SHOW -> order.setNoShowAt(now);
            case REJECTED -> order.setRejectedAt(now);
            default -> {
            }
        }
    }

    private void saveHistory(Order order, OrderStatus previous, OrderStatusUpdateRequest request) {
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrder(order);
        history.setPreviousStatus(previous);
        history.setNewStatus(request.status());
        history.setActorType(request.actorType() != null ? request.actorType() : ReservationActorType.SYSTEM);
        history.setActorUser(resolveActorUser());
        history.setCancellationReason(request.cancellationReason());
        history.setCancellationComment(cleanComment(request.cancellationComment()));
        historyRepository.save(history);
    }

    private User resolveActorUser() {
        Long currentUserId = securityUtil.getCurrentUserId();
        return currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null;
    }

    private String cleanComment(String comment) {
        if (comment == null) return null;
        String trimmed = comment.trim();
        return trimmed.length() <= 1000 ? trimmed : trimmed.substring(0, 1000);
    }

    private void trackStatusEvent(Order order, OrderStatus status) {
        ProductEventType type = switch (status) {
            case CONFIRMED -> ProductEventType.RESERVATION_CONFIRMED;
            case REJECTED -> ProductEventType.RESERVATION_REJECTED;
            case CANCELLED_BY_USER -> ProductEventType.RESERVATION_CANCELLED_BY_USER;
            case CANCELLED, CANCELLED_BY_PARTNER -> ProductEventType.RESERVATION_CANCELLED_BY_PARTNER;
            case EXPIRED -> ProductEventType.RESERVATION_EXPIRED;
            case PICKED_UP -> ProductEventType.ORDER_PICKED_UP;
            case COMPLETED, DELIVERED -> ProductEventType.ORDER_COMPLETED;
            case NO_SHOW -> ProductEventType.CUSTOMER_NO_SHOW;
            default -> null;
        };
        if (type == null) return;
        productEventService.trackAsync(new ProductEventRequest(
                type, null, order.getUser() != null ? order.getUser().getTelegramUserId() : null,
                order.getId(), order.getStore() != null ? order.getStore().getId() : null,
                order.getStore() != null ? order.getStore().getId() : null,
                order.getItems() != null && !order.getItems().isEmpty() && order.getItems().get(0).getProduct() != null
                        ? order.getItems().get(0).getProduct().getId() : null,
                null, null, null, null, order.getCampaignId(), order.getTelegramPostId(),
                order.getNotificationId(), order.getNotificationGroupId(), null, order.getStartParam(),
                null, "backend", null, null, null, null, null, null
        ));
    }
}
