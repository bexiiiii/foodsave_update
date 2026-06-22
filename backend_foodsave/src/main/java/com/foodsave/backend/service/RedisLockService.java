package com.foodsave.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.function.Supplier;

/**
 * Задача 8.2 — Redis-блокировки при одновременном бронировании.
 * Защищает от race condition когда несколько пользователей
 * одновременно бронируют последний бокс.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RedisLockService {

    private final StringRedisTemplate stringRedisTemplate;

    private static final Duration LOCK_TTL = Duration.ofSeconds(10);
    private static final String LOCK_PREFIX = "lock:product:";

    public <T> T executeWithLock(Long productId, Supplier<T> action) {
        String lockKey = LOCK_PREFIX + productId;
        boolean acquired = acquireLock(lockKey);

        if (!acquired) {
            log.warn("Не удалось получить блокировку для продукта {}: уже бронируется", productId);
            throw new IllegalStateException(
                "Этот продукт сейчас бронируется другим пользователем. " +
                "Пожалуйста, попробуйте через несколько секунд."
            );
        }

        try {
            log.debug("Блокировка получена для продукта {}", productId);
            return action.get();
        } finally {
            releaseLock(lockKey);
            log.debug("Блокировка снята для продукта {}", productId);
        }
    }

    private boolean acquireLock(String lockKey) {
        Boolean result = stringRedisTemplate.opsForValue()
                .setIfAbsent(lockKey, "1", LOCK_TTL);
        return Boolean.TRUE.equals(result);
    }

    private void releaseLock(String lockKey) {
        try {
            stringRedisTemplate.delete(lockKey);
        } catch (Exception e) {
            log.error("Ошибка при снятии блокировки {}: {}", lockKey, e.getMessage());
        }
    }
}
