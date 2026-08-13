package com.foodsave.backend.repository;

import com.foodsave.backend.domain.enums.NotificationGroupStatus;
import com.foodsave.backend.domain.enums.NotificationWindowType;
import com.foodsave.backend.entity.NotificationGroup;
import com.foodsave.backend.entity.User;
import org.springframework.data.domain.Pageable;
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

    Optional<NotificationGroup> findFirstByUserAndTimeWindowAndScheduledAtAndStatusIn(
            User user,
            NotificationWindowType window,
            LocalDateTime scheduledAt,
            List<NotificationGroupStatus> statuses
    );

    long countByStatusAndCreatedAtBetween(NotificationGroupStatus status, LocalDateTime start, LocalDateTime end);
}
