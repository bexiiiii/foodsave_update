package com.foodsave.backend.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate Limiting Filter - защита от DDoS атак
 * Ограничивает количество запросов с одного IP адреса
 */
@Component
@Slf4j
public class RateLimitConfig implements Filter {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    // Максимум 100 запросов в минуту с одного IP
    private static final int REQUESTS_PER_MINUTE = 100;

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) 
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) servletRequest;
        HttpServletResponse httpResponse = (HttpServletResponse) servletResponse;

        String ip = getClientIP(httpRequest);
        
        // Проверяем на подозрительные протоколы (RTSP, FTP и т.д.)
        String protocol = httpRequest.getProtocol();
        if (protocol != null && !protocol.startsWith("HTTP")) {
            log.warn("🚫 Blocked suspicious protocol from IP {}: {}", ip, protocol);
            httpResponse.setStatus(400);
            httpResponse.getWriter().write("Invalid protocol");
            return;
        }

        Bucket bucket = resolveBucket(ip);

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(servletRequest, servletResponse);
        } else {
            log.warn("🚫 Rate limit exceeded for IP: {} - blocking request", ip);
            httpResponse.setStatus(429); // Too Many Requests
            httpResponse.setHeader("X-Rate-Limit-Retry-After-Seconds", "60");
            httpResponse.getWriter().write("Too many requests. Please try again later.");
        }
    }

    private Bucket resolveBucket(String ip) {
        return cache.computeIfAbsent(ip, k -> createNewBucket());
    }

    private Bucket createNewBucket() {
        Bandwidth limit = Bandwidth.classic(
            REQUESTS_PER_MINUTE,
            Refill.intervally(REQUESTS_PER_MINUTE, Duration.ofMinutes(1))
        );
        return Bucket.builder()
            .addLimit(limit)
            .build();
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || "unknown".equalsIgnoreCase(xfHeader)) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    public void init(FilterConfig filterConfig) {
        log.info("✅ Rate Limiting Filter initialized - max {} requests/minute per IP", REQUESTS_PER_MINUTE);
    }

    public void destroy() {
        cache.clear();
    }
}
