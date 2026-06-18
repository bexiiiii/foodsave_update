package com.foodsave.backend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Set;

/**
 * Фильтр для блокировки подозрительных запросов и добавления security headers
 */
@Component
@Slf4j
public class SecurityHeadersFilter implements Filter {

    // Блокируем неподдерживаемые протоколы
    private static final Set<String> BLOCKED_PROTOCOLS = Set.of(
        "RTSP", "RTP", "RTCP", "SIP", "SMTP", "FTP"
    );

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // Проверка протокола
        String protocol = httpRequest.getProtocol();
        if (!protocol.startsWith("HTTP/")) {
            log.warn("🚫 Blocked non-HTTP protocol: {} from IP: {}", 
                    protocol, getClientIP(httpRequest));
            httpResponse.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        // Блокируем запросы к опасным путям
        String requestURI = httpRequest.getRequestURI();
        if (isDangerousPath(requestURI)) {
            log.warn("🚫 Blocked dangerous path: {} from IP: {}", 
                    requestURI, getClientIP(httpRequest));
            httpResponse.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        // Добавляем security headers
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        httpResponse.setHeader("X-Frame-Options", "DENY");
        httpResponse.setHeader("X-XSS-Protection", "1; mode=block");
        httpResponse.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        httpResponse.setHeader("Referrer-Policy", "no-referrer");

        chain.doFilter(request, response);
    }

    private boolean isDangerousPath(String path) {
        return path.contains("..") ||
               path.contains("//") ||
               path.matches(".*(php|asp|jsp|cgi).*") ||
               path.contains("admin") && !path.startsWith("/api/") ||
               path.contains("setup") ||
               path.contains("install") ||
               path.contains("config.") ||
               path.contains("wp-") ||
               path.contains(".env") ||
               path.contains(".git");
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    public void init(FilterConfig filterConfig) throws ServletException {
        log.info("🛡️ Security Headers Filter initialized");
    }
}
