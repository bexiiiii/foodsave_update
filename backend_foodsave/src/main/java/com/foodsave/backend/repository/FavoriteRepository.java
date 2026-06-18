package com.foodsave.backend.repository;

import com.foodsave.backend.entity.Favorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Page<Favorite> findByUserId(Long userId, Pageable pageable);
    
    boolean existsByUserIdAndProductId(Long userId, Long productId);
    
    void deleteByUserIdAndProductId(Long userId, Long productId);
    
    List<Favorite> findByProductId(Long productId);
} 