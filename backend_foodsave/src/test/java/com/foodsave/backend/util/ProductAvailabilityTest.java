package com.foodsave.backend.util;

import com.foodsave.backend.domain.enums.ProductStatus;
import com.foodsave.backend.domain.enums.StoreStatus;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.Store;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductAvailabilityTest {

    @Test
    void hidesProductWhoseExpiryCalendarDateIsToday() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 6, 20, 0);
        Product product = product(store("09:00", "22:00"), LocalDateTime.of(2026, 8, 6, 23, 59));

        assertFalse(ProductAvailability.isAvailable(product, now));
    }

    @Test
    void keepsProductVisibleUntilNextExpiryCalendarDateStarts() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 6, 20, 0);
        Product product = product(store("09:00", "22:00"), LocalDateTime.of(2026, 8, 7, 0, 0));

        assertTrue(ProductAvailability.isAvailable(product, now));
        assertFalse(ProductAvailability.isAvailable(product, LocalDateTime.of(2026, 8, 7, 0, 0)));
    }

    @Test
    void hidesProductAtStoreClosingTime() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 6, 20, 0);
        Product product = product(store("10:00", "20:00"), LocalDateTime.of(2026, 8, 7, 21, 0));

        assertFalse(ProductAvailability.isAvailable(product, now));
    }

    @Test
    void keepsProductVisibleBeforeClosingTime() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 6, 19, 59);
        Product product = product(store("10:00", "20:00"), LocalDateTime.of(2026, 8, 7, 21, 0));

        assertTrue(ProductAvailability.isAvailable(product, now));
    }

    @Test
    void supportsOvernightStoreHours() {
        Store store = store("10:00", "03:00");

        assertTrue(ProductAvailability.isStoreOpen(store, java.time.LocalTime.of(2, 59)));
        assertFalse(ProductAvailability.isStoreOpen(store, java.time.LocalTime.of(3, 0)));
        assertTrue(ProductAvailability.isStoreOpen(store, java.time.LocalTime.of(23, 0)));
    }

    private Product product(Store store, LocalDateTime expiryDate) {
        Product product = new Product();
        product.setStore(store);
        product.setActive(true);
        product.setStatus(ProductStatus.AVAILABLE);
        product.setStockQuantity(1);
        product.setExpiryDate(expiryDate);
        return product;
    }

    private Store store(String opening, String closing) {
        Store store = new Store();
        store.setActive(true);
        store.setStatus(StoreStatus.ACTIVE);
        store.setOpeningHours(opening);
        store.setClosingHours(closing);
        return store;
    }
}
