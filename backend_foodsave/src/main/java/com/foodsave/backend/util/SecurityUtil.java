package com.foodsave.backend.util;

import com.foodsave.backend.entity.User;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtil {

    /**
     * Get the current user's role
     */
    public UserRole getCurrentUserRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            return userPrincipal.getRole();
        }
        
        return null;
    }

    /**
     * Get the current user's ID
     */
    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            return userPrincipal.getId();
        }
        
        return null;
    }

    /**
     * Get the current user's email
     */
    public String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            return userPrincipal.getEmail();
        }
        
        return null;
    }

    /**
     * Get the current user's store ID for managers
     */
    public Long getCurrentManagerStoreId() {
        UserRole role = getCurrentUserRole();
        if (role == UserRole.STORE_MANAGER) {
            // This will be handled by StoreService to avoid lazy loading
            return null;
        }
        return null;
    }

    /**
     * Check if current user is a manager
     */
    public boolean isCurrentUserManager() {
        UserRole role = getCurrentUserRole();
        return role == UserRole.STORE_MANAGER;
    }
    
    /**
     * Get the currently authenticated user
     * Note: This method returns null to avoid lazy loading issues.
     * Use UserPrincipal directly from SecurityContext instead.
     */
    public User getCurrentUser() {
        // Returning null to avoid lazy loading issues with User entity
        // Use SecurityContextHolder.getContext().getAuthentication().getPrincipal() 
        // to get UserPrincipal directly
        return null;
    }
    
    /**
     * Get the current user's store ID (for store owners and managers)
     * Returns null - use store-specific services instead
     */
    public Long getCurrentUserStoreId() {
        // Returning null to avoid lazy loading issues
        // Store access should be handled by store-specific services
        return null;
    }
    
    /**
     * Check if the current user is a super admin
     */
    public boolean isCurrentUserAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        System.out.println("DEBUG: Authentication: " + authentication);
        System.out.println("DEBUG: Principal: " + (authentication != null ? authentication.getPrincipal() : "null"));
        System.out.println("DEBUG: Principal class: " + (authentication != null && authentication.getPrincipal() != null ? authentication.getPrincipal().getClass().getName() : "null"));
        
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            System.out.println("DEBUG: UserPrincipal role: " + userPrincipal.getRole());
            
            boolean isAdmin = userPrincipal.getRole() == UserRole.SUPER_ADMIN;
            System.out.println("DEBUG: Is admin: " + isAdmin);
            return isAdmin;
        }
        
        System.out.println("DEBUG: No UserPrincipal found");
        return false;
    }
    
    /**
     * Check if the current user can access a specific store
     */
    public boolean canAccessStore(Long storeId) {
        if (isCurrentUserAdmin()) {
            return true; // Super admins can access all stores
        }
        
        // For non-admin users, store access should be handled by store-specific services
        // to avoid lazy loading issues
        return false;
    }
    
    /**
     * Check if the current user is a store owner or manager
     */
    public boolean isStoreUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            UserRole role = userPrincipal.getRole();
            return role == UserRole.STORE_OWNER || role == UserRole.STORE_MANAGER;
        }
        
        return false;
    }
    
    /**
     * Get all store IDs that the current user can access
     */
    public java.util.Set<Long> getCurrentUserStoreIds() {
        // Return empty set to avoid lazy loading issues
        // Store access should be handled by store-specific services
        return java.util.Collections.emptySet();
    }
    
    /**
     * Get the current user's primary store (for store owners and managers)
     */
    public Store getCurrentStore() {
        // Return null to avoid lazy loading issues
        // Store access should be handled by store-specific services
        return null;
    }
    
    /**
     * Get the current user's managed store (for managers)
     */
    public Long getCurrentUserManagedStoreId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            // Only managers can have managed stores
            if (userPrincipal.getRole() == UserRole.STORE_MANAGER) {
                return userPrincipal.getId(); // Return user ID to find the store
            }
        }
        
        return null;
    }

    /**
     * Check if current user is a manager of a specific store
     */
    public boolean isManagerOfStore(Long storeId) {
        if (isCurrentUserAdmin()) {
            return true; // Super admin has access to all stores
        }
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            if (userPrincipal.getRole() == UserRole.STORE_MANAGER) {
                // Here we need to check if the user is a manager of the given store
                // This will be implemented in the service
                return true;
            }
        }
        
        return false;
    }
}
