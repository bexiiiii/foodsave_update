package com.foodsave.backend.repository;

import com.foodsave.backend.domain.enums.ProductEventType;
import com.foodsave.backend.entity.ProductEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
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

    @Query("SELECT e.boxId as productId, COUNT(e) as count FROM ProductEvent e " +
            "WHERE e.user.id = :userId AND e.boxId IS NOT NULL " +
            "AND e.eventType IN :eventTypes AND e.occurredAt >= :since " +
            "GROUP BY e.boxId")
    List<ProductSignalProjection> countProductSignals(@Param("userId") Long userId,
                                                      @Param("eventTypes") Collection<ProductEventType> eventTypes,
                                                      @Param("since") LocalDateTime since);

    @Query("SELECT e.partnerId as storeId, COUNT(e) as count FROM ProductEvent e " +
            "WHERE e.user.id = :userId AND e.partnerId IS NOT NULL " +
            "AND e.eventType IN :eventTypes AND e.occurredAt >= :since " +
            "GROUP BY e.partnerId")
    List<StoreSignalProjection> countStoreSignals(@Param("userId") Long userId,
                                                  @Param("eventTypes") Collection<ProductEventType> eventTypes,
                                                  @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(e) FROM ProductEvent e " +
            "WHERE e.eventType = :eventType AND e.occurredAt >= :since AND e.boxId IS NOT NULL " +
            "AND ((:userId IS NOT NULL AND e.user.id = :userId) " +
            "OR (:sessionId IS NOT NULL AND (e.sessionId = :sessionId OR e.anonymousSessionId = :sessionId)))")
    long countDecisionHelpViews(@Param("userId") Long userId,
                                @Param("sessionId") String sessionId,
                                @Param("eventType") ProductEventType eventType,
                                @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(DISTINCT e.boxId) FROM ProductEvent e " +
            "WHERE e.eventType = :eventType AND e.occurredAt >= :since AND e.boxId IS NOT NULL " +
            "AND ((:userId IS NOT NULL AND e.user.id = :userId) " +
            "OR (:sessionId IS NOT NULL AND (e.sessionId = :sessionId OR e.anonymousSessionId = :sessionId)))")
    long countDecisionHelpBoxes(@Param("userId") Long userId,
                                @Param("sessionId") String sessionId,
                                @Param("eventType") ProductEventType eventType,
                                @Param("since") LocalDateTime since);

    @Query("SELECT e.boxId as productId, COUNT(e) as count FROM ProductEvent e " +
            "WHERE e.eventType = :eventType AND e.occurredAt >= :since AND e.boxId IS NOT NULL " +
            "AND ((:userId IS NOT NULL AND e.user.id = :userId) " +
            "OR (:sessionId IS NOT NULL AND (e.sessionId = :sessionId OR e.anonymousSessionId = :sessionId))) " +
            "GROUP BY e.boxId")
    List<ProductSignalProjection> countDecisionHelpBoxViews(@Param("userId") Long userId,
                                                            @Param("sessionId") String sessionId,
                                                            @Param("eventType") ProductEventType eventType,
                                                            @Param("since") LocalDateTime since);

    interface EventCountProjection {
        ProductEventType getEventType();
        Long getCount();
    }

    interface ProductSignalProjection {
        Long getProductId();
        Long getCount();
    }

    interface StoreSignalProjection {
        Long getStoreId();
        Long getCount();
    }
}
