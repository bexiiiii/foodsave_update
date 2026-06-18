package com.foodsave.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

@Configuration
@EnableJpaAuditing(dateTimeProviderRef = "almatyDateTimeProvider")
@EnableJpaRepositories(basePackages = "com.foodsave.backend.repository")
@EnableTransactionManagement
public class JpaConfig {

    private static final ZoneId DEFAULT_TIME_ZONE = ZoneId.of("Asia/Almaty");

    @Bean
    public DateTimeProvider almatyDateTimeProvider() {
        return () -> Optional.of(LocalDateTime.now(DEFAULT_TIME_ZONE));
    }
}
