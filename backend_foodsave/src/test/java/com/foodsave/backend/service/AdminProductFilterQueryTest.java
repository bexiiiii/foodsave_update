package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.ProductStatus;
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
        jdbc.update("INSERT INTO stores VALUES (1, 10, 30), (2, 20, 30), (3, 40, 50)");
        for (long id = 1; id <= 45; id++) add(id, "Бокс " + id, null, 1, 7, "AVAILABLE", true, false);
        add(46, "Клубника", "Шоколад и ягоды", 2, 8, "DISCONTINUED", false, false);
        add(47, "Ягоды", null, 2, 8, "AVAILABLE", true, false);
        add(48, "Клубника", null, 3, 8, "AVAILABLE", true, false);
        add(49, "Удалённый", null, 2, 8, "AVAILABLE", true, true);
        filters = new AdminProductFilterQuery(jdbc);
    }

    void add(long id, String name, String description, long store, long category, String status, boolean active, boolean deleted) {
        jdbc.update("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, TIMESTAMP '2026-11-10 10:00:00', ?)",
                id, name, description, store, category, status, active,
                deleted ? java.sql.Timestamp.valueOf("2026-11-10 11:00:00") : null);
    }

    @Test void filtersBeforePaginationAndCountsMatchesOnly() {
        var result = filters.findIds(UserRole.SUPER_ADMIN, 1L, "", 1L, 7L, ProductStatus.AVAILABLE, 2, 20);
        assertEquals(45, result.getTotalElements());
        assertEquals(3, result.getTotalPages());
        assertEquals(List.of(5L, 4L, 3L, 2L, 1L), result.getContent());
        assertTrue(filters.findIds(UserRole.SUPER_ADMIN, 1L, "", 1L, 7L, null, 3, 20).isEmpty());
    }

    @Test void combinesSearchStoreCategoryAndStatusIncludingInactiveProducts() {
        var result = filters.findIds(UserRole.SUPER_ADMIN, 1L, "  ШОКОЛАД  ", 2L, 8L, ProductStatus.DISCONTINUED, 0, 20);
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
