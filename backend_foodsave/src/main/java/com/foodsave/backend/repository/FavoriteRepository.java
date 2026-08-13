package com.foodsave.backend.repository;

import com.foodsave.backend.domain.enums.FavoriteType;
import com.foodsave.backend.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    List<Favorite> findByUserId(Long userId);

    boolean existsByUserIdAndStoreIdAndType(Long userId, Long storeId, FavoriteType type);

    boolean existsByUserIdAndProductIdAndType(Long userId, Long productId, FavoriteType type);

    void deleteByUserIdAndStoreIdAndType(Long userId, Long storeId, FavoriteType type);

    void deleteByUserIdAndProductIdAndType(Long userId, Long productId, FavoriteType type);

    @Query("SELECT f.storeId FROM Favorite f WHERE f.userId = :userId AND f.type = 'STORE'")
    Set<Long> findFavoriteStoreIds(@Param("userId") Long userId);

    @Query("SELECT f.productId FROM Favorite f WHERE f.userId = :userId AND f.type = 'PRODUCT'")
    Set<Long> findFavoriteProductIds(@Param("userId") Long userId);
}
