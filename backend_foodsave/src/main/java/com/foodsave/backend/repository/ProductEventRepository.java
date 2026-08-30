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
import java.util.Set;

@Repository
public interface ProductEventRepository extends JpaRepository<ProductEvent, Long> {
    Optional<ProductEvent> findByIdempotencyKey(String idempotencyKey);

    long countByEventTypeAndCreatedAtBetween(ProductEventType eventType, LocalDateTime start, LocalDateTime end);

    @Query("SELECT e.eventType as eventType, COUNT(e) as count FROM ProductEvent e " +
            "WHERE e.createdAt BETWEEN :start AND :end GROUP BY e.eventType")
    List<EventCountProjection> countByTypeBetween(@Param("start") LocalDateTime start,
                                                  @Param("end") LocalDateTime end);

    @Query("SELECT e.boxId as boxId, e.partnerId as partnerId, e.eventType as eventType, " +
            "COUNT(e) as count, MAX(e.occurredAt) as lastOccurredAt FROM ProductEvent e " +
            "WHERE e.user.id = :userId AND e.boxId IS NOT NULL AND e.occurredAt >= :since " +
            "GROUP BY e.boxId, e.partnerId, e.eventType")
    List<ProductSignalProjection> findProductSignalsForUser(@Param("userId") Long userId,
                                                            @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(e) as viewCount, COUNT(DISTINCT e.boxId) as uniqueBoxCount " +
            "FROM ProductEvent e WHERE e.eventType = :eventType AND e.boxId IS NOT NULL " +
            "AND e.occurredAt >= :since AND " +
            "((:userId IS NOT NULL AND e.user.id = :userId) OR " +
            "(:userId IS NULL AND :sessionId IS NOT NULL AND e.sessionId = :sessionId))")
    DecisionHelpProjection findDecisionHelpActivity(@Param("eventType") ProductEventType eventType,
                                                    @Param("userId") Long userId,
                                                    @Param("sessionId") String sessionId,
                                                    @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(e) FROM ProductEvent e WHERE e.eventType IN :eventTypes " +
            "AND e.occurredAt >= :since AND " +
            "((:userId IS NOT NULL AND e.user.id = :userId) OR " +
            "(:userId IS NULL AND :sessionId IS NOT NULL AND e.sessionId = :sessionId))")
    long countRecentDecisionHelpEvents(@Param("eventTypes") Set<ProductEventType> eventTypes,
                                       @Param("userId") Long userId,
                                       @Param("sessionId") String sessionId,
                                       @Param("since") LocalDateTime since);

    interface EventCountProjection {
        ProductEventType getEventType();
        Long getCount();
    }

    interface ProductSignalProjection {
        Long getBoxId();
        Long getPartnerId();
        ProductEventType getEventType();
        Long getCount();
        LocalDateTime getLastOccurredAt();
    }

    interface DecisionHelpProjection {
        Long getViewCount();
        Long getUniqueBoxCount();
    }
}
