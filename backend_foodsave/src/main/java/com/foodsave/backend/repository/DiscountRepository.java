package com.foodsave.backend.repository;

import com.foodsave.backend.entity.Discount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DiscountRepository extends JpaRepository<Discount, Long> {
    @Query("SELECT d FROM Discount d WHERE d.endDate < ?1")
    List<Discount> findExpiredDiscounts(LocalDateTime currentDate);
    
    @Query("SELECT d FROM Discount d WHERE d.startDate <= ?1 AND d.endDate >= ?1")
    List<Discount> findActiveDiscounts(LocalDateTime currentDate);
    
    @Query("SELECT d FROM Discount d WHERE d.store.id = ?1 AND d.startDate <= ?2 AND d.endDate >= ?2")
    List<Discount> findActiveDiscountsForStore(Long storeId, LocalDateTime currentDate);

    Optional<Discount> findByCode(String code);
} 