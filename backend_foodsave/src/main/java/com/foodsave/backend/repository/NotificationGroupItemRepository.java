package com.foodsave.backend.repository;

import com.foodsave.backend.entity.NotificationGroup;
import com.foodsave.backend.entity.NotificationGroupItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

@Repository
public interface NotificationGroupItemRepository extends JpaRepository<NotificationGroupItem, Long> {
    boolean existsByNotificationGroupAndBoxId(NotificationGroup notificationGroup, Long boxId);

    @Query("SELECT COUNT(i) > 0 FROM NotificationGroupItem i " +
            "WHERE i.notificationGroup.user.id = :userId AND i.box.id = :boxId " +
            "AND i.notificationGroup.status = com.foodsave.backend.domain.enums.NotificationGroupStatus.SENT " +
            "AND i.notificationGroup.sentAt >= :since")
    boolean existsRecentlySentToUser(@Param("userId") Long userId,
                                     @Param("boxId") Long boxId,
                                     @Param("since") LocalDateTime since);
}
