package com.foodsave.backend.service;

import com.foodsave.backend.entity.Order;
import java.math.BigDecimal;
import java.util.List;

/** Quarantine implausible imported totals in reports without rewriting order history. */
public final class ReportMoney {
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("1000000");
    private ReportMoney() { }
    public static boolean validAmount(BigDecimal amount) {
        return amount != null && amount.signum() >= 0 && amount.compareTo(MAX_AMOUNT) <= 0;
    }
    public static BigDecimal total(Order order) {
        return validAmount(order.getTotal()) ? order.getTotal() : BigDecimal.ZERO;
    }
    public static List<Order> validOrders(List<Order> orders) {
        return orders.stream().filter(order -> validAmount(order.getTotal())).toList();
    }
}
