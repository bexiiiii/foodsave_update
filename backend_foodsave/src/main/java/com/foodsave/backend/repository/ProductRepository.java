package com.foodsave.backend.repository;

import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.entity.Category;
import com.foodsave.backend.domain.enums.ProductStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    
    // Оптимизированные запросы с EntityGraph для быстрой загрузки
    @EntityGraph(attributePaths = {"store", "category"})
    @Query("SELECT p FROM Product p WHERE p.store.id = :storeId AND p.active = true")
    Page<Product> findLightByStoreId(@Param("storeId") Long storeId, Pageable pageable);
    
    @EntityGraph(attributePaths = {"store", "category"})  
    @Query("SELECT p FROM Product p WHERE p.discountPercentage > 0 AND p.active = true")
    Page<Product> findLightDiscountedProducts(Pageable pageable);

    // Оптимизированные запросы с EntityGraph
    @EntityGraph(attributePaths = {"store", "category"})
    @Query("SELECT p FROM Product p WHERE p.store.id = :storeId AND p.active = true")
    Page<Product> findActiveByStoreIdOptimized(@Param("storeId") Long storeId, Pageable pageable);
    
    @EntityGraph(attributePaths = {"store", "category"})
    @Query("SELECT p FROM Product p WHERE p.discountPercentage > 0 AND p.active = true")
    Page<Product> findDiscountedProductsOptimized(Pageable pageable);
    
    @EntityGraph(attributePaths = {"store", "category"})
    @Query("SELECT p FROM Product p WHERE p.category.id = :categoryId AND p.active = true")
    Page<Product> findByCategoryIdOptimized(@Param("categoryId") Long categoryId, Pageable pageable);

    Page<Product> findByStore(Store store, Pageable pageable);
    
    List<Product> findByStoreId(Long storeId);
    
    // Add method for filtering by multiple store IDs
    Page<Product> findByStoreIdIn(Set<Long> storeIds, Pageable pageable);
    
    Page<Product> findByCategory(Category category, Pageable pageable);
    
    List<Product> findByCategory(Category category);
    
    List<Product> findByStatus(ProductStatus status);
    
    List<Product> findByNameContainingIgnoreCase(String name);
    
    @Query("SELECT p FROM Product p WHERE p.discountPercentage > 0")
    List<Product> findDiscountedProducts();
    
    @Query("SELECT p FROM Product p WHERE p.stockQuantity <= :threshold")
    List<Product> findLowStockProducts(@Param("threshold") Integer threshold);
    
    @Query("SELECT p FROM Product p WHERE p.price BETWEEN :minPrice AND :maxPrice")
    List<Product> findByPriceRange(@Param("minPrice") Double minPrice, @Param("maxPrice") Double maxPrice);

    Page<Product> findByStoreId(Long storeId, Pageable pageable);
    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);
    Page<Product> findByStatus(ProductStatus status, Pageable pageable);
    
    @Query("SELECT p FROM Product p WHERE p.store.id = :storeId AND p.status = :status")
    Page<Product> findByStoreIdAndStatus(@Param("storeId") Long storeId, @Param("status") ProductStatus status, Pageable pageable);
    
    @Query("SELECT p FROM Product p WHERE p.name LIKE %:query% OR p.description LIKE %:query%")
    Page<Product> searchByNameOrDescription(@Param("query") String query, Pageable pageable);
    
    @Query("SELECT p FROM Product p WHERE p.stockQuantity = 0 AND p.active = true")
    List<Product> findOutOfStockProducts();
    
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.store.id = :storeId")
    Page<Product> findActiveByStoreId(@Param("storeId") Long storeId, Pageable pageable);

    Page<Product> findByNameContainingOrDescriptionContaining(String name, String description, Pageable pageable);
    List<Product> findByExpiryDateBefore(LocalDateTime expiryDate);

    List<Product> findByPriceBetween(Double minPrice, Double maxPrice);
    List<Product> findByDiscountPercentageGreaterThan(Double discount);
    List<Product> findByCategoryNameContainingIgnoreCase(String categoryName);
    List<Product> findByStoreIdAndStatus(Long storeId, String status);
    List<Product> findByStoreIdAndCategoryId(Long storeId, Long categoryId);
    List<Product> findByStoreIdAndCategoryIdAndStatus(Long storeId, Long categoryId, String status);
    List<Product> findByStoreIdAndNameContainingIgnoreCase(Long storeId, String name);
    List<Product> findByStoreIdAndNameContainingIgnoreCaseAndCategoryNameContainingIgnoreCase(Long storeId, String name, String categoryName);
    List<Product> findByStoreIdAndNameContainingIgnoreCaseAndCategoryNameContainingIgnoreCaseAndStatus(Long storeId, String name, String categoryName, String status);

    @Query("SELECT p FROM Product p WHERE " +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.category) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Product> searchProducts(@Param("query") String query, Pageable pageable);
    
    Page<Product> findByDiscountPercentageGreaterThan(Double discountPercentage, Pageable pageable);
    
    @EntityGraph(attributePaths = {"store", "category"})
    @Query("SELECT p FROM Product p WHERE p.active = true ORDER BY p.createdAt DESC")
    Page<Product> findAllActiveProducts(Pageable pageable);
    
    // Find all active products with status AVAILABLE (exclude OUT_OF_STOCK and expired)
    @EntityGraph(attributePaths = {"store", "category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.status = 'AVAILABLE' " +
           "AND COALESCE(p.stockQuantity, 0) > 0 " +
           "AND (p.expiryDate IS NULL OR p.expiryDate > CURRENT_TIMESTAMP) ORDER BY p.createdAt DESC")
    Page<Product> findAllActiveAvailableProducts(Pageable pageable);

    // Find products by store with status AVAILABLE (exclude OUT_OF_STOCK and expired)
    @EntityGraph(attributePaths = {"store", "category"})
    @Query("SELECT p FROM Product p WHERE p.store.id = :storeId AND p.active = true AND p.status = 'AVAILABLE' " +
           "AND COALESCE(p.stockQuantity, 0) > 0 " +
           "AND (p.expiryDate IS NULL OR p.expiryDate > CURRENT_TIMESTAMP)")
    Page<Product> findActiveAvailableByStoreId(@Param("storeId") Long storeId, Pageable pageable);
    
    Page<Product> findByStockQuantityLessThanEqual(Integer threshold, Pageable pageable);
    
    Page<Product> findByExpiryDateIsNotNull(Pageable pageable);
    
    List<Product> findByStoreAndActiveTrue(Store store);
    
    List<Product> findByCategoryAndActiveTrue(Category category);
    
    @Query("SELECT COUNT(p) FROM Product p WHERE p.store = :store")
    long countByStore(@Param("store") Store store);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.store.id = :storeId AND p.active = true")
    long countActiveByStoreId(@Param("storeId") Long storeId);

    @Query("SELECT p.category.name as category, COUNT(p) as count FROM Product p WHERE p.store = :store GROUP BY p.category.name")
    Map<String, Long> countByStoreAndCategory(@Param("store") Store store);

    @Query("SELECT p FROM Product p WHERE p.store = :store ORDER BY " +
           "(SELECT COUNT(oi) FROM OrderItem oi WHERE oi.product = p) DESC")
    Page<Product> findTopSellingByStore(@Param("store") Store store, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.store = :store AND p.stockQuantity <= 10 ORDER BY p.stockQuantity ASC")
    Page<Product> findLowStockByStore(@Param("store") Store store, Pageable pageable);

    @Query("SELECT p.status as status, COUNT(p) as count FROM Product p WHERE p.store = :store GROUP BY p.status")
    Map<ProductStatus, Long> countByStoreAndStatus(@Param("store") Store store);
    
    // Method for counting products by multiple store IDs
    @Query("SELECT COUNT(p) FROM Product p WHERE p.store.id IN :storeIds")
    long countByStoreIdIn(@Param("storeIds") List<Long> storeIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
}
