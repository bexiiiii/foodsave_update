package com.foodsave.backend.controller;

import com.foodsave.backend.domain.enums.Permission;
import com.foodsave.backend.dto.DiscountDTO;
import com.foodsave.backend.service.DiscountService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/discounts")
public class DiscountController {

    private final DiscountService discountService;

    public DiscountController(DiscountService discountService) {
        this.discountService = discountService;
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    // @RequirePermission(Permission.DISCOUNT_READ)
    public ResponseEntity<List<DiscountDTO>> getAllDiscounts() {
        return ResponseEntity.ok(discountService.getAllDiscounts());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('STORE_OWNER') or hasRole('STORE_MANAGER')")
    // @RequirePermission(Permission.DISCOUNT_READ)
    public ResponseEntity<DiscountDTO> getDiscountById(@PathVariable Long id) {
        return ResponseEntity.ok(discountService.getDiscountById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('STORE_OWNER') or hasRole('STORE_MANAGER')")
    // @RequirePermission(Permission.DISCOUNT_CREATE)
    public ResponseEntity<DiscountDTO> createDiscount(@RequestBody DiscountDTO discountDTO) {
        return ResponseEntity.ok(discountService.createDiscount(discountDTO));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('STORE_OWNER') or hasRole('STORE_MANAGER')")
    // @RequirePermission(Permission.DISCOUNT_UPDATE)
    public ResponseEntity<DiscountDTO> updateDiscount(@PathVariable Long id, @RequestBody DiscountDTO discountDTO) {
        return ResponseEntity.ok(discountService.updateDiscount(id, discountDTO));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('STORE_OWNER') or hasRole('STORE_MANAGER')")
    // @RequirePermission(Permission.DISCOUNT_DELETE)
    public ResponseEntity<Void> deleteDiscount(@PathVariable Long id) {
        discountService.deleteDiscount(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/apply")
    // @RequirePermission(Permission.DISCOUNT_READ)
    public ResponseEntity<DiscountDTO> applyDiscount(@RequestParam String code) {
        return ResponseEntity.ok(discountService.applyDiscount(code));
    }
} 
