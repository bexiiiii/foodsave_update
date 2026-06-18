package com.foodsave.backend.repository;

import com.foodsave.backend.entity.NotificationSettings;
import com.foodsave.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationSettingsRepository extends JpaRepository<NotificationSettings, Long> {
    Optional<NotificationSettings> findByUser(User user);
} 