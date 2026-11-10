package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.ProductStatus;
import com.foodsave.backend.domain.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/** Admin filters run before pagination; customer catalogue visibility rules do not apply. */
@Service
public class AdminProductFilterQuery {
    private final NamedParameterJdbcTemplate jdbc;

    public AdminProductFilterQuery(JdbcTemplate jdbc) {
        this.jdbc = new NamedParameterJdbcTemplate(jdbc);
    }

    public Page<Long> findIds(UserRole role, Long userId, String query, Long storeId,
                              Long categoryId, ProductStatus status, int page, int size) {
        if (userId == null || (role != UserRole.SUPER_ADMIN && role != UserRole.STORE_OWNER
                && role != UserRole.STORE_MANAGER)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (page < 0 || size < 1 || size > 100 || (storeId != null && storeId < 1)
                || (categoryId != null && categoryId < 1)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid product filter");
        }
        var pageable = PageRequest.of(page, size);
        var params = new MapSqlParameterSource();
        StringBuilder where = new StringBuilder(" FROM products p WHERE p.deleted_at IS NULL");
        if (role != UserRole.SUPER_ADMIN) {
            String relation = role == UserRole.STORE_OWNER ? "owner_id" : "manager_id";
            where.append(" AND EXISTS (SELECT 1 FROM stores s WHERE s.id = p.store_id AND s.")
                    .append(relation).append(" = :userId)");
            params.addValue("userId", userId);
        }
        if (storeId != null) {
            where.append(" AND p.store_id = :storeId"); params.addValue("storeId", storeId);
        }
        if (categoryId != null) {
            where.append(" AND p.category_id = :categoryId"); params.addValue("categoryId", categoryId);
        }
        if (status != null) {
            where.append(" AND p.status = :status"); params.addValue("status", status.name());
        }
        String search = query == null ? "" : query.strip().toLowerCase(Locale.ROOT);
        if (!search.isEmpty()) {
            if (search.length() > 200) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search is too long");
            where.append(" AND (LOWER(p.name) LIKE :search ESCAPE '!' OR LOWER(COALESCE(p.description, '')) LIKE :search ESCAPE '!')");
            params.addValue("search", "%" + search.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%");
        }
        Long total = jdbc.queryForObject("SELECT COUNT(*)" + where, params, Long.class);
        params.addValue("limit", size).addValue("offset", pageable.getOffset());
        List<Long> ids = jdbc.queryForList("SELECT p.id" + where
                + " ORDER BY p.created_at DESC NULLS LAST, p.id DESC LIMIT :limit OFFSET :offset", params, Long.class);
        return new PageImpl<>(ids, pageable, total == null ? 0 : total);
    }
}
