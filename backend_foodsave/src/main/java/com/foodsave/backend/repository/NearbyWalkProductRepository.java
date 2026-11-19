package com.foodsave.backend.repository;

import com.foodsave.backend.entity.Product;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NearbyWalkProductRepository extends Repository<Product, Long> {
    @Query("""
            SELECT p FROM Product p JOIN FETCH p.store s
            WHERE p.active = true AND p.deletedAt IS NULL AND p.status = 'AVAILABLE'
              AND p.stockQuantity > 0 AND s.active = true AND s.status = 'ACTIVE'
              AND s.latitude BETWEEN :south AND :north
              AND s.longitude BETWEEN :west AND :east
            """)
    List<Product> findWalkCandidates(@Param("south") double south, @Param("north") double north,
                                     @Param("west") double west, @Param("east") double east);
}
