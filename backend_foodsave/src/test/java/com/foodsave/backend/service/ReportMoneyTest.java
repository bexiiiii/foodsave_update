package com.foodsave.backend.service;
import com.foodsave.backend.entity.Order;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class ReportMoneyTest {
    @Test void excludesPhoneSizedAmountsWithoutMutatingHistory() {
        Order bad = order("77074403678.40"), good = order("3500.50");
        assertEquals(BigDecimal.ZERO, ReportMoney.total(bad));
        assertEquals(new BigDecimal("77074403678.40"), bad.getTotal());
        assertEquals(new BigDecimal("3500.50"), ReportMoney.total(good));
        assertEquals(List.of(good), ReportMoney.validOrders(List.of(bad, good)));
    }
    @Test void handlesBoundaryNullAndNegativeAmounts() {
        assertTrue(ReportMoney.validAmount(new BigDecimal("1000000")));
        assertTrue(ReportMoney.validAmount(BigDecimal.ZERO));
        assertFalse(ReportMoney.validAmount(new BigDecimal("1000000.01")));
        assertFalse(ReportMoney.validAmount(BigDecimal.ONE.negate()));
        assertFalse(ReportMoney.validAmount(null));
    }
    private Order order(String total) {Order o = new Order(); var item = new com.foodsave.backend.entity.OrderItem(); item.setUnitPrice(new BigDecimal(total)); item.setQuantity(1); o.addItem(item); o.setTotal(new BigDecimal(total)); return o;}
}
