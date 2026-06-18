package com.foodsave.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve uploaded files
        String resourceLocation = "file:" + uploadDir + "/";

        registry.addResourceHandler("/uploads/**", "/api/uploads/**")
                .addResourceLocations(resourceLocation)
                .setCachePeriod(3600); // Cache for 1 hour
    }
}
