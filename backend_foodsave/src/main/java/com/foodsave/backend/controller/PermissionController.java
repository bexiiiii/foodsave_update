package com.foodsave.backend.controller;

import com.foodsave.backend.domain.enums.Permission;
import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.security.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
@Tag(name = "Permission Management", description = "APIs for managing permissions")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PermissionController {

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get user permissions", description = "Get permissions for a specific user")
    public ResponseEntity<Set<Permission>> getUserPermissions(@PathVariable Long userId) {
        try {
            // Получаем текущую роль пользователя
            UserRole currentRole = SecurityUtil.getCurrentUserRole();
            
            // Если пользователь не аутентифицирован, возвращаем пустой набор разрешений
            if (currentRole == null) {
                return ResponseEntity.ok(Set.of());
            }
            
            // Определяем разрешения на основе роли
            Set<Permission> permissions = getPermissionsForRole(currentRole);
            
            return ResponseEntity.ok(permissions);
        } catch (Exception e) {
            // Логируем ошибку и возвращаем пустой набор разрешений
            System.err.println("Error getting user permissions: " + e.getMessage());
            return ResponseEntity.ok(Set.of());
        }
    }

    @GetMapping("/current")
    @Operation(summary = "Get current user permissions", description = "Get permissions for the current authenticated user")
    public ResponseEntity<Set<Permission>> getCurrentUserPermissions() {
        try {
            UserRole currentRole = SecurityUtil.getCurrentUserRole();
            
            // Если пользователь не аутентифицирован, возвращаем пустой набор разрешений
            if (currentRole == null) {
                return ResponseEntity.ok(Set.of());
            }
            
            Set<Permission> permissions = getPermissionsForRole(currentRole);
            return ResponseEntity.ok(permissions);
        } catch (Exception e) {
            // Логируем ошибку и возвращаем пустой набор разрешений
            System.err.println("Error getting current user permissions: " + e.getMessage());
            return ResponseEntity.ok(Set.of());
        }
    }

    private Set<Permission> getPermissionsForRole(UserRole role) {
        if (role == null) {
            return Set.of();
        }
        
        return switch (role) {
            case SUPER_ADMIN -> Set.of(
                Permission.USER_READ, Permission.USER_CREATE, Permission.USER_UPDATE, Permission.USER_DELETE,
                Permission.STORE_READ, Permission.STORE_CREATE, Permission.STORE_UPDATE, Permission.STORE_DELETE, Permission.STORE_MANAGE,
                Permission.PRODUCT_READ, Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE, Permission.PRODUCT_DELETE,
                Permission.ORDER_READ, Permission.ORDER_CREATE, Permission.ORDER_UPDATE, Permission.ORDER_DELETE,
                Permission.CATEGORY_READ, Permission.CATEGORY_CREATE, Permission.CATEGORY_UPDATE, Permission.CATEGORY_DELETE,
                Permission.REVIEW_READ, Permission.REVIEW_CREATE, Permission.REVIEW_UPDATE, Permission.REVIEW_DELETE,
                Permission.ANALYTICS_READ
            );
            case STORE_MANAGER -> Set.of(
                Permission.STORE_READ, Permission.STORE_UPDATE,
                Permission.PRODUCT_READ, Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE, Permission.PRODUCT_DELETE,
                Permission.ORDER_READ, Permission.ORDER_UPDATE,
                Permission.CATEGORY_READ,
                Permission.REVIEW_READ, Permission.REVIEW_UPDATE,
                Permission.ANALYTICS_READ
            );
            case STORE_OWNER -> Set.of(
                Permission.STORE_READ, Permission.STORE_CREATE, Permission.STORE_UPDATE, Permission.STORE_DELETE,
                Permission.PRODUCT_READ, Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE, Permission.PRODUCT_DELETE,
                Permission.ORDER_READ, Permission.ORDER_CREATE, Permission.ORDER_UPDATE, Permission.ORDER_DELETE,
                Permission.CATEGORY_READ,
                Permission.REVIEW_READ, Permission.REVIEW_UPDATE, Permission.REVIEW_DELETE,
                Permission.ANALYTICS_READ
            );
            case CUSTOMER -> Set.of(
                Permission.STORE_READ,
                Permission.PRODUCT_READ,
                Permission.ORDER_READ, Permission.ORDER_CREATE,
                Permission.CATEGORY_READ,
                Permission.REVIEW_READ, Permission.REVIEW_CREATE, Permission.REVIEW_UPDATE
            );
            default -> Set.of();
        };
    }
}
