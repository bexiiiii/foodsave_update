package com.foodsave.backend.repository;

import com.foodsave.backend.entity.NotificationGroup;
import com.foodsave.backend.entity.NotificationGroupItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationGroupItemRepository extends JpaRepository<NotificationGroupItem, Long> {
    boolean existsByNotificationGroupAndBoxId(NotificationGroup notificationGroup, Long boxId);
}
