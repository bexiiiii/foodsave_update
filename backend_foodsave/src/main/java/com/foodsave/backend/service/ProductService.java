package com.foodsave.backend.service;

import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.entity.Category;
import com.foodsave.backend.dto.ProductDTO;
import com.foodsave.backend.exception.InsufficientStockException;
import com.foodsave.backend.repository.ProductRepository;
import com.foodsave.backend.repository.StoreRepository;
import com.foodsave.backend.repository.CategoryRepository;
import com.foodsave.backend.domain.enums.ProductStatus;
import com.foodsave.backend.util.SecurityUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.core.task.TaskExecutor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final CategoryRepository categoryRepository;
    private final SecurityUtil securityUtil;
    private final com.foodsave.backend.repository.UserRepository userRepository;
    private final TelegramBotService telegramBotService;
    private final TaskExecutor telegramNotificationExecutor;

    public ProductService(ProductRepository productRepository,
                          StoreRepository storeRepository,
                          CategoryRepository categoryRepository,
                          SecurityUtil securityUtil,
                          com.foodsave.backend.repository.UserRepository userRepository,
                          TelegramBotService telegramBotService,
                          @Qualifier("telegramNotificationExecutor") TaskExecutor telegramNotificationExecutor) {
        this.productRepository = productRepository;
        this.storeRepository = storeRepository;
        this.categoryRepository = categoryRepository;
        this.securityUtil = securityUtil;
        this.userRepository = userRepository;
        this.telegramBotService = telegramBotService;
        this.telegramNotificationExecutor = telegramNotificationExecutor;
    }

    public Page<ProductDTO> getAllProducts(Pageable pageable) {
        log.info("DEBUG: Getting all products");
        log.info("DEBUG: Current user admin check: {}", securityUtil.isCurrentUserAdmin());
        
        if (securityUtil.isCurrentUserAdmin()) {
            // Super admins see all products
            log.info("DEBUG: User is admin, fetching all products");
            Page<Product> products = productRepository.findAll(pageable);
            log.info("DEBUG: Found {} products in database", products.getTotalElements());
            return products.map(this::convertToDTO);
        } else {
            // Check if user is a store manager
            org.springframework.security.core.Authentication authentication = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            
            if (authentication != null && authentication.getPrincipal() instanceof com.foodsave.backend.security.UserPrincipal) {
                com.foodsave.backend.security.UserPrincipal userPrincipal = 
                    (com.foodsave.backend.security.UserPrincipal) authentication.getPrincipal();
                
                if (userPrincipal.getRole() == com.foodsave.backend.domain.enums.UserRole.STORE_MANAGER) {
                    // Manager sees only products from their managed store
                    log.info("DEBUG: User is store manager, fetching managed store products");
                    Long managedStoreId = getCurrentManagedStoreId(userPrincipal.getId());
                    if (managedStoreId != null) {
                        Page<Product> products = productRepository.findByStoreId(managedStoreId, pageable);
                        log.info("DEBUG: Found {} products for managed store {}", products.getTotalElements(), managedStoreId);
                        return products.map(this::convertToDTO);
                    }
                }
            }
            
            // Store users see only their store's products
            log.info("DEBUG: User is store owner, fetching store products");
            Set<Long> userStoreIds = securityUtil.getCurrentUserStoreIds();
            log.info("DEBUG: User store IDs: {}", userStoreIds);
            if (userStoreIds.isEmpty()) {
                return Page.empty(pageable);
            }
            return productRepository.findByStoreIdIn(userStoreIds, pageable)
                    .map(this::convertToDTO);
        }
    }

    private Long getCurrentManagedStoreId(Long managerId) {
        try {
            log.info("DEBUG: Looking for managed store for manager ID: {}", managerId);
            com.foodsave.backend.entity.User manager = userRepository.findById(managerId).orElse(null);
            
            if (manager == null) {
                log.warn("DEBUG: Manager with ID {} not found in database", managerId);
                return null;
            }
            
            log.info("DEBUG: Found manager: id={}, username={}, role={}", 
                manager.getId(), manager.getUsername(), manager.getRole());
            
            // Поиск заведения, которым управляет данный менеджер
            Optional<com.foodsave.backend.entity.Store> storeOpt = 
                storeRepository.findByManager(manager);
            
            if (storeOpt.isPresent()) {
                Long storeId = storeOpt.get().getId();
                log.info("DEBUG: Found managed store: id={}, name={}", storeId, storeOpt.get().getName());
                return storeId;
            } else {
                log.warn("DEBUG: No store found for manager ID: {}", managerId);
                log.info("DEBUG: Checking if manager has stores via findAllByManager...");
                List<com.foodsave.backend.entity.Store> allStores = storeRepository.findAllByManager(manager);
                log.info("DEBUG: Found {} stores via findAllByManager", allStores.size());
                if (!allStores.isEmpty()) {
                    Long storeId = allStores.get(0).getId();
                    log.info("DEBUG: Using first store from list: id={}, name={}", storeId, allStores.get(0).getName());
                    return storeId;
                }
            }
        } catch (Exception e) {
            log.error("Error finding managed store: ", e);
        }
        log.warn("DEBUG: Returning null - no managed store found");
        return null;
    }

    public ProductDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        return convertToDTO(product);
    }

    // Note: Page objects don't cache well with Redis due to serialization issues
    public Page<ProductDTO> getProductsByStore(Long storeId, Pageable pageable) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("Store not found"));
        
        // Check if current user is manager of this store
        org.springframework.security.core.Authentication authentication = 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof com.foodsave.backend.security.UserPrincipal) {
            com.foodsave.backend.security.UserPrincipal userPrincipal = 
                (com.foodsave.backend.security.UserPrincipal) authentication.getPrincipal();
            
            if (userPrincipal.getRole() == com.foodsave.backend.domain.enums.UserRole.STORE_MANAGER) {
                Long managedStoreId = getCurrentManagedStoreId(userPrincipal.getId());
                // If manager is viewing their own store, show all products (including OUT_OF_STOCK)
                if (managedStoreId != null && managedStoreId.equals(storeId)) {
                    log.info("Manager {} viewing their store {} products", userPrincipal.getId(), storeId);
                    return productRepository.findByStoreId(storeId, pageable)
                            .map(this::convertToDTO);
                }
            }
        }
        
        // For regular users, only show AVAILABLE products (exclude OUT_OF_STOCK)
        return productRepository.findActiveAvailableByStoreId(storeId, pageable)
                .map(this::convertToDTO);
    }

    @Cacheable(value = "categories", key = "'ALL'")
    public List<String> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(Category::getName)
                .collect(Collectors.toList());
    }

    // Note: Page objects don't cache well with Redis due to serialization issues
    public Page<ProductDTO> getFeaturedProducts(Pageable pageable) {
        // Return all active products with status AVAILABLE (exclude OUT_OF_STOCK)
        return productRepository.findAllActiveAvailableProducts(pageable)
                .map(this::convertToDTO);
    }

    @Caching(evict = {
            @CacheEvict(value = "products", allEntries = true),
            @CacheEvict(value = "productsByStore", allEntries = true),
            @CacheEvict(value = "featuredProducts", allEntries = true),
            @CacheEvict(value = "discountedProducts", allEntries = true),
            @CacheEvict(value = "categories", allEntries = true)
    })
    public ProductDTO createProduct(ProductDTO productDTO) {
        Store store = storeRepository.findById(productDTO.getStoreId())
                .orElseThrow(() -> new EntityNotFoundException("Store not found"));
        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new EntityNotFoundException("Category not found"));

        Product product = new Product();
        updateProductFromDTO(product, productDTO);
        product.setStore(store);
        product.setCategory(category);
        ProductDTO saved = convertToDTO(productRepository.save(product));
        scheduleNewProductNotification(saved);
        return saved;
    }

    private void scheduleNewProductNotification(ProductDTO product) {
        if (product == null || product.getId() == null) {
            return;
        }

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    executeNewProductNotification(product);
                }
            });
            return;
        }

        executeNewProductNotification(product);
    }

    private void executeNewProductNotification(ProductDTO product) {
        try {
            telegramNotificationExecutor.execute(() -> sendNewProductNotification(product));
        } catch (Exception e) {
            log.error("Failed to enqueue new product notification for product id={}, sending inline",
                    product.getId(), e);
            sendNewProductNotification(product);
        }
    }

    private void sendNewProductNotification(ProductDTO product) {
        if (product == null) return;
        try {
            java.util.List<com.foodsave.backend.entity.User> telegramUsers = userRepository.findByTelegramUserTrue();
            if (telegramUsers.isEmpty()) return;

            BigDecimal originalPrice = product.getOriginalPrice();
            BigDecimal discountedPrice = product.getPrice() != null ? product.getPrice() : BigDecimal.ZERO;
            Double discountPct = product.getDiscountPercentage();
            String storeName = product.getStoreName() != null ? product.getStoreName() : "";

            StringBuilder text = new StringBuilder();
            text.append("<b>").append(product.getName()).append("</b>\n");
            if (storeName != null && !storeName.isBlank()) {
                text.append(storeName).append("\n");
            }
            text.append("\n");

            if (originalPrice != null && originalPrice.compareTo(BigDecimal.ZERO) > 0) {
                text.append("Цена: ").append(formatNotifPrice(discountedPrice))
                    .append("  <s>").append(formatNotifPrice(originalPrice)).append("</s>\n");
                BigDecimal savings = originalPrice.subtract(discountedPrice);
                if (savings.compareTo(BigDecimal.ZERO) > 0) {
                    text.append("Экономия: ").append(formatNotifPrice(savings)).append("\n");
                }
                if (discountPct != null && discountPct > 0) {
                    text.append("Скидка: ").append(String.format("%.0f", discountPct)).append("%\n");
                }
            } else {
                text.append("Цена: ").append(formatNotifPrice(discountedPrice)).append("\n");
            }

                String imageUrl = product.getImageUrl();
            String productUrl = telegramBotService.resolveButtonUrl("/details/" + product.getId());

            int sentCount = 0;
            int failedCount = 0;

            for (com.foodsave.backend.entity.User user : telegramUsers) {
                if (user.getTelegramUserId() == null) continue;
                try {
                    boolean sent = telegramBotService.sendMessage(
                            user.getTelegramUserId(),
                            new TelegramBotService.TelegramMessagePayload(
                                    text.toString(), imageUrl, "Забронировать", productUrl
                            )
                    );
                    if (sent) {
                        sentCount++;
                    } else {
                        failedCount++;
                    }
                } catch (Exception e) {
                    failedCount++;
                    log.warn("Failed to notify user {} about new product", user.getTelegramUserId(), e);
                }
            }
            log.info("New product notification for product {} finished: sent={}, failed={}, telegramUsers={}",
                    product.getId(), sentCount, failedCount, telegramUsers.size());
        } catch (Exception e) {
            log.error("Failed to send new product notifications", e);
        }
    }

    private String formatNotifPrice(BigDecimal value) {
        if (value == null) return "0 ₸";
        String formatted = String.format(java.util.Locale.US, "%,.0f ₸", value.doubleValue());
        return formatted.replace(',', ' ');
    }

    @Caching(evict = {
            @CacheEvict(value = "products", key = "#id"),
            @CacheEvict(value = "productsByStore", allEntries = true),
            @CacheEvict(value = "featuredProducts", allEntries = true),
            @CacheEvict(value = "discountedProducts", allEntries = true)
    })
    public ProductDTO updateProduct(Long id, ProductDTO productDTO) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new EntityNotFoundException("Category not found"));
        
        updateProductFromDTO(product, productDTO);
        product.setCategory(category);
        return convertToDTO(productRepository.save(product));
    }

    @Caching(evict = {
            @CacheEvict(value = "products", key = "#id"),
            @CacheEvict(value = "productsByStore", allEntries = true),
            @CacheEvict(value = "featuredProducts", allEntries = true),
            @CacheEvict(value = "discountedProducts", allEntries = true)
    })
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

    // Note: Page objects don't cache well with Redis due to serialization issues
    public Page<ProductDTO> searchProducts(String query, Pageable pageable) {
        return productRepository.searchProducts(query, pageable)
                .map(this::convertToDTO);
    }

    // Note: Page objects don't cache well with Redis due to serialization issues
    public Page<ProductDTO> getProductsByCategory(Long categoryId, Pageable pageable) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new EntityNotFoundException("Category not found"));
        return productRepository.findByCategory(category, pageable)
                .map(this::convertToDTO);
    }

    // Note: Page objects don't cache well with Redis due to serialization issues
    public Page<ProductDTO> getDiscountedProducts(Pageable pageable) {
        return productRepository.findByDiscountPercentageGreaterThan(0.0, pageable)
                .map(this::convertToDTO);
    }

    // Note: Page objects don't cache well with Redis due to serialization issues
    public Page<ProductDTO> getLowStockProducts(Integer threshold, Pageable pageable) {
        return productRepository.findByStockQuantityLessThanEqual(threshold, pageable)
                .map(this::convertToDTO);
    }

    public Page<ProductDTO> getExpiringProducts(Pageable pageable) {
        return productRepository.findByExpiryDateIsNotNull(pageable)
                .map(this::convertToDTO);
    }

    @Caching(evict = {
            @CacheEvict(value = "products", key = "#id"),
            @CacheEvict(value = "productsByStore", allEntries = true),
            @CacheEvict(value = "featuredProducts", allEntries = true),
            @CacheEvict(value = "discountedProducts", allEntries = true)
    })
    public ProductDTO updateProductStatus(Long id, ProductStatus status) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        product.setStatus(status);
        return convertToDTO(productRepository.save(product));
    }

    /**
     * Update stock quantity for a product
     */
    @Caching(evict = {
            @CacheEvict(value = "products", key = "#productId"),
            @CacheEvict(value = "productsByStore", allEntries = true),
            @CacheEvict(value = "featuredProducts", allEntries = true),
            @CacheEvict(value = "discountedProducts", allEntries = true)
    })
    public ProductDTO updateStockQuantity(Long productId, Integer newQuantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        
        if (newQuantity < 0) {
            throw new IllegalArgumentException("Stock quantity cannot be negative");
        }
        
        product.setStockQuantity(newQuantity);
        return convertToDTO(productRepository.save(product));
    }

    @Caching(evict = {
            @CacheEvict(value = "products", key = "#productId"),
            @CacheEvict(value = "productsByStore", allEntries = true),
            @CacheEvict(value = "featuredProducts", allEntries = true),
            @CacheEvict(value = "discountedProducts", allEntries = true)
    })
    public ProductDTO updateProductPrices(Long productId,
                                          BigDecimal originalPrice,
                                          BigDecimal discountedPrice) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));

        if (discountedPrice == null || discountedPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Цена со скидкой должна быть больше нуля");
        }

        if (originalPrice != null && originalPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Цена без скидки должна быть больше нуля");
        }

        product.setPrice(discountedPrice);
        product.setOriginalPrice(originalPrice);
        product.setDiscountPercentage(calculateDiscountPercentage(originalPrice, discountedPrice));

        return convertToDTO(productRepository.save(product));
    }

    /**
     * Reduce stock quantity by specified amount
     */
    @Deprecated
    @Caching(evict = {
            @CacheEvict(value = "products", key = "#productId"),
            @CacheEvict(value = "productsByStore", allEntries = true),
            @CacheEvict(value = "featuredProducts", allEntries = true),
            @CacheEvict(value = "discountedProducts", allEntries = true)
    })
    public ProductDTO reduceStockQuantity(Long productId, Integer quantity) {
        int normalizedQuantity = (quantity != null && quantity > 0) ? quantity : 1;
        Product product = decreaseStockWithLock(productId, normalizedQuantity);
        return convertToDTO(product);
    }

    @Caching(evict = {
            @CacheEvict(value = "products", key = "#productId"),
            @CacheEvict(value = "productsByStore", allEntries = true),
            @CacheEvict(value = "featuredProducts", allEntries = true),
            @CacheEvict(value = "discountedProducts", allEntries = true)
    })
    public Product reserveProductStock(Long productId, int quantity) {
        return decreaseStockWithLock(productId, quantity);
    }

    /**
     * Check if product has sufficient stock
     */
    public boolean hasSufficientStock(Long productId, Integer requiredQuantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        int requested = requiredQuantity != null ? requiredQuantity : 0;
        int available = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        return available >= requested;
    }

    private Product decreaseStockWithLock(Long productId, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Requested quantity must be greater than zero");
        }

        Product product = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));

        // Check if product is active
        if (!Boolean.TRUE.equals(product.getActive())) {
            throw new IllegalStateException("Этот продукт недоступен для бронирования");
        }

        int currentStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        if (currentStock < quantity) {
            log.warn("Insufficient stock for product {} (requested={}, available={})",
                    productId, quantity, currentStock);
            throw new InsufficientStockException(String.format(
                    "Недостаточно остатков: доступно %d, запрошено %d", currentStock, quantity));
        }

        product.setStockQuantity(currentStock - quantity);
        return productRepository.save(product);
    }

    private ProductDTO convertToDTO(Product product) {
        BigDecimal discountedPrice = product.getPrice() != null ? product.getPrice() : BigDecimal.ZERO;
        BigDecimal originalPrice = product.getOriginalPrice();
        Double discountPercentage = product.getDiscountPercentage();
        Integer stockQuantity = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        List<String> images = product.getImages() != null ? product.getImages() : Collections.emptyList();
        boolean isActive = Boolean.TRUE.equals(product.getActive());

        return ProductDTO.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(discountedPrice)
                .originalPrice(originalPrice)
                .discountPercentage(discountPercentage)
                .stockQuantity(stockQuantity)
                .storeId(product.getStore().getId())
                .storeName(product.getStore().getName())
                .storeLogo(product.getStore().getLogo())
                .storeAddress(product.getStore().getAddress())
                .categoryId(product.getCategory().getId())
                .categoryName(product.getCategory().getName())
                .images(images)
                .expiryDate(product.getExpiryDate())
                .status(product.getStatus())
                .active(product.getActive())
                // Computed properties for frontend compatibility
                .isAvailable(isActive &&
                        product.getStatus() == ProductStatus.AVAILABLE &&
                        stockQuantity > 0)
                .availableQuantity(stockQuantity)
                .imageUrl(!images.isEmpty() ? images.get(0) : null)
                .expirationDate(product.getExpiryDate() != null ? product.getExpiryDate().toString() : null)
                .isFeatured(discountPercentage != null && discountPercentage > 0)
                .rating(0.0) // Default rating for now
                .build();
    }

    private Double calculateDiscountPercentage(BigDecimal originalPrice, BigDecimal discountedPrice) {
        if (originalPrice == null || originalPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        if (discountedPrice == null || discountedPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        if (discountedPrice.compareTo(originalPrice) >= 0) {
            return 0.0;
        }
        BigDecimal discount = originalPrice.subtract(discountedPrice)
                .divide(originalPrice, 4, java.math.RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        return discount.doubleValue();
    }

    private void updateProductFromDTO(Product product, ProductDTO dto) {
        product.setName(dto.getName());
        product.setDescription(dto.getDescription());
        
        // Set original price and discount percentage
        BigDecimal originalPrice = dto.getOriginalPrice() != null ? dto.getOriginalPrice() : product.getOriginalPrice();
        Double discountPercentage = dto.getDiscountPercentage() != null 
                ? dto.getDiscountPercentage() 
                : product.getDiscountPercentage();
        
        product.setOriginalPrice(originalPrice);
        product.setDiscountPercentage(discountPercentage);
        
        // Auto-calculate price from originalPrice and discountPercentage
        BigDecimal calculatedPrice = calculateDiscountedPrice(originalPrice, discountPercentage);
        product.setPrice(calculatedPrice);
        
        product.setStockQuantity(resolveStockQuantity(dto.getStockQuantity(), product.getStockQuantity()));
        if (dto.getImages() != null) {
            product.setImages(dto.getImages());
        } else if (product.getImages() == null) {
            product.setImages(new ArrayList<>());
        }
        product.setExpiryDate(dto.getExpiryDate());
        product.setStatus(dto.getStatus());
        product.setActive(dto.getActive());
    }
    
    /**
     * Calculate discounted price from original price and discount percentage
     * Formula: price = originalPrice * (1 - discountPercentage/100)
     */
    private BigDecimal calculateDiscountedPrice(BigDecimal originalPrice, Double discountPercentage) {
        if (originalPrice == null) {
            return BigDecimal.ZERO;
        }
        
        if (discountPercentage == null || discountPercentage <= 0) {
            // No discount, return original price
            return originalPrice;
        }
        
        // Calculate discount: price = originalPrice * (1 - discountPercentage/100)
        BigDecimal discountMultiplier = BigDecimal.ONE.subtract(
            BigDecimal.valueOf(discountPercentage).divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP)
        );
        
        return originalPrice.multiply(discountMultiplier).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private Integer resolveStockQuantity(Integer requestedQuantity, Integer currentQuantity) {
        if (requestedQuantity != null) {
            return Math.max(requestedQuantity, 0);
        }
        return currentQuantity;
    }
}
