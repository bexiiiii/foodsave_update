package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.ProductAvailabilityState;
import com.foodsave.backend.domain.enums.ProductStatus;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.repository.OrderItemRepository;
import com.foodsave.backend.util.ProductAvailability;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProductAvailabilityService {

    private static final Set<OrderStatus> ACTIVE_RESERVATION_STATUSES = Collections.unmodifiableSet(
            EnumSet.of(OrderStatus.CREATED, OrderStatus.PENDING, OrderStatus.CONFIRMED,
                    OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP,
                    OrderStatus.OUT_FOR_DELIVERY));

    private final OrderItemRepository orderItemRepository;

    @Transactional(readOnly = true)
    public Set<Long> findReservedProductIds(Collection<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Collections.emptySet();
        }
        return orderItemRepository.findProductIdsWithActiveReservations(
                productIds.stream().distinct().toList(), ACTIVE_RESERVATION_STATUSES);
    }

    public ProductAvailabilityState resolve(Product product, Set<Long> reservedProductIds) {
        if (ProductAvailability.isAvailable(product)) {
            return ProductAvailabilityState.AVAILABLE;
        }
        if (product == null) {
            return ProductAvailabilityState.UNAVAILABLE;
        }

        int stock = product.getStockQuantity() == null ? 0 : product.getStockQuantity();
        boolean customerStockState = stock <= 0 || product.getStatus() == ProductStatus.OUT_OF_STOCK;
        if (!customerStockState) {
            return ProductAvailabilityState.UNAVAILABLE;
        }

        Set<Long> reservedIds = reservedProductIds == null ? Collections.emptySet() : reservedProductIds;
        return stock <= 0 && product.getId() != null && reservedIds.contains(product.getId())
                ? ProductAvailabilityState.RESERVED
                : ProductAvailabilityState.SOLD_OUT;
    }

    public boolean canReserve(ProductAvailabilityState state) {
        return state == ProductAvailabilityState.AVAILABLE;
    }
}
