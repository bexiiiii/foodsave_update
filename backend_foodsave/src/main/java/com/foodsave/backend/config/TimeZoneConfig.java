package com.foodsave.backend.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.util.TimeZone;

@Configuration
public class TimeZoneConfig {

    private static final String DEFAULT_TIME_ZONE_ID = "Asia/Almaty";

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone(DEFAULT_TIME_ZONE_ID));
    }
}
