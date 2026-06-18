package com.foodsave.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class CacheCleanup {

    private final CacheManager cacheManager;

    private static final List<String> DEPRECATED_CACHES = List.of(
            "storeProductsCache",
            "featuredProductsCache",
            "discountedProductsCache",
            "productByIdCache"
    );

    @PostConstruct
    public void clearDeprecatedCaches() {
        DEPRECATED_CACHES.forEach(cacheName -> {
            Cache cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                cache.clear();
                log.info("Cleared deprecated cache '{}'", cacheName);
            }
        });
    }
}
