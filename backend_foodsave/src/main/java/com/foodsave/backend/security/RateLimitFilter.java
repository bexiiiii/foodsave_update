package com.foodsave.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
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
    private static final int MAX_PUBLIC_READS_PER_MINUTE = 1200;
    private static final int MAX_MUTATIONS_PER_MINUTE = 120;
    private static final int MAX_ANALYTICS_EVENTS_PER_MINUTE = 600;
    private static final int MAX_AUTH_REQUESTS_PER_MINUTE = 30;
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

        RequestBucket bucket = resolveBucket(request, path);
        int limit = switch (bucket) {
            case AUTH -> MAX_AUTH_REQUESTS_PER_MINUTE;
            case ANALYTICS -> MAX_ANALYTICS_EVENTS_PER_MINUTE;
            case PUBLIC_READ -> MAX_PUBLIC_READS_PER_MINUTE;
            case MUTATION -> MAX_MUTATIONS_PER_MINUTE;
        };

        // Проверка rate limit
        if (isRateLimited(clientIp + ":" + bucket.name(), limit)) {
            log.warn("⚠️ Rate limit exceeded for IP: {} on path: {}", clientIp, path);
            
            // Only repeated authentication abuse blocks the whole client. Catalogue
            // reads and telemetry may be bursty in a Telegram WebView.
            if (bucket == RequestBucket.AUTH) {
                bannedIps.put(clientIp, System.currentTimeMillis() + BAN_DURATION_MS);
            }
            
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.getWriter().write("Rate limit exceeded. Try again later.");
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
            return normalizeClientAddress(xForwardedFor.split(",")[0].trim());
        }
        
        String xRealIP = request.getHeader("X-Real-IP");
        if (xRealIP != null && !xRealIP.isEmpty()) {
            return normalizeClientAddress(xRealIP);
        }
        
        return normalizeClientAddress(request.getRemoteAddr());
    }

    private RequestBucket resolveBucket(HttpServletRequest request, String path) {
        if (path.contains("/auth/")) return RequestBucket.AUTH;
        if (path.equals("/api/analytics/events")) return RequestBucket.ANALYTICS;
        if ("GET".equals(request.getMethod()) || "HEAD".equals(request.getMethod())) {
            return RequestBucket.PUBLIC_READ;
        }
        return RequestBucket.MUTATION;
    }

    private String normalizeClientAddress(String address) {
        if (address == null || address.isBlank()) return "unknown";
        String normalized = address.trim();
        if (normalized.startsWith("[") && normalized.contains("]")) {
            return normalized.substring(1, normalized.indexOf(']'));
        }
        if (normalized.matches("^\\d{1,3}(?:\\.\\d{1,3}){3}:\\d+$")) {
            return normalized.substring(0, normalized.lastIndexOf(':'));
        }
        return normalized;
    }

    private enum RequestBucket {
        AUTH,
        ANALYTICS,
        PUBLIC_READ,
        MUTATION
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
    @Scheduled(fixedRate = 120_000)
    public void cleanupOldRecords() {
        long now = System.currentTimeMillis();
        requestCounts.entrySet().removeIf(entry -> 
            now - entry.getValue().windowStart > WINDOW_MS * 2);
        bannedIps.entrySet().removeIf(entry -> 
            now > entry.getValue());
    }
}
