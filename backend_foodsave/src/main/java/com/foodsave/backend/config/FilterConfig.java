package com.foodsave.backend.config;

import com.foodsave.backend.security.RateLimitFilter;
import com.foodsave.backend.security.SecurityFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * Конфигурация фильтров безопасности
 */
@Configuration
@RequiredArgsConstructor
public class FilterConfig {

    private final SecurityHeadersFilter securityHeadersFilter;
    private final RateLimitFilter rateLimitFilter;
    private final SecurityFilter securityFilter;

    @Bean
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilterRegistration() {
        FilterRegistrationBean<SecurityHeadersFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(securityHeadersFilter);
        registration.addUrlPatterns("/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE); // Самый высокий приоритет
        registration.setName("securityHeadersFilter");
        return registration;
    }

    @Bean
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration() {
        FilterRegistrationBean<RateLimitFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(rateLimitFilter);
        registration.addUrlPatterns("/api/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 1);
        registration.setName("rateLimitFilter");
        return registration;
    }

    @Bean
    public FilterRegistrationBean<SecurityFilter> securityFilterRegistration() {
        FilterRegistrationBean<SecurityFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(securityFilter);
        registration.addUrlPatterns("/api/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 2);
        registration.setName("securityFilter");
        return registration;
    }
}
