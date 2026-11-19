package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class AdminProductFilterQueryTest {
    JdbcTemplate jdbc;
    AdminProductFilterQuery filters;

    @BeforeEach void setup() {
        jdbc = new JdbcTemplate(new DriverManagerDataSource(
                "jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", ""));
        jdbc.execute("CREATE TABLE stores (id BIGINT, owner_id BIGINT, manager_id BIGINT)");
        jdbc.execute("CREATE TABLE products (id BIGINT PRIMARY KEY, name VARCHAR, description VARCHAR, store_id BIGINT, category_id BIGINT, status VARCHAR, active BOOLEAN, created_at TIMESTAMP, deleted_at TIMESTAMP)");
        jdbc.execute("ALTER TABLE products ADD stock_quantity INTEGER DEFAULT 1");
        jdbc.execute("CREATE TABLE orders (id BIGINT PRIMARY KEY, status VARCHAR)");
        jdbc.execute("CREATE TABLE order_items (order_id BIGINT, product_id BIGINT)");
        jdbc.update("INSERT INTO stores VALUES (1, 10, 30), (2, 20, 30), (3, 40, 50)");
        for (long id = 1; id <= 45; id++) add(id, "Бокс " + id, null, 1, 7, "AVAILABLE", true, false);
        add(46, "Клубника", "Шоколад и ягоды", 2, 8, "DISCONTINUED", false, false);
        add(47, "Ягоды", null, 2, 8, "AVAILABLE", true, false);
        add(48, "Клубника", null, 3, 8, "AVAILABLE", true, false);
        add(49, "Удалённый", null, 2, 8, "AVAILABLE", true, true);
        filters = new AdminProductFilterQuery(jdbc);
    }

    void add(long id, String name, String description, long store, long category, String status, boolean active, boolean deleted) {
        jdbc.update("INSERT INTO products (id,name,description,store_id,category_id,status,active,created_at,deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, TIMESTAMP '2026-11-10 10:00:00', ?)",
                id, name, description, store, category, status, active,
                deleted ? java.sql.Timestamp.valueOf("2026-11-10 11:00:00") : null);
    }

    @Test void filtersBeforePaginationAndCountsMatchesOnly() {
        var result = filters.findIds(UserRole.SUPER_ADMIN, 1L, "", 1L, 7L, "AVAILABLE", 2, 20);
        assertEquals(45, result.getTotalElements());
        assertEquals(3, result.getTotalPages());
        assertEquals(List.of(5L, 4L, 3L, 2L, 1L), result.getContent());
        assertTrue(filters.findIds(UserRole.SUPER_ADMIN, 1L, "", 1L, 7L, null, 3, 20).isEmpty());
    }

    @Test void combinesSearchStoreCategoryAndStatusIncludingInactiveProducts() {
        var result = filters.findIds(UserRole.SUPER_ADMIN, 1L, "  ШОКОЛАД  ", 2L, 8L, "DISCONTINUED", 0, 20);
        assertEquals(List.of(46L), result.getContent());
        assertTrue(filters.findIds(UserRole.SUPER_ADMIN, 1L, "Шоколад", 2L, 7L, null, 0, 20).isEmpty());
        assertEquals(48, filters.findIds(UserRole.SUPER_ADMIN, 1L, "  ", null, null, null, 0, 20).getTotalElements());
    }

    @Test void ownersAndManagersCannotReadOtherStoresEvenWithExplicitFilters() {
        assertEquals(45, filters.findIds(UserRole.STORE_OWNER, 10L, "", null, null, null, 0, 20).getTotalElements());
        assertTrue(filters.findIds(UserRole.STORE_OWNER, 10L, "", 2L, null, null, 0, 20).isEmpty());
        assertEquals(47, filters.findIds(UserRole.STORE_MANAGER, 30L, "", null, null, null, 0, 20).getTotalElements());
        assertTrue(filters.findIds(UserRole.STORE_MANAGER, 30L, "", 3L, null, null, 0, 20).isEmpty());
        assertTrue(filters.findIds(UserRole.STORE_OWNER, 999L, "", null, null, null, 0, 20).isEmpty());
        assertThrows(ResponseStatusException.class, () -> filters.findIds(UserRole.CUSTOMER, 10L, "", null, null, null, 0, 20));
        assertThrows(ResponseStatusException.class, () -> filters.findIds(UserRole.SUPER_ADMIN, null, "", null, null, null, 0, 20));
    }

    @Test void reservedFilterTracksOpenOrdersAndRemainingStock() {
        jdbc.update("UPDATE products SET stock_quantity = 0 WHERE id IN (43, 44, 45, 46)");
        jdbc.update("INSERT INTO orders VALUES (1,'CONFIRMED'), (2,'CANCELLED'), (3,'PICKED_UP')");
        jdbc.update("INSERT INTO order_items VALUES (1,45), (1,45), (1,46), (1,42), (2,44), (3,43)");
        var reserved = filters.findIds(UserRole.STORE_OWNER, 10L, "", 1L, 7L, "RESERVED", 0, 1);
        assertEquals(java.util.Set.of(45L), filters.reservedOnPage(List.of(42L, 43L, 44L, 45L, 46L)));
        assertEquals(java.util.Set.of(), filters.reservedOnPage(List.of()));
        assertEquals(1, reserved.getTotalElements());
        assertEquals(List.of(45L), reserved.getContent());
        assertEquals(List.of(44L, 43L), filters.findIds(UserRole.SUPER_ADMIN, 1L, "", null, null, "OUT_OF_STOCK", 0, 20).getContent());
        assertTrue(filters.findIds(UserRole.SUPER_ADMIN, 1L, "Бокс 42", null, null, "AVAILABLE", 0, 20).getContent().contains(42L));
        jdbc.update("UPDATE products SET active = FALSE, status = 'OUT_OF_STOCK' WHERE id = 45");
        assertTrue(filters.findIds(UserRole.SUPER_ADMIN, 1L, "", null, null, "RESERVED", 0, 20).isEmpty());
        assertTrue(filters.reservedOnPage(List.of(45L)).isEmpty());
        jdbc.update("UPDATE orders SET status = 'CANCELLED_BY_USER' WHERE id = 1");
        jdbc.update("UPDATE products SET active = TRUE, status = 'AVAILABLE', stock_quantity = 1 WHERE id = 45");
        assertEquals(List.of(45L), filters.findIds(UserRole.SUPER_ADMIN, 1L, "Бокс 45", null, null, "AVAILABLE", 0, 20).getContent());
        assertTrue(filters.findIds(UserRole.SUPER_ADMIN, 1L, "", null, null, "RESERVED", 0, 20).isEmpty());
    }

    @Test void searchTreatsSqlWildcardsAndQuotesAsLiteralText() {
        add(50, "Бокс 50%_!", null, 1, 7, "AVAILABLE", true, false);
        assertEquals(List.of(50L), filters.findIds(UserRole.SUPER_ADMIN, 1L, "%_!", null, null, null, 0, 20).getContent());
        assertTrue(filters.findIds(UserRole.SUPER_ADMIN, 1L, "' OR 1=1 --", null, null, null, 0, 20).isEmpty());
    }

    @Test void rejectsInvalidPaginationAndFilters() {
        assertThrows(ResponseStatusException.class, () -> filters.findIds(UserRole.SUPER_ADMIN, 1L, "", null, null, null, -1, 20));
        assertThrows(ResponseStatusException.class, () -> filters.findIds(UserRole.SUPER_ADMIN, 1L, "", null, null, null, 0, 101));
        assertThrows(ResponseStatusException.class, () -> filters.findIds(UserRole.SUPER_ADMIN, 1L, "", 0L, null, null, 0, 20));
        assertThrows(ResponseStatusException.class, () -> filters.findIds(UserRole.SUPER_ADMIN, 1L, "x".repeat(201), null, null, null, 0, 20));
    }
}
