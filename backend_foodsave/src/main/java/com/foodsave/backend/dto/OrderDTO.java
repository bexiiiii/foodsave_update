package com.foodsave.backend.dto;

import com.foodsave.backend.entity.Order;
import com.foodsave.backend.domain.enums.DeliveryType;
import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.PaymentMethod;
import com.foodsave.backend.domain.enums.PaymentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDTO {
    private Long id;
    private Long userId;
    private Long storeId;
    private String orderNumber;
    private OrderStatus status;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private String contactPhone;
    private String deliveryAddress;
    private String deliveryNotes;
    private BigDecimal subtotal;
    private BigDecimal totalDiscount;
    private BigDecimal total;
    private List<OrderItemDTO> items;
    private String storeName;
    private String storeLogo;
    private String storeAddress;
    private String storePhone;
    private String userName;
    private String userEmail;
    private String userPhone;
    private String userAddress;
    private DeliveryType deliveryType;
    private String trackingNumber;
    private String estimatedDeliveryTime;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static OrderDTO fromEntity(Order order) {
        return OrderDTO.builder()
                .id(order.getId())
                .userId(order.getUser().getId())
                .userName(order.getUser().getFirstName() + " " + order.getUser().getLastName())
                .userEmail(order.getUser().getEmail())
                .userPhone(order.getUser().getPhone())
                .userAddress(order.getUser().getAddress())
                .storeId(order.getStore().getId())
                .storeName(order.getStore().getName())
                .storeLogo(order.getStore().getLogo())
                .storeAddress(order.getStore().getAddress())
                .storePhone(order.getStore().getPhone())
                .orderNumber(order.getOrderNumber())
                .items(order.getItems().stream()
                        .map(OrderItemDTO::fromEntity)
                        .toList())
                .contactPhone(order.getContactPhone())
                .status(order.getStatus())
                .deliveryAddress(order.getDeliveryAddress())
                .deliveryNotes(order.getDeliveryNotes())
                .subtotal(order.getSubtotal())
                .totalDiscount(order.getTotalDiscount())
                .total(order.getTotal())
                .paymentMethod(order.getPaymentMethod())
                .paymentStatus(order.getPaymentStatus())
                .deliveryType(order.getDeliveryType())
                .trackingNumber(order.getTrackingNumber())
                .estimatedDeliveryTime(order.getEstimatedDeliveryTime() != null ?
                    order.getEstimatedDeliveryTime().toString() : null)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}
