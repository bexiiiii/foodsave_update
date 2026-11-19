package com.foodsave.backend.repository;

import com.foodsave.backend.entity.User;
import com.foodsave.backend.entity.UserNotificationPreferences;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserNotificationPreferencesRepository extends JpaRepository<UserNotificationPreferences, Long> {
    Optional<UserNotificationPreferences> findByUser(User user);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("""
            update UserNotificationPreferences p set p.telegramDeliveryFailure = null
            where p.user.telegramUserId = :telegramId and p.telegramDeliveryFailure is not null
            """)
    void clearDeliveryFailure(@org.springframework.data.repository.query.Param("telegramId") Long telegramId);

}
