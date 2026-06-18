package com.foodsave.backend.controller;

import com.foodsave.backend.domain.enums.Permission;
import com.foodsave.backend.dto.ProductDTO;
import com.foodsave.backend.domain.enums.ProductStatus;
import com.foodsave.backend.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Product", description = "Product management APIs")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ProductController {
    
    private final ProductService productService;
    
    @GetMapping
    @Operation(summary = "Get all products with pagination")
    public ResponseEntity<Page<ProductDTO>> getAllProducts(Pageable pageable) {
        return ResponseEntity.ok(productService.getAllProducts(pageable));
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get product by ID")
    public ResponseEntity<ProductDTO> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }
    
    @GetMapping("/store/{storeId}")
    @Operation(summary = "Get products by store ID with pagination")
    public ResponseEntity<Page<ProductDTO>> getProductsByStore(
            @PathVariable Long storeId,
            Pageable pageable) {
        return ResponseEntity.ok(productService.getProductsByStore(storeId, pageable));
    }
    
    @GetMapping("/categories")
    @Operation(summary = "Get all product categories")
    public ResponseEntity<List<String>> getAllCategories() {
        return ResponseEntity.ok(productService.getAllCategories());
    }
    
    @GetMapping("/featured")
    @Operation(summary = "Get featured products with pagination")
    public ResponseEntity<Page<ProductDTO>> getFeaturedProducts(Pageable pageable) {
        return ResponseEntity.ok(productService.getFeaturedProducts(pageable));
    }
    
    @PostMapping
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('STORE_MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Create a new product")
    public ResponseEntity<ProductDTO> createProduct(@Valid @RequestBody ProductDTO productDTO) {
        return ResponseEntity.ok(productService.createProduct(productDTO));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('STORE_MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Update an existing product")
    public ResponseEntity<ProductDTO> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductDTO productDTO) {
        return ResponseEntity.ok(productService.updateProduct(id, productDTO));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('STORE_MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Delete a product")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/search")
    @Operation(summary = "Search products with pagination")
    public ResponseEntity<Page<ProductDTO>> searchProducts(
            @RequestParam String query,
            Pageable pageable) {
        return ResponseEntity.ok(productService.searchProducts(query, pageable));
    }
    
    @GetMapping("/category/{categoryId}")
    @Operation(summary = "Get products by category ID with pagination")
    public ResponseEntity<Page<ProductDTO>> getProductsByCategory(
            @PathVariable Long categoryId,
            Pageable pageable) {
        return ResponseEntity.ok(productService.getProductsByCategory(categoryId, pageable));
    }
    
    @GetMapping("/discounted")
    @Operation(summary = "Get discounted products with pagination")
    public ResponseEntity<Page<ProductDTO>> getDiscountedProducts(Pageable pageable) {
        return ResponseEntity.ok(productService.getDiscountedProducts(pageable));
    }
    
    @GetMapping("/low-stock")
    @Operation(summary = "Get low stock products with pagination")
    public ResponseEntity<Page<ProductDTO>> getLowStockProducts(
            @RequestParam(defaultValue = "10") Integer threshold,
            Pageable pageable) {
        return ResponseEntity.ok(productService.getLowStockProducts(threshold, pageable));
    }
    
    @GetMapping("/expiring")
    @Operation(summary = "Get expiring products with pagination")
    public ResponseEntity<Page<ProductDTO>> getExpiringProducts(Pageable pageable) {
        return ResponseEntity.ok(productService.getExpiringProducts(pageable));
    }
    
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('STORE_MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Update product status")
    public ResponseEntity<ProductDTO> updateProductStatus(
            @PathVariable Long id,
            @RequestParam ProductStatus status) {
        return ResponseEntity.ok(productService.updateProductStatus(id, status));
    }

    @PatchMapping("/{id}/stock")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('STORE_MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Update product stock quantity")
    public ResponseEntity<ProductDTO> updateProductStock(
            @PathVariable Long id,
            @RequestParam Integer stockQuantity) {
        return ResponseEntity.ok(productService.updateStockQuantity(id, stockQuantity));
    }

    @GetMapping("/{id}/stock/check")
    @Operation(summary = "Check if product has sufficient stock")
    public ResponseEntity<Boolean> checkProductStock(
            @PathVariable Long id,
            @RequestParam Integer quantity) {
        return ResponseEntity.ok(productService.hasSufficientStock(id, quantity));
    }
}
