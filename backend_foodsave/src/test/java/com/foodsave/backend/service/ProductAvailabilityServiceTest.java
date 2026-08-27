package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.ProductAvailabilityState;
import com.foodsave.backend.domain.enums.ProductStatus;
import com.foodsave.backend.domain.enums.StoreStatus;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.repository.OrderItemRepository;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

class ProductAvailabilityServiceTest {

    private final ProductAvailabilityService service =
            new ProductAvailabilityService(mock(OrderItemRepository.class));

    @Test
    void availableProductCanBeReserved() {
        Product product = product(10L, 2, ProductStatus.AVAILABLE);

        assertEquals(ProductAvailabilityState.AVAILABLE, service.resolve(product, Set.of()));
    }

    @Test
    void exhaustedProductWithActiveOrderIsReserved() {
        Product product = product(10L, 0, ProductStatus.AVAILABLE);

        assertEquals(ProductAvailabilityState.RESERVED, service.resolve(product, Set.of(10L)));
    }

    @Test
    void exhaustedProductWithoutActiveOrderIsSoldOut() {
        Product product = product(10L, 0, ProductStatus.OUT_OF_STOCK);

        assertEquals(ProductAvailabilityState.SOLD_OUT, service.resolve(product, Set.of()));
    }

    @Test
    void hiddenProductRemainsUnavailableEvenWithStock() {
        Product product = product(10L, 3, ProductStatus.HIDDEN);

        assertEquals(ProductAvailabilityState.UNAVAILABLE, service.resolve(product, Set.of()));
    }

    private Product product(Long id, int stock, ProductStatus status) {
        Store store = new Store();
        store.setActive(true);
        store.setStatus(StoreStatus.ACTIVE);

        Product product = new Product();
        product.setId(id);
        product.setActive(true);
        product.setStatus(status);
        product.setStockQuantity(stock);
        product.setStore(store);
        return product;
    }
}
