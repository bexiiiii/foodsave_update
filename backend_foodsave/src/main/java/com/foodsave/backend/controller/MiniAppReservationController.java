package com.foodsave.backend.controller;

import com.foodsave.backend.dto.OrderDTO;
import com.foodsave.backend.dto.miniapp.MiniAppReservationRequest;
import com.foodsave.backend.service.MiniAppReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/miniapp/reservations")
@RequiredArgsConstructor
@Slf4j
public class MiniAppReservationController {

    private final MiniAppReservationService reservationService;

    @PostMapping
    public ResponseEntity<OrderDTO> createReservation(@Valid @RequestBody MiniAppReservationRequest request) {
        log.info("Received reservation request: productId={}, quantity={}", 
            request != null ? request.productId() : null, 
            request != null ? request.quantity() : null);
        
        try {
            OrderDTO order = reservationService.createReservation(request);
            log.info("Reservation created successfully: orderId={}, orderNumber={}", 
                order.getId(), order.getOrderNumber());
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            log.error("Failed to create reservation", e);
            throw e;
        }
    }
}
