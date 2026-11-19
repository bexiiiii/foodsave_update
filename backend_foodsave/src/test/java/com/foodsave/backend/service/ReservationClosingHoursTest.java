package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.ProductStatus;
import com.foodsave.backend.domain.enums.StoreStatus;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.exception.ApiException;
import com.foodsave.backend.repository.ProductRepository;
import com.foodsave.backend.util.ProductAvailability;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.http.HttpStatus;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.util.ReflectionUtils;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import com.foodsave.backend.exception.GlobalExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReservationClosingHoursTest {
    final LocalDateTime day = LocalDateTime.of(2026, 11, 15, 0, 0);
    ProductRepository products;
    ProductService service;
    Product product;
    Store store;

    @BeforeEach void setup() {
        products = mock(ProductRepository.class);
        service = mock(ProductService.class, CALLS_REAL_METHODS);
        ReflectionTestUtils.setField(service, "productRepository", products);
        store = new Store();
        store.setActive(true); store.setStatus(StoreStatus.ACTIVE);
        store.setOpeningHours("09:00"); store.setClosingHours("22:00");
        product = new Product(); product.setId(12L); product.setStore(store);
        product.setActive(true); product.setStatus(ProductStatus.AVAILABLE);
        product.setStockQuantity(2); setIfPresent("availableQuantity", 2); setIfPresent("reservedQuantity", 0);
        product.setExpiryDate(day.plusDays(1).withHour(21));
        when(products.findByIdForUpdate(12L)).thenReturn(Optional.of(product));
        when(products.findById(12L)).thenReturn(Optional.of(product));
        when(products.save(any())).thenAnswer(i -> i.getArgument(0));
        if (ReflectionUtils.findField(ProductService.class, "entityManager") != null) {
            EntityManager em = mock(EntityManager.class);
            Query query = mock(Query.class);
            when(em.createNativeQuery(anyString())).thenReturn(query);
            when(query.setParameter(anyString(), any())).thenReturn(query);
            when(query.getResultList()).thenReturn(List.of(12L));
            ReflectionTestUtils.setField(service, "entityManager", em);
        }
    }

    private void setIfPresent(String field, Object value) {
        var bean = new BeanWrapperImpl(product);
        if (bean.isWritableProperty(field)) bean.setPropertyValue(field, value);
    }

    private void assertIfPresent(String field, Object expected) {
        var bean = new BeanWrapperImpl(product);
        if (bean.isReadableProperty(field)) assertEquals(expected, bean.getPropertyValue(field));
    }

    @RestController
    static class ReservationEndpoint {
        private final ProductService service;
        ReservationEndpoint(ProductService service) { this.service = service; }
        @PostMapping("/test/reserve")
        void reserve() { service.reserveProductStock(12L, 1); }
    }

    @Test void returnsConflictWithReadableMessageRatherThanServerError() {
        at(LocalTime.of(22, 23), () -> {
            try {
                String body = standaloneSetup(new ReservationEndpoint(service))
                        .setControllerAdvice(new GlobalExceptionHandler()).build()
                        .perform(post("/test/reserve"))
                        .andExpect(status().isConflict()).andReturn().getResponse()
                        .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
                assertTrue(body.contains("Заведение закрыто. Забронировать бокс можно в часы работы"));
            } catch (Exception e) { throw new AssertionError(e); }
            verify(products, never()).save(any());
        });
    }

    private void at(LocalTime now, Runnable check) {
        try (MockedStatic<LocalTime> time = mockStatic(LocalTime.class, CALLS_REAL_METHODS);
             MockedStatic<ProductAvailability> availability = mockStatic(ProductAvailability.class, CALLS_REAL_METHODS)) {
            time.when(() -> LocalTime.now(ProductAvailability.BUSINESS_ZONE)).thenReturn(now);
            availability.when(ProductAvailability::now).thenReturn(day.with(now));
            check.run();
        }
    }

    private void rejectedWithoutChangingStock() {
        ApiException ex = assertThrows(ApiException.class, () -> service.reserveProductStock(12L, 1));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Заведение закрыто"));
        assertEquals(2, product.getStockQuantity());
        assertIfPresent("availableQuantity", 2);
        assertIfPresent("reservedQuantity", 0);
        verify(products, never()).save(any());
    }

    @Test void rejectsReported2230CaseWithoutOptionalDeadlines() {
        at(LocalTime.of(22, 23), () -> {
            rejectedWithoutChangingStock();
        });
    }

    @Test void rejectsExactlyAtClosing() {
        at(LocalTime.of(22, 0), this::rejectedWithoutChangingStock);
    }

    @Test void futureSaleAndPickupDeadlinesCannotOverrideClosing() {
        setIfPresent("salesEndAt", day.plusDays(1)); setIfPresent("pickupEndAt", day.plusDays(1));
        at(LocalTime.of(22, 23), this::rejectedWithoutChangingStock);
    }

    @Test void allowsJustBeforeClosingAndKeepsInventoryCounters() {
        at(LocalTime.of(21, 59, 59), () -> {
            assertSame(product, service.reserveProductStock(12L, 1));
            assertEquals(1, product.getStockQuantity()); assertIfPresent("availableQuantity", 1);
            assertIfPresent("reservedQuantity", 1); verify(products).save(product);
        });
    }

    @Test void rechecksTimeForAnAlreadyOpenedCard() {
        at(LocalTime.of(21, 59), () -> assertTrue(ProductAvailability.isAvailable(product)));
        at(LocalTime.of(22, 0), this::rejectedWithoutChangingStock);
    }

    @Test void overnightBranchAllowsBeforeMidnight() {
        store.setOpeningHours("10:00"); store.setClosingHours("03:00");
        at(LocalTime.of(23, 0), () -> assertDoesNotThrow(() -> service.reserveProductStock(12L, 1)));
    }

    @Test void overnightBranchAllowsAfterMidnightBeforeClosing() {
        store.setOpeningHours("10:00"); store.setClosingHours("03:00");
        at(LocalTime.of(2, 59), () -> assertDoesNotThrow(() -> service.reserveProductStock(12L, 1)));
    }

    @Test void overnightBranchRejectsAtClosing() {
        store.setOpeningHours("10:00"); store.setClosingHours("03:00");
        at(LocalTime.of(3, 0), this::rejectedWithoutChangingStock);
    }

    @Test void ordinaryBranchRejectsBeforeOpeningAndAllowsAtOpening() {
        at(LocalTime.of(8, 59), this::rejectedWithoutChangingStock);
        at(LocalTime.of(9, 0), () -> assertDoesNotThrow(() -> service.reserveProductStock(12L, 1)));
    }

    @Test void doesNotChangeRoundTheClockScheduleConvention() {
        store.setOpeningHours("00:00"); store.setClosingHours("00:00");
        at(LocalTime.of(23, 30), () -> assertDoesNotThrow(() -> service.reserveProductStock(12L, 1)));
    }

    @Test void earlierProductDeadlineStillBlocksWhileBranchIsOpen() {
        org.junit.jupiter.api.Assumptions.assumeTrue(new BeanWrapperImpl(product).isWritableProperty("salesEndAt"));
        setIfPresent("salesEndAt", day.withHour(19));
        at(LocalTime.of(20, 0), () -> {
            RuntimeException ex = assertThrows(RuntimeException.class, () -> service.reserveProductStock(12L, 1));
            assertTrue(ex instanceof IllegalStateException || ex instanceof com.foodsave.backend.exception.InsufficientStockException);
            verify(products, never()).save(any());
        });
    }

    @Test void alternateStockReductionAlsoCannotBypassClosing() {
        at(LocalTime.of(22, 23), () -> {
            assertThrows(ApiException.class, () -> service.reduceStockQuantity(12L, 1));
            verify(products, never()).save(any());
        });
    }
}
