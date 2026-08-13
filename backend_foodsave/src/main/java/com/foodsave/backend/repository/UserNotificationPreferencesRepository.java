package com.foodsave.backend.repository;

import com.foodsave.backend.entity.User;
import com.foodsave.backend.entity.UserNotificationPreferences;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserNotificationPreferencesRepository extends JpaRepository<UserNotificationPreferences, Long> {
    Optional<UserNotificationPreferences> findByUser(User user);
}
