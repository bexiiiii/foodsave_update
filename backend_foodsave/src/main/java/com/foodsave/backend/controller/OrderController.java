package com.foodsave.backend.controller;

import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.Permission;
import com.foodsave.backend.dto.OrderDTO;
import com.foodsave.backend.dto.OrderStatsDTO;
import com.foodsave.backend.dto.OrderStatusUpdateRequest;
import com.foodsave.backend.dto.StoreOrderStatsDTO;
import com.foodsave.backend.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    // @RequirePermission(Permission.ORDER_READ)
    public ResponseEntity<List<OrderDTO>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/{id}")
    // @RequirePermission(Permission.ORDER_READ)
    public ResponseEntity<OrderDTO> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @GetMapping("/my-orders")
    // @RequirePermission(Permission.ORDER_READ)
    public ResponseEntity<List<OrderDTO>> getMyOrders() {
        return ResponseEntity.ok(orderService.getCurrentUserOrders());
    }

    @GetMapping("/store-orders")
    // @RequirePermission(Permission.ORDER_READ)
    public ResponseEntity<List<OrderDTO>> getStoreOrders() {
        return ResponseEntity.ok(orderService.getCurrentStoreOrders());
    }

    // Новые эндпоинты для статистики
    @GetMapping("/stats")
    // @RequirePermission(Permission.ANALYTICS_READ)
    public ResponseEntity<OrderStatsDTO> getOrdersStats() {
        return ResponseEntity.ok(orderService.getOrdersStats());
    }

    @GetMapping("/stats/by-store")
    // @RequirePermission(Permission.ANALYTICS_READ)
    public ResponseEntity<List<StoreOrderStatsDTO>> getOrdersStatsByStore() {
        return ResponseEntity.ok(orderService.getOrdersStatsByStore());
    }

    @GetMapping("/stats/my-store")
    // @RequirePermission(Permission.ORDER_READ)
    public ResponseEntity<OrderStatsDTO> getMyStoreOrdersStats() {
        return ResponseEntity.ok(orderService.getMyStoreOrdersStats());
    }

    @PostMapping
    // @RequirePermission(Permission.ORDER_CREATE)
    public ResponseEntity<OrderDTO> createOrder(@RequestBody OrderDTO orderDTO) {
        return ResponseEntity.ok(orderService.createOrder(orderDTO));
    }

    @PutMapping("/{id}")
    // @RequirePermission(Permission.ORDER_UPDATE)
    public ResponseEntity<OrderDTO> updateOrder(@PathVariable Long id, @RequestBody OrderDTO orderDTO) {
        return ResponseEntity.ok(orderService.updateOrder(id, orderDTO));
    }

    @DeleteMapping("/{id}")
    // @RequirePermission(Permission.ORDER_DELETE)
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/status")
    // @RequirePermission(Permission.ORDER_UPDATE)
    public ResponseEntity<OrderDTO> updateOrderStatus(@PathVariable Long id, @RequestBody Object payload) {
        if (payload instanceof String rawStatus) {
            return ResponseEntity.ok(orderService.updateOrderStatus(id, OrderStatus.valueOf(rawStatus.replace("\"", ""))));
        }
        if (payload instanceof java.util.Map<?, ?> map) {
            OrderStatus status = OrderStatus.valueOf(String.valueOf(map.get("status")));
            com.foodsave.backend.domain.enums.ReservationActorType actorType = map.get("actorType") != null
                    ? com.foodsave.backend.domain.enums.ReservationActorType.valueOf(String.valueOf(map.get("actorType")))
                    : com.foodsave.backend.domain.enums.ReservationActorType.ADMIN;
            com.foodsave.backend.domain.enums.ReservationCancellationReason reason = map.get("cancellationReason") != null
                    ? com.foodsave.backend.domain.enums.ReservationCancellationReason.valueOf(String.valueOf(map.get("cancellationReason")))
                    : null;
            String comment = map.get("cancellationComment") != null ? String.valueOf(map.get("cancellationComment")) : null;
            return ResponseEntity.ok(orderService.updateOrderStatus(id, new OrderStatusUpdateRequest(status, actorType, reason, comment)));
        }
        throw new IllegalArgumentException("Unsupported status payload");
    }
}
