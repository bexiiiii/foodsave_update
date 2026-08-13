package com.foodsave.backend.repository;

import com.foodsave.backend.domain.enums.NotificationWindowType;
import com.foodsave.backend.entity.NotificationScheduleSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationScheduleSettingRepository extends JpaRepository<NotificationScheduleSetting, Long> {
    Optional<NotificationScheduleSetting> findByCityIdAndNotificationWindowType(Long cityId, NotificationWindowType type);
    Optional<NotificationScheduleSetting> findFirstByCityIdIsNullAndNotificationWindowType(NotificationWindowType type);
    List<NotificationScheduleSetting> findByEnabledTrue();
}
