package com.foodsave.backend.security;

import com.foodsave.backend.domain.enums.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtil {
    
    public static UserRole getCurrentUserRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getRole();
        }
        
        return null;
    }
    
    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getId();
        }
        
        return null;
    }
    
    public static String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getEmail();
        }
        
        return null;
    }
    
    public static boolean isSuperAdmin() {
        UserRole role = getCurrentUserRole();
        return role == UserRole.SUPER_ADMIN;
    }
    
    public static boolean isStoreManager() {
        UserRole role = getCurrentUserRole();
        return role == UserRole.STORE_MANAGER;
    }
    
    public static boolean isStoreOwner() {
        UserRole role = getCurrentUserRole();
        return role == UserRole.STORE_OWNER;
    }
    
    public static boolean isCustomer() {
        UserRole role = getCurrentUserRole();
        return role == UserRole.CUSTOMER;
    }
    
    public static boolean hasManagerAccess() {
        UserRole role = getCurrentUserRole();
        return role == UserRole.SUPER_ADMIN || role == UserRole.STORE_MANAGER || role == UserRole.STORE_OWNER;
    }
    
    public static boolean hasAdminAccess() {
        UserRole role = getCurrentUserRole();
        return role == UserRole.SUPER_ADMIN || role == UserRole.STORE_OWNER;
    }
}
