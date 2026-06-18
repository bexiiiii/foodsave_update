package com.foodsave.backend.repository;

import com.foodsave.backend.entity.TelegramSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TelegramSessionRepository extends JpaRepository<TelegramSession, Long> {
}
