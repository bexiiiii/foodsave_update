package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.ProductStatus;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProductExpiryScheduler {

    private final ProductRepository productRepository;

    /**
     * Runs every 10 minutes. Marks products whose expiryDate has passed as EXPIRED
     * and deactivates them so they no longer appear in the mini app.
     */
    @Scheduled(fixedRate = 10 * 60 * 1000)
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "products", allEntries = true),
            @CacheEvict(value = "productsByStore", allEntries = true),
            @CacheEvict(value = "featuredProducts", allEntries = true),
            @CacheEvict(value = "discountedProducts", allEntries = true)
    })
    public void expireProducts() {
        LocalDateTime now = LocalDateTime.now();
        List<Product> expired = productRepository.findByExpiryDateBefore(now).stream()
                .filter(p -> p.getStatus() != ProductStatus.EXPIRED
                        && p.getStatus() != ProductStatus.DISCONTINUED)
                .toList();

        if (expired.isEmpty()) {
            return;
        }

        for (Product product : expired) {
            product.setStatus(ProductStatus.EXPIRED);
            product.setActive(false);
        }
        productRepository.saveAll(expired);
        log.info("Expired {} products with past expiryDate", expired.size());
    }
}
