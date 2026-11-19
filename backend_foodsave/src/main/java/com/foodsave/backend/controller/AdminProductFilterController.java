package com.foodsave.backend.controller;

import com.foodsave.backend.dto.ProductDTO;
import com.foodsave.backend.domain.enums.ProductAvailabilityState;
import org.springframework.transaction.annotation.Isolation;
import com.foodsave.backend.security.SecurityUtil;
import com.foodsave.backend.service.AdminProductFilterQuery;
import com.foodsave.backend.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AdminProductFilterController {
    private final AdminProductFilterQuery filters;
    private final ProductService products;

    public AdminProductFilterController(AdminProductFilterQuery filters, ProductService products) {
        this.filters = filters;
        this.products = products;
    }

    @GetMapping("/api/products/admin-filter")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STORE_OWNER', 'STORE_MANAGER')")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Page<ProductDTO> find(
            @RequestParam(name = "query", defaultValue = "") String query,
            @RequestParam(name = "storeId", required = false) Long storeId,
            @RequestParam(name = "categoryId", required = false) Long categoryId,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        var ids = filters.findIds(SecurityUtil.getCurrentUserRole(), SecurityUtil.getCurrentUserId(),
                query, storeId, categoryId, status, page, size);
        var reserved = filters.reservedOnPage(ids.getContent());
        return ids.map(id -> {
            ProductDTO dto = products.getProductById(id);
            if (reserved.contains(id)) {
                dto.setAvailabilityState(ProductAvailabilityState.RESERVED);
            } else if (dto.getAvailabilityState() == ProductAvailabilityState.RESERVED) {
                dto.setAvailabilityState(ProductAvailabilityState.SOLD_OUT);
            }
            return dto;
        });
    }
}
