package com.foodsave.backend.service;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ProductStatsMappingTest {
    @Test void mapsWrappedRepositoryRowWithoutDiscardingTotals() {
        var result = ProductStatsMapping.fromAggregate(new Object[]{new Object[]{12000L, 45L, 11000L, 23L, new BigDecimal("123456789012.34"), 1570.5}});
        assertEquals(12000, result.getTotalProducts()); assertEquals(45, result.getActiveProducts());
        assertEquals(11000, result.getOutOfStockProducts()); assertEquals(23, result.getLowStockProducts());
        assertEquals(new BigDecimal("123456789012.34"), result.getTotalValue()); assertEquals(1570.5, result.getAveragePrice());
    }
    @Test void alsoAcceptsFlatRows() {
        var result = ProductStatsMapping.fromAggregate(new Object[]{3, 2, 1, 2, 1500L, 500.0});
        assertEquals(3, result.getTotalProducts()); assertEquals(new BigDecimal("1500"), result.getTotalValue());
    }
    @Test void emptyAggregateHandlesNullSums() {
        var result = ProductStatsMapping.fromAggregate(new Object[]{new Object[]{0L, null, null, null, BigDecimal.ZERO, 0.0}});
        assertEquals(0, result.getTotalProducts()); assertEquals(0, result.getActiveProducts());
        assertEquals(0, result.getOutOfStockProducts()); assertEquals(0, result.getLowStockProducts());
        assertEquals(BigDecimal.ZERO, result.getTotalValue());
        assertEquals(0, ProductStatsMapping.fromAggregate(null).getTotalProducts());
    }
    @Test void malformedResultsCannotSilentlyMasqueradeAsZeroStock() {
        assertThrows(IllegalArgumentException.class, () -> ProductStatsMapping.fromAggregate(new Object[]{1L}));
        assertThrows(IllegalArgumentException.class, () -> ProductStatsMapping.fromAggregate(new Object[]{"bad", 0, 0, 0, 0, 0}));
    }
}
