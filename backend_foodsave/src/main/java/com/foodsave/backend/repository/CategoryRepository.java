package com.foodsave.backend.repository;

import com.foodsave.backend.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByName(String name);
    List<Category> findByActive(boolean active);
    
    @Query("SELECT c FROM Category c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Category> searchByName(@Param("query") String query);
    
    @Query("SELECT c FROM Category c WHERE c.active = true AND LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Category> searchActiveByName(@Param("query") String query);
} 