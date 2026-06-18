package com.foodsave.backend.security;

import com.foodsave.backend.domain.enums.UserRole;
import org.springframework.security.access.expression.SecurityExpressionRoot;
import org.springframework.security.access.expression.method.MethodSecurityExpressionOperations;
import org.springframework.security.core.Authentication;

public class CustomSecurityExpressionRoot extends SecurityExpressionRoot implements MethodSecurityExpressionOperations {

    private Authentication auth;

    public CustomSecurityExpressionRoot(Authentication authentication) {
        super(authentication);
        this.auth = authentication;
    }

    public boolean isSuperAdmin() {
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        
        Object principal = auth.getPrincipal();
        if (principal instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) principal;
            return userPrincipal.getRole() == UserRole.SUPER_ADMIN;
        }
        
        return false;
    }

    public boolean hasRoleOrIsSuperAdmin(String role) {
        return isSuperAdmin() || hasRole(role);
    }

    @Override
    public void setFilterObject(Object filterObject) {
        // Not used
    }

    @Override
    public Object getFilterObject() {
        return null;
    }

    @Override
    public void setReturnObject(Object returnObject) {
        // Not used
    }

    @Override
    public Object getReturnObject() {
        return null;
    }

    @Override
    public Object getThis() {
        return this;
    }
}
