package com.foodsave.backend.repository;

import com.foodsave.backend.entity.Order;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.PaymentMethod;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    // Оптимизированные запросы с EntityGraph для избежания N+1 проблем
    @EntityGraph(attributePaths = {"items", "items.product", "store", "user"})
    @Query("SELECT o FROM Order o WHERE o.user = :user ORDER BY o.createdAt DESC")
    List<Order> findByUserWithItemsOptimized(@Param("user") User user);
    
    @EntityGraph(attributePaths = {"items", "items.product", "store", "user"})
    @Query("SELECT o FROM Order o WHERE o.store = :store ORDER BY o.createdAt DESC") 
    List<Order> findByStoreWithItemsOptimized(@Param("store") Store store);
    
    @EntityGraph(attributePaths = {"items", "items.product", "store", "user"})
    @Query("SELECT o FROM Order o WHERE o.store.id IN :storeIds ORDER BY o.createdAt DESC")
    List<Order> findByStoreIdInWithItemsOptimized(@Param("storeIds") Set<Long> storeIds);

    @Query("SELECT o FROM Order o WHERE o.user = :user")
    List<Order> findByUser(@Param("user") User user);
    
    @Query("SELECT o FROM Order o WHERE o.user = :user ORDER BY o.createdAt DESC")
    List<Order> findByUserOrderByCreatedAtDesc(@Param("user") User user);
    
    @Query("SELECT o FROM Order o WHERE o.store = :store")
    List<Order> findByStore(@Param("store") Store store);
    
    @Query("SELECT o FROM Order o WHERE o.store = :store ORDER BY o.createdAt DESC")
    List<Order> findByStoreOrderByCreatedAtDesc(@Param("store") Store store);
    
    // Add method for filtering by multiple store IDs
    @Query("SELECT o FROM Order o WHERE o.store.id IN :storeIds")
    List<Order> findByStoreIdIn(@Param("storeIds") Set<Long> storeIds);
    
    @Query("SELECT o FROM Order o WHERE o.status = :status")
    List<Order> findByStatus(@Param("status") OrderStatus status);
    
    @Query("SELECT o FROM Order o WHERE o.user = :user AND o.status = :status")
    List<Order> findByUserAndStatus(@Param("user") User user, @Param("status") OrderStatus status);
    
    @Query("SELECT o FROM Order o WHERE o.store = :store AND o.status = :status")
    List<Order> findByStoreAndStatus(@Param("store") Store store, @Param("status") OrderStatus status);
    
    @Query("SELECT o FROM Order o WHERE o.user = :user AND o.createdAt BETWEEN :startDate AND :endDate")
    List<Order> findByUserAndDateRange(
            @Param("user") User user,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT o FROM Order o WHERE o.store = :store AND o.createdAt BETWEEN :startDate AND :endDate")
    List<Order> findByStoreAndDateRange(
            @Param("store") Store store,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT o FROM Order o WHERE o.status = :status AND o.createdAt BETWEEN :startDate AND :endDate")
    Page<Order> findByStatusAndDateRange(
            @Param("status") OrderStatus status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);
    
    @Query("SELECT SUM(o.total) FROM Order o WHERE o.store = :store AND o.status = 'DELIVERED'")
    BigDecimal getTotalRevenueByStore(@Param("store") Store store);
    
    @Query("SELECT COUNT(o) FROM Order o WHERE o.user = :user")
    Long countOrdersByUser(@Param("user") User user);

    @Query("SELECT o FROM Order o WHERE o.user.id = :userId")
    Page<Order> findByUserId(@Param("userId") Long userId, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.store.id = :storeId")
    Page<Order> findByStoreId(@Param("storeId") Long storeId, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.status = :status")
    Page<Order> findByStatus(@Param("status") OrderStatus status, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.store.id = :storeId AND o.status = :status")
    Page<Order> findByStoreIdAndStatus(@Param("storeId") Long storeId, @Param("status") OrderStatus status, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.paymentMethod = :paymentMethod")
    Page<Order> findByPaymentMethod(@Param("paymentMethod") PaymentMethod paymentMethod, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.qrCode = :qrCode")
    Optional<Order> findByQrCode(@Param("qrCode") String qrCode);

    // Check if order number already exists
    boolean existsByOrderNumber(String orderNumber);

    @Query("SELECT o FROM Order o WHERE o.user = :user AND o.store = :store")
    List<Order> findByUserAndStore(@Param("user") User user, @Param("store") Store store);
    
    @Query("SELECT o FROM Order o WHERE o.createdAt BETWEEN :start AND :end")
    List<Order> findByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    @Query("SELECT o FROM Order o WHERE o.store = :store AND o.createdAt BETWEEN :start AND :end")
    List<Order> findByStoreAndCreatedAtBetween(
            @Param("store") Store store, 
            @Param("start") LocalDateTime start, 
            @Param("end") LocalDateTime end);
    
    @Query("SELECT o FROM Order o WHERE o.user = :user AND o.createdAt BETWEEN :start AND :end")
    List<Order> findByUserAndCreatedAtBetween(
            @Param("user") User user, 
            @Param("start") LocalDateTime start, 
            @Param("end") LocalDateTime end);
    
    @Query("SELECT o FROM Order o WHERE o.user = :user")
    Page<Order> findByUser(@Param("user") User user, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.store = :store")
    Page<Order> findByStore(@Param("store") Store store, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.user = :user AND o.store = :store")
    Page<Order> findByUserAndStore(@Param("user") User user, @Param("store") Store store, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.id = :id AND o.user = :user")
    Optional<Order> findByIdAndUser(@Param("id") Long id, @Param("user") User user);
    
    @Query("SELECT o FROM Order o WHERE o.id = :id AND o.store = :store")
    Optional<Order> findByIdAndStore(@Param("id") Long id, @Param("store") Store store);
    
    @Query("SELECT o FROM Order o WHERE o.user.id = :userId AND o.status = :status")
    List<Order> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") String status);
    
    @Query("SELECT o FROM Order o WHERE o.store.id = :storeId AND o.user.id = :userId")
    List<Order> findByStoreIdAndUserId(@Param("storeId") Long storeId, @Param("userId") Long userId);
    
    @Query("SELECT o FROM Order o WHERE o.store.id = :storeId AND o.createdAt BETWEEN :start AND :end")
    List<Order> findByStoreIdAndCreatedAtBetween(
            @Param("storeId") Long storeId, 
            @Param("start") LocalDateTime start, 
            @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(o) FROM Order o")
    long count();

    @Query("SELECT SUM(o.total) FROM Order o")
    BigDecimal sumTotal();

    @Query("SELECT COUNT(o) FROM Order o WHERE o.store = :store")
    long countByStore(@Param("store") Store store);

    @Query("SELECT SUM(o.total) FROM Order o WHERE o.store = :store")
    BigDecimal sumTotalByStore(@Param("store") Store store);

    @Query("SELECT AVG(o.total) FROM Order o WHERE o.store = :store")
    BigDecimal averageOrderValueByStore(@Param("store") Store store);

    @Query("SELECT o.status as status, COUNT(o) as count FROM Order o WHERE o.store = :store GROUP BY o.status")
    Map<OrderStatus, Long> countByStoreAndStatus(@Param("store") Store store);

    @Query("SELECT DATE(o.createdAt) as date, SUM(o.total) as total FROM Order o " +
           "WHERE o.store = :store AND o.createdAt BETWEEN :startDate AND :endDate " +
           "GROUP BY DATE(o.createdAt)")
    Map<LocalDateTime, BigDecimal> sumTotalByStoreAndDateRange(
        @Param("store") Store store,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT SUM(o.total) - SUM(oi.unitPrice * oi.quantity) FROM Order o JOIN o.items oi WHERE o.store = :store")
    BigDecimal sumDiscountByStore(@Param("store") Store store);

    @Query("SELECT DATE(o.createdAt) as date, SUM(o.total) - SUM(oi.unitPrice * oi.quantity) as discount FROM Order o " +
           "JOIN o.items oi WHERE o.store = :store AND o.createdAt BETWEEN :startDate AND :endDate " +
           "GROUP BY DATE(o.createdAt)")
    Map<LocalDateTime, BigDecimal> sumDiscountByStoreAndDateRange(
        @Param("store") Store store,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT AVG(o.total) - AVG(oi.unitPrice * oi.quantity) FROM Order o JOIN o.items oi WHERE o.store = :store")
    BigDecimal averageDiscountByStore(@Param("store") Store store);

    @Query("SELECT oi.product.id as productId, " +
           "SUM(oi.unitPrice * oi.quantity * (oi.product.discountPercentage / 100.0)) as discount " +
           "FROM Order o JOIN o.items oi WHERE o.store = :store " +
           "GROUP BY oi.product.id")
    Map<Long, BigDecimal> sumDiscountByStoreAndProduct(@Param("store") Store store);
    
    // Methods for multiple store IDs
    @Query("SELECT COUNT(o) FROM Order o WHERE o.store.id IN :storeIds")
    long countByStoreIdIn(@Param("storeIds") List<Long> storeIds);
    
    @Query("SELECT SUM(o.total) FROM Order o WHERE o.store.id IN :storeIds")
    BigDecimal sumTotalByStoreIdIn(@Param("storeIds") List<Long> storeIds);
    
    @Query("SELECT o FROM Order o WHERE o.store.id IN :storeIds AND o.createdAt BETWEEN :startDate AND :endDate")
    List<Order> findByStoreIdInAndCreatedAtBetween(@Param("storeIds") List<Long> storeIds, 
                                                   @Param("startDate") LocalDateTime startDate, 
                                                   @Param("endDate") LocalDateTime endDate);

    @EntityGraph(attributePaths = {"items", "items.product", "items.product.category", "store", "user"})
    @Query("SELECT DISTINCT o FROM Order o WHERE o.store.id IN :storeIds AND o.createdAt BETWEEN :startDate AND :endDate ORDER BY o.createdAt DESC")
    List<Order> findDetailedByStoreIdInAndCreatedAtBetween(@Param("storeIds") List<Long> storeIds,
                                                           @Param("startDate") LocalDateTime startDate,
                                                           @Param("endDate") LocalDateTime endDate);
}
