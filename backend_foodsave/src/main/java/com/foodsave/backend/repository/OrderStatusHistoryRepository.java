package com.foodsave.backend.repository;

import com.foodsave.backend.entity.Order;
import com.foodsave.backend.entity.OrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistory, Long> {
    List<OrderStatusHistory> findByOrderOrderByCreatedAtAsc(Order order);
}
