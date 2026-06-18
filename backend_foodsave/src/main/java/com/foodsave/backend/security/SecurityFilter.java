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
import java.util.regex.Pattern;

/**
 * Фильтр для блокировки подозрительных/вредоносных запросов
 * Защита от: SQL Injection, XSS, Path Traversal, и других атак
 */
@Component
@Order(2) // После RateLimitFilter
@Slf4j
public class SecurityFilter extends OncePerRequestFilter {

    // Паттерны атак для блокировки
    private static final Pattern[] BLOCKED_PATTERNS = {
        // Path Traversal
        Pattern.compile("\\.\\.[\\\\/]", Pattern.CASE_INSENSITIVE),
        Pattern.compile("%2e%2e[\\\\/]", Pattern.CASE_INSENSITIVE),
        
        // SQL Injection
        Pattern.compile("('|\")(\\s)*(or|and|union|select|insert|update|delete|drop|create|alter|exec|execute)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("--\\s*$", Pattern.MULTILINE),
        
        // XSS
        Pattern.compile("<script", Pattern.CASE_INSENSITIVE),
        Pattern.compile("javascript:", Pattern.CASE_INSENSITIVE),
        Pattern.compile("onerror\\s*=", Pattern.CASE_INSENSITIVE),
        Pattern.compile("onload\\s*=", Pattern.CASE_INSENSITIVE),
        Pattern.compile("onclick\\s*=", Pattern.CASE_INSENSITIVE),
        
        // Command Injection
        Pattern.compile("[;|`$]", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\$\\(", Pattern.CASE_INSENSITIVE),
        
        // RTSP/Protocol Attacks (то что вы видели в логах)
        Pattern.compile("^RTSP/", Pattern.CASE_INSENSITIVE),
        Pattern.compile("^OPTIONS\\s+\\*", Pattern.CASE_INSENSITIVE),
        
        // Prototype Pollution
        Pattern.compile("__proto__", Pattern.CASE_INSENSITIVE),
        Pattern.compile("constructor\\[", Pattern.CASE_INSENSITIVE),
        
        // Common attack payloads
        Pattern.compile("returnNaN", Pattern.CASE_INSENSITIVE),
        Pattern.compile("/etc/passwd", Pattern.CASE_INSENSITIVE),
        Pattern.compile("/proc/self", Pattern.CASE_INSENSITIVE),
        Pattern.compile("eval\\(", Pattern.CASE_INSENSITIVE),
    };

    // Заблокированные User-Agents (сканеры и боты)
    private static final String[] BLOCKED_USER_AGENTS = {
        "sqlmap",
        "nikto",
        "nmap",
        "masscan",
        "zgrab",
        "gobuster",
        "dirbuster",
        "wfuzz",
        "burpsuite",
        "nessus",
        "openvas",
        "acunetix",
    };

    // Заблокированные пути (сканирование уязвимостей)
    private static final String[] BLOCKED_PATHS = {
        "/wp-admin",
        "/wp-login",
        "/wp-content",
        "/phpmyadmin",
        "/pma",
        "/admin.php",
        "/shell",
        "/cmd",
        "/phpunit",
        "/.env",
        "/.git",
        "/config.php",
        "/backup",
        "/db.sql",
        "/vendor/phpunit",
        "/cgi-bin",
        "/manager/html",
    };

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                   HttpServletResponse response,
                                   FilterChain filterChain) throws ServletException, IOException {
        
        String path = request.getRequestURI();
        String queryString = request.getQueryString();
        String userAgent = request.getHeader("User-Agent");
        String method = request.getMethod();
        String clientIp = getClientIP(request);

        // 1. Проверка метода запроса
        if (!isValidMethod(method)) {
            log.warn("🚫 Blocked invalid HTTP method: {} from IP: {}", method, clientIp);
            response.setStatus(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
            return;
        }

        // 2. Проверка User-Agent
        if (isBlockedUserAgent(userAgent)) {
            log.warn("🚫 Blocked scanner/bot User-Agent: {} from IP: {}", userAgent, clientIp);
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        // 3. Проверка заблокированных путей
        if (isBlockedPath(path)) {
            log.warn("🚫 Blocked suspicious path: {} from IP: {}", path, clientIp);
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        // 4. Проверка атак в URL
        String fullUrl = queryString != null ? path + "?" + queryString : path;
        if (containsAttackPattern(fullUrl)) {
            log.warn("🚫 Blocked attack pattern in URL: {} from IP: {}", fullUrl, clientIp);
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        // 5. Проверка атак в заголовках
        if (containsAttackInHeaders(request)) {
            log.warn("🚫 Blocked attack pattern in headers from IP: {}", clientIp);
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isValidMethod(String method) {
        return method != null && (
            method.equals("GET") ||
            method.equals("POST") ||
            method.equals("PUT") ||
            method.equals("PATCH") ||
            method.equals("DELETE") ||
            method.equals("OPTIONS") ||
            method.equals("HEAD")
        );
    }

    private boolean isBlockedUserAgent(String userAgent) {
        if (userAgent == null) {
            return false;
        }
        String lowerUA = userAgent.toLowerCase();
        for (String blocked : BLOCKED_USER_AGENTS) {
            if (lowerUA.contains(blocked)) {
                return true;
            }
        }
        return false;
    }

    private boolean isBlockedPath(String path) {
        if (path == null) {
            return false;
        }
        String lowerPath = path.toLowerCase();
        for (String blocked : BLOCKED_PATHS) {
            if (lowerPath.contains(blocked)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsAttackPattern(String input) {
        if (input == null) {
            return false;
        }
        for (Pattern pattern : BLOCKED_PATTERNS) {
            if (pattern.matcher(input).find()) {
                return true;
            }
        }
        return false;
    }

    private boolean containsAttackInHeaders(HttpServletRequest request) {
        // Проверяем критичные заголовки
        String[] headersToCheck = {"Referer", "Origin", "X-Forwarded-Host", "Host"};
        for (String headerName : headersToCheck) {
            String value = request.getHeader(headerName);
            if (containsAttackPattern(value)) {
                return true;
            }
        }
        return false;
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
}
