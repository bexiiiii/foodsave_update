package com.foodsave.backend.repository;


import com.foodsave.backend.entity.History;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface HistoryRepository extends JpaRepository<History, Long> {
    Page<History> findByUserId(Long userId, Pageable pageable);
    
    @Query("SELECT h FROM History h WHERE h.targetType = ?1 AND h.targetId = ?2")
    Page<History> findByTarget(String targetType, Long targetId, Pageable pageable);
    
    @Query("SELECT h FROM History h WHERE h.timestamp BETWEEN ?1 AND ?2")
    List<History> findByDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT h FROM History h WHERE h.action = ?1")
    Page<History> findByAction(String action, Pageable pageable);
} 