package com.foodsave.backend.repository;

import com.foodsave.backend.entity.NotificationFrequencyState;
import com.foodsave.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationFrequencyStateRepository extends JpaRepository<NotificationFrequencyState, Long> {
    Optional<NotificationFrequencyState> findByUser(User user);
}
