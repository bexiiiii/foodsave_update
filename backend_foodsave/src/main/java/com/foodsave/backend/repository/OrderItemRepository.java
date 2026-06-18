package com.foodsave.backend.repository;

import com.foodsave.backend.entity.OrderItem;
import com.foodsave.backend.entity.Order;
import com.foodsave.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    
    List<OrderItem> findByOrder(Order order);
    
    @Query("SELECT oi FROM OrderItem oi WHERE oi.order = :order AND oi.product = :product")
    OrderItem findByOrderAndProduct(
            @Param("order") Order order,
            @Param("product") Product product);
    
    @Query("SELECT SUM(oi.quantity) FROM OrderItem oi WHERE oi.product = :product")
    Long getTotalQuantitySold(@Param("product") Product product);
    
    @Query("SELECT SUM(oi.totalPrice) FROM OrderItem oi WHERE oi.product = :product")
    Double getTotalRevenue(@Param("product") Product product);
}
