package com.foodsave.backend.repository;

import com.foodsave.backend.domain.enums.NotificationGroupStatus;
import com.foodsave.backend.entity.NotificationGroup;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationGroupRepository extends JpaRepository<NotificationGroup, Long> {
    Optional<NotificationGroup> findByIdempotencyKey(String idempotencyKey);

    @EntityGraph(attributePaths = {"items", "items.partner", "items.branch", "items.box", "user"})
    @Query("SELECT g FROM NotificationGroup g WHERE g.id = :id")
    Optional<NotificationGroup> findWithItemsById(Long id);

    @Query("SELECT g FROM NotificationGroup g WHERE g.status = :status AND g.scheduledAt <= :now ORDER BY g.scheduledAt ASC")
    List<NotificationGroup> findDueGroups(@Param("status") NotificationGroupStatus status,
                                          @Param("now") LocalDateTime now,
                                          Pageable pageable);

    @Modifying
    @Query(value = """
            INSERT INTO notification_groups (user_id, time_window, scheduled_at, status, trigger_type,
                notification_type, campaign_id, idempotency_key, created_at, updated_at)
            VALUES (:userId, :window, :scheduled, 'SCHEDULED', :trigger, 'MARKETING', :campaign, :key, now(), now())
            ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    void ensureScheduled(@Param("userId") Long userId, @Param("window") String window,
                         @Param("scheduled") LocalDateTime scheduled, @Param("trigger") String trigger,
                         @Param("campaign") String campaign, @Param("key") String key);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM NotificationGroup g WHERE g.idempotencyKey = :key")
    Optional<NotificationGroup> lockForCollection(@Param("key") String key);

    @Transactional
    @Modifying
    @Query("UPDATE NotificationGroup g SET g.status = :next WHERE g.id = :id AND g.status = :expected")
    int changeStatus(@Param("id") Long id, @Param("expected") NotificationGroupStatus expected,
                     @Param("next") NotificationGroupStatus next);

    long countByStatusAndCreatedAtBetween(NotificationGroupStatus status, LocalDateTime start, LocalDateTime end);
}
