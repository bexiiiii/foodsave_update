package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.TelegramSessionState;
import com.foodsave.backend.entity.TelegramSession;
import com.foodsave.backend.repository.TelegramSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class TelegramSessionService {

    private final TelegramSessionRepository telegramSessionRepository;

    public TelegramSession getOrCreate(Long chatId) {
        return telegramSessionRepository.findById(chatId)
                .orElseGet(() -> {
                    TelegramSession session = new TelegramSession();
                    session.setChatId(chatId);
                    session.setState(TelegramSessionState.NONE);
                    session.setLastInteractionAt(LocalDateTime.now());
                    return telegramSessionRepository.save(session);
                });
    }

    public TelegramSession save(TelegramSession session) {
        session.setLastInteractionAt(LocalDateTime.now());
        return telegramSessionRepository.save(session);
    }

    public void resetSession(Long chatId) {
        telegramSessionRepository.findById(chatId).ifPresent(session -> {
            session.setUserId(null);
            session.setPendingEmail(null);
            session.setPendingValueType(null);
            session.setSelectedProductId(null);
            session.setPendingPage(null);
            session.setState(TelegramSessionState.NONE);
            session.setLastInteractionAt(LocalDateTime.now());
            telegramSessionRepository.save(session);
        });
    }
}
