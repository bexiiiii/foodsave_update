package com.foodsave.backend.service;

import com.foodsave.backend.dto.ProductStatsDTO;
import java.math.BigDecimal;

/** Spring Data can wrap a multi-column aggregate in a single Object[] row. */
public final class ProductStatsMapping {
    private ProductStatsMapping() { }

    public static ProductStatsDTO fromAggregate(Object[] result) {
        Object[] row = result;
        if (row != null && row.length == 1 && row[0] instanceof Object[] nested) row = nested;
        if (row == null || row.length == 0) {
            return new ProductStatsDTO(0, 0, 0, 0, BigDecimal.ZERO, 0.0);
        }
        if (row.length != 6) throw new IllegalArgumentException("Expected six product statistics columns");
        return new ProductStatsDTO(number(row[0]).longValue(), number(row[1]).longValue(),
                number(row[2]).longValue(), number(row[3]).longValue(),
                row[4] == null ? BigDecimal.ZERO : new BigDecimal(number(row[4]).toString()),
                number(row[5]).doubleValue());
    }

    private static Number number(Object value) {
        if (value == null) return 0;
        if (value instanceof Number numeric) return numeric;
        throw new IllegalArgumentException("Product statistics column is not numeric");
    }
}
