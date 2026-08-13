package com.foodsave.backend.repository;

import com.foodsave.backend.domain.enums.ProductEventType;
import com.foodsave.backend.entity.ProductEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductEventRepository extends JpaRepository<ProductEvent, Long> {
    Optional<ProductEvent> findByIdempotencyKey(String idempotencyKey);

    long countByEventTypeAndCreatedAtBetween(ProductEventType eventType, LocalDateTime start, LocalDateTime end);

    @Query("SELECT e.eventType as eventType, COUNT(e) as count FROM ProductEvent e " +
            "WHERE e.createdAt BETWEEN :start AND :end GROUP BY e.eventType")
    List<EventCountProjection> countByTypeBetween(@Param("start") LocalDateTime start,
                                                  @Param("end") LocalDateTime end);

    interface EventCountProjection {
        ProductEventType getEventType();
        Long getCount();
    }
}
