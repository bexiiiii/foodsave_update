package com.foodsave.backend.service;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.dto.ProductDTO;
import com.foodsave.backend.domain.enums.ProductStatus;
public final class CancellationStockPolicy {
    private CancellationStockPolicy() {}
    public static void applyManualStatus(Product product, ProductDTO dto) {
        if (dto.getStatus() != null && dto.getStatus() != ProductStatus.AVAILABLE) {
            product.setStatus(dto.getStatus());
            product.setActive(false);
        }
    }
    public static void applyManualStatus(Product product, ProductStatus status) {
        if (status != null) product.setActive(status == ProductStatus.AVAILABLE);
    }
    public static ProductStatus restorationStatus(Product product) {
        return product.getStatus() == ProductStatus.OUT_OF_STOCK ? ProductStatus.AVAILABLE : product.getStatus();
    }
    public static void afterRestock(Product product, Integer quantity) {
        product.setStatus(ProductStatus.AVAILABLE);
    }
}
