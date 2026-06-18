package com.foodsave.backend.config;

import com.foodsave.backend.domain.enums.Permission;
import com.foodsave.backend.domain.enums.UserRole;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.*;

@Configuration
public class RolePermissionConfig {

    @Bean
    public Map<UserRole, Set<Permission>> rolePermissions() {
        Map<UserRole, Set<Permission>> rolePermissions = new HashMap<>();

        // SUPER_ADMIN permissions
        rolePermissions.put(UserRole.SUPER_ADMIN, new HashSet<>(Arrays.asList(
            Permission.USER_READ, Permission.USER_CREATE, Permission.USER_UPDATE, Permission.USER_DELETE,
            Permission.STORE_READ, Permission.STORE_CREATE, Permission.STORE_UPDATE, Permission.STORE_DELETE,
            Permission.PRODUCT_READ, Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE, Permission.PRODUCT_DELETE,
            Permission.ORDER_READ, Permission.ORDER_CREATE, Permission.ORDER_UPDATE, Permission.ORDER_DELETE,
            Permission.ANALYTICS_READ,
            Permission.REVIEW_READ, Permission.REVIEW_CREATE, Permission.REVIEW_UPDATE, Permission.REVIEW_DELETE,
            Permission.DISCOUNT_READ, Permission.DISCOUNT_CREATE, Permission.DISCOUNT_UPDATE, Permission.DISCOUNT_DELETE
        )));

        // STORE_MANAGER permissions
        rolePermissions.put(UserRole.STORE_MANAGER, new HashSet<>(Arrays.asList(
            Permission.STORE_READ, Permission.STORE_UPDATE,
            Permission.PRODUCT_READ, Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE, Permission.PRODUCT_DELETE,
            Permission.ORDER_READ, Permission.ORDER_UPDATE,
            Permission.ANALYTICS_READ,
            Permission.REVIEW_READ,
            Permission.DISCOUNT_READ, Permission.DISCOUNT_CREATE, Permission.DISCOUNT_UPDATE
        )));

        // STORE_OWNER permissions
        rolePermissions.put(UserRole.STORE_OWNER, new HashSet<>(Arrays.asList(
            Permission.STORE_READ, Permission.STORE_UPDATE,
            Permission.PRODUCT_READ, Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE, Permission.PRODUCT_DELETE,
            Permission.ORDER_READ, Permission.ORDER_UPDATE,
            Permission.ANALYTICS_READ,
            Permission.REVIEW_READ,
            Permission.DISCOUNT_READ, Permission.DISCOUNT_CREATE, Permission.DISCOUNT_UPDATE
        )));

        // CUSTOMER permissions
        rolePermissions.put(UserRole.CUSTOMER, new HashSet<>(Arrays.asList(
            Permission.STORE_READ,
            Permission.PRODUCT_READ,
            Permission.ORDER_READ, Permission.ORDER_CREATE,
            Permission.REVIEW_READ, Permission.REVIEW_CREATE,
            Permission.DISCOUNT_READ
        )));

        return rolePermissions;
    }
} 