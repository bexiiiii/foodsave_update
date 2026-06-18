package com.foodsave.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate Limiting Filter для защиты от DDoS атак
 * Ограничивает количество запросов с одного IP адреса
 */
@Component
@Order(1) // Выполняется первым
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    // Конфигурация - увеличенные лимиты для нормальной работы приложения
    private static final int MAX_REQUESTS_PER_MINUTE = 300; // 300 запросов в минуту
    private static final int MAX_AUTH_REQUESTS_PER_MINUTE = 60; // 60 auth запросов в минуту
    private static final long WINDOW_MS = 60_000; // 1 минута
    private static final long BAN_DURATION_MS = 60_000; // 1 минута бан (вместо 5)

    // Хранилище счётчиков запросов по IP
    private final Map<String, RateLimitRecord> requestCounts = new ConcurrentHashMap<>();
    
    // Список заблокированных IP
    private final Map<String, Long> bannedIps = new ConcurrentHashMap<>();

    // Статические блокировки известных атакующих
    private static final String[] PERMANENTLY_BANNED_IPS = {
        "205.185.127.97",
        // Добавьте сюда IP атакующих
    };

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        
        String clientIp = getClientIP(request);
        String path = request.getRequestURI();
        
        // Проверка постоянно заблокированных IP
        for (String bannedIp : PERMANENTLY_BANNED_IPS) {
            if (bannedIp.equals(clientIp)) {
                log.warn("🚫 Blocked permanently banned IP: {}", clientIp);
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write("Access denied");
                return;
            }
        }

        // Проверка временно заблокированных IP
        Long banExpiry = bannedIps.get(clientIp);
        if (banExpiry != null) {
            if (System.currentTimeMillis() < banExpiry) {
                log.warn("🚫 Blocked temporarily banned IP: {} (ban expires in {} sec)", 
                    clientIp, (banExpiry - System.currentTimeMillis()) / 1000);
                response.setStatus(429); // Too Many Requests
                response.setHeader("Retry-After", String.valueOf((banExpiry - System.currentTimeMillis()) / 1000));
                response.getWriter().write("Too many requests. Try again later.");
                return;
            } else {
                bannedIps.remove(clientIp);
            }
        }

        // Определяем лимит в зависимости от пути
        int limit = path.contains("/auth/") ? MAX_AUTH_REQUESTS_PER_MINUTE : MAX_REQUESTS_PER_MINUTE;

        // Проверка rate limit
        if (isRateLimited(clientIp, limit)) {
            log.warn("⚠️ Rate limit exceeded for IP: {} on path: {}", clientIp, path);
            
            // Добавляем временный бан после превышения лимита
            bannedIps.put(clientIp, System.currentTimeMillis() + BAN_DURATION_MS);
            
            response.setStatus(429);
            response.setHeader("Retry-After", "300");
            response.getWriter().write("Rate limit exceeded. You are temporarily banned.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimited(String ip, int limit) {
        long now = System.currentTimeMillis();
        
        RateLimitRecord record = requestCounts.compute(ip, (key, existing) -> {
            if (existing == null || now - existing.windowStart > WINDOW_MS) {
                return new RateLimitRecord(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        return record.count.get() > limit;
    }

    private String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIP = request.getHeader("X-Real-IP");
        if (xRealIP != null && !xRealIP.isEmpty()) {
            return xRealIP;
        }
        
        return request.getRemoteAddr();
    }

    // Вспомогательный класс для хранения данных rate limit
    private static class RateLimitRecord {
        final long windowStart;
        final AtomicInteger count;

        RateLimitRecord(long windowStart, AtomicInteger count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }

    // Очистка старых записей (вызывается периодически)
    public void cleanupOldRecords() {
        long now = System.currentTimeMillis();
        requestCounts.entrySet().removeIf(entry -> 
            now - entry.getValue().windowStart > WINDOW_MS * 2);
        bannedIps.entrySet().removeIf(entry -> 
            now > entry.getValue());
    }
}
