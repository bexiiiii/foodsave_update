package com.foodsave.backend.service;

import com.foodsave.backend.entity.Category;
import com.foodsave.backend.dto.CategoryDTO;
import com.foodsave.backend.repository.CategoryRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryDTO> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(CategoryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<CategoryDTO> getActiveCategories() {
        return categoryRepository.findByActive(true).stream()
                .map(CategoryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public CategoryDTO getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Category not found"));
        return CategoryDTO.fromEntity(category);
    }

    public CategoryDTO createCategory(CategoryDTO categoryDTO) {
        Category category = new Category();
        updateCategoryFromDTO(category, categoryDTO);
        return CategoryDTO.fromEntity(categoryRepository.save(category));
    }

    public CategoryDTO updateCategory(Long id, CategoryDTO categoryDTO) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Category not found"));
        updateCategoryFromDTO(category, categoryDTO);
        return CategoryDTO.fromEntity(categoryRepository.save(category));
    }

    public void deleteCategory(Long id) {
        categoryRepository.deleteById(id);
    }

    public List<CategoryDTO> searchCategories(String query) {
        return categoryRepository.searchByName(query).stream()
                .map(CategoryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<CategoryDTO> searchActiveCategories(String query) {
        return categoryRepository.searchActiveByName(query).stream()
                .map(CategoryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    private void updateCategoryFromDTO(Category category, CategoryDTO dto) {
        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setImageUrl(dto.getImageUrl());
        category.setActive(dto.isActive());
    }
} 