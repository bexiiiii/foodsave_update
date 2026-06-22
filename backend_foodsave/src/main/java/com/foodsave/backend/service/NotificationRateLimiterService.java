package com.foodsave.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Задача 8.3 — дедупликация и rate limiting уведомлений через Redis.
 *
 * Дедупликация: не отправлять одно и то же уведомление
 * одному пользователю дважды за 5 минут.
 *
 * Rate limiting: не более 5 уведомлений на пользователя в час.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationRateLimiterService {

    private final StringRedisTemplate stringRedisTemplate;

    private static final int MAX_PER_HOUR = 5;
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofHours(1);
    private static final Duration DEDUP_WINDOW = Duration.ofMinutes(5);

    private static final String RATE_PREFIX = "notif:rate:";
    private static final String DEDUP_PREFIX = "notif:dedup:";

    public boolean allowAndMark(Long userId, String notifType, String contextId) {
        // 1. Проверка дедупликации
        if (isDuplicate(userId, notifType, contextId)) {
            log.debug("Пропущено (дедупликация): user={}, type={}, context={}",
                userId, notifType, contextId);
            return false;
        }

        // 2. Проверка rate limit
        if (isRateLimited(userId)) {
            log.warn("Rate limit exceeded для user={}: более {} уведомлений/час",
                userId, MAX_PER_HOUR);
            return false;
        }

        // 3. Разрешаем и фиксируем
        markSent(userId, notifType, contextId);
        incrementRateCounter(userId);
        return true;
    }

    public boolean allowAndMark(Long userId, String notifType) {
        return allowAndMark(userId, notifType, "broadcast");
    }

    private boolean isDuplicate(Long userId, String notifType, String contextId) {
        String key = DEDUP_PREFIX + userId + ":" + notifType + ":" + contextId;
        return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key));
    }

    private void markSent(Long userId, String notifType, String contextId) {
        String key = DEDUP_PREFIX + userId + ":" + notifType + ":" + contextId;
        stringRedisTemplate.opsForValue().set(key, "1", DEDUP_WINDOW);
    }

    private boolean isRateLimited(Long userId) {
        String key = RATE_PREFIX + userId;
        String countStr = stringRedisTemplate.opsForValue().get(key);
        if (countStr == null) return false;
        return Integer.parseInt(countStr) >= MAX_PER_HOUR;
    }

    private void incrementRateCounter(Long userId) {
        String key = RATE_PREFIX + userId;
        Long count = stringRedisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            stringRedisTemplate.expire(key, RATE_LIMIT_WINDOW);
        }
    }
}
