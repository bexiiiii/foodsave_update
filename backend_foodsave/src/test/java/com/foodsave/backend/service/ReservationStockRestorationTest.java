package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.ProductStatus;
import com.foodsave.backend.entity.Order;
import com.foodsave.backend.entity.OrderItem;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.repository.*;
import com.foodsave.backend.util.SecurityUtil;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.ReflectionUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ReservationStockRestorationTest {
    Product product;
    Order order;
    ReservationStatusService service;

    @BeforeEach void setup() {
        ProductRepository products = mock(ProductRepository.class);
        service = new ReservationStatusService(mock(OrderStatusHistoryRepository.class),
                mock(OrderRepository.class), products, mock(UserRepository.class),
                mock(SecurityUtil.class), mock(ProductEventService.class));
        product = new Product(); product.setId(12L); product.setStockQuantity(0);
        product.setStatus(ProductStatus.AVAILABLE); product.setActive(true);
        // Both inventory schemas are deployed; check the newer counters when present.
        BeanWrapperImpl inventory = new BeanWrapperImpl(product);
        if (inventory.isWritableProperty("availableQuantity")) {
            inventory.setPropertyValue("availableQuantity", 0);
            inventory.setPropertyValue("reservedQuantity", 4);
        }
        OrderItem item = new OrderItem(); item.setProduct(product); item.setQuantity(2);
        order = new Order(); order.setItems(List.of(item));
        when(products.findByIdForUpdate(12L)).thenReturn(Optional.of(product));
        when(products.findById(12L)).thenReturn(Optional.of(product));
        if (ReflectionUtils.findField(service.getClass(), "entityManager") != null) {
            EntityManager em = mock(EntityManager.class); Query query = mock(Query.class);
            when(em.createNativeQuery(anyString())).thenReturn(query);
            when(query.setParameter(eq("id"), any())).thenReturn(query);
            when(query.getResultList()).thenReturn(List.of(12L));
            ReflectionTestUtils.setField(service, "entityManager", em);
        }
    }

    private void restore(OrderStatus previous) {
        ReflectionTestUtils.invokeMethod(service, "restoreReservedStockIfNeeded", order, previous);
    }
    private void withdrawn(ProductStatus status) {
        product.setStatus(status); restore(OrderStatus.CREATED);
        assertEquals(status, product.getStatus()); assertEquals(0, product.getStockQuantity());
        BeanWrapperImpl inventory = new BeanWrapperImpl(product);
        if (inventory.isReadableProperty("reservedQuantity")) {
            assertEquals(2, inventory.getPropertyValue("reservedQuantity"));
            assertEquals(0, inventory.getPropertyValue("availableQuantity"));
        }
    }
    @Test void discontinuedBoxStaysWithdrawn() { withdrawn(ProductStatus.DISCONTINUED); }
    @Test void hiddenBoxStaysWithdrawn() { withdrawn(ProductStatus.HIDDEN); }
    @Test void expiredBoxStaysWithdrawn() { withdrawn(ProductStatus.EXPIRED); }
    @Test void manuallyOutOfStockBoxStaysWithdrawn() { withdrawn(ProductStatus.OUT_OF_STOCK); }
    @Test void inactiveBoxIsNotRestocked() {
        product.setActive(false); restore(OrderStatus.CREATED);
        assertFalse(product.getActive()); assertEquals(0, product.getStockQuantity());
    }
    @Test void deletedBoxIsNotRestocked() {
        product.setDeletedAt(LocalDateTime.now()); restore(OrderStatus.CREATED);
        assertNotNull(product.getDeletedAt()); assertEquals(0, product.getStockQuantity());
    }
    @Test void lastReservedBoxReturnsToAvailableStock() {
        restore(OrderStatus.CREATED);
        assertEquals(2, product.getStockQuantity()); assertEquals(ProductStatus.AVAILABLE, product.getStatus());
    }
    @Test void previouslyCancelledOrderCannotRestoreStockTwice() {
        restore(OrderStatus.CANCELLED);
        assertEquals(0, product.getStockQuantity());
    }
}
