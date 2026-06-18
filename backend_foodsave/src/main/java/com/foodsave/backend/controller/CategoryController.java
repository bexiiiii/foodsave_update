package com.foodsave.backend.controller;

import com.foodsave.backend.dto.CategoryDTO;
import com.foodsave.backend.service.CategoryService;
import com.foodsave.backend.domain.enums.Permission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Category", description = "Category management APIs")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "Get all categories")
    public ResponseEntity<List<CategoryDTO>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @GetMapping("/active")
    @Operation(summary = "Get all active categories")
    public ResponseEntity<List<CategoryDTO>> getActiveCategories() {
        return ResponseEntity.ok(categoryService.getActiveCategories());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get category by ID")
    public ResponseEntity<CategoryDTO> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getCategoryById(id));
    }

    @PostMapping
    @Operation(summary = "Create a new category")
    // @RequirePermission(Permission.CATEGORY_CREATE)
    public ResponseEntity<CategoryDTO> createCategory(@Valid @RequestBody CategoryDTO categoryDTO) {
        return ResponseEntity.ok(categoryService.createCategory(categoryDTO));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing category")
    // @RequirePermission(Permission.CATEGORY_UPDATE)
    public ResponseEntity<CategoryDTO> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryDTO categoryDTO) {
        return ResponseEntity.ok(categoryService.updateCategory(id, categoryDTO));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a category")
    // @RequirePermission(Permission.CATEGORY_DELETE)
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/search")
    @Operation(summary = "Search categories by name")
    public ResponseEntity<List<CategoryDTO>> searchCategories(@RequestParam String query) {
        return ResponseEntity.ok(categoryService.searchCategories(query));
    }

    @GetMapping("/search/active")
    @Operation(summary = "Search active categories by name")
    public ResponseEntity<List<CategoryDTO>> searchActiveCategories(@RequestParam String query) {
        return ResponseEntity.ok(categoryService.searchActiveCategories(query));
    }
} 