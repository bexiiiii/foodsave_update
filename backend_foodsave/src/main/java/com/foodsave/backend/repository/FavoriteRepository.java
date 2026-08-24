package com.foodsave.backend.repository;

import com.foodsave.backend.domain.enums.FavoriteType;
import com.foodsave.backend.entity.Favorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Set;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Page<Favorite> findByUserId(Long userId, Pageable pageable);
    
    boolean existsByUserIdAndProductId(Long userId, Long productId);
    
    void deleteByUserIdAndProductId(Long userId, Long productId);
    
    List<Favorite> findByProductId(Long productId);

    List<Favorite> findByUserId(Long userId);

    boolean existsByUserIdAndStoreIdAndType(Long userId, Long storeId, FavoriteType type);
    boolean existsByUserIdAndProductIdAndType(Long userId, Long productId, FavoriteType type);
    void deleteByUserIdAndStoreIdAndType(Long userId, Long storeId, FavoriteType type);
    void deleteByUserIdAndProductIdAndType(Long userId, Long productId, FavoriteType type);

    @org.springframework.data.jpa.repository.Query(
            "SELECT f.storeId FROM Favorite f WHERE f.userId = :userId AND f.type = 'STORE'")
    Set<Long> findFavoriteStoreIds(@org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Query(
            "SELECT f.productId FROM Favorite f WHERE f.userId = :userId AND f.type = 'PRODUCT'")
    Set<Long> findFavoriteProductIds(@org.springframework.data.repository.query.Param("userId") Long userId);
}
