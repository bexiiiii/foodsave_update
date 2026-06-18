import { useMemo, useCallback } from 'react';
import { UserRole, getAvailableRoutes, getRolePermissions } from '@/types/roles';
import { Permission } from '@/types/permission';
import { useAuth } from '@/contexts/AuthContext';

export const useRoleBasedRoutes = () => {
    const { user } = useAuth();

    const availableRoutes = useMemo(() => {
        if (!user) return [];
        
        // Если у пользователя нет прав в массиве, используем права по умолчанию для роли
        const userPermissions = user.permissions && user.permissions.length > 0 
            ? user.permissions 
            : getRolePermissions(user.role);
        
        return getAvailableRoutes(user.role, userPermissions);
    }, [user]);

    const hasPermission = useCallback((permission: Permission): boolean => {
        if (!user) return false;
        
        // Используем права по умолчанию для роли, если у пользователя нет прав в массиве
        const userPermissions = user.permissions && user.permissions.length > 0 
            ? user.permissions 
            : getRolePermissions(user.role);
            
        return userPermissions.includes(permission);
    }, [user]);

    const hasRole = useCallback((role: UserRole): boolean => {
        if (!user) return false;
        return user.role === role;
    }, [user]);

    const canAccessRoute = useCallback((routePath: string): boolean => {
        if (!user) return false;
        
        const route = availableRoutes.find(r => r.path === routePath);
        return !!route;
    }, [user, availableRoutes]);

    const getUserRole = useCallback((): UserRole | null => {
        return user?.role || null;
    }, [user]);

    const isAdmin = useCallback((): boolean => {
        return user?.role === UserRole.ADMIN;
    }, [user]);

    const isStoreOwner = (): boolean => {
        return user?.role === UserRole.STORE_OWNER;
    };

    const isManager = (): boolean => {
        return user?.role === UserRole.MANAGER;
    };

    const isCustomer = (): boolean => {
        return user?.role === UserRole.CUSTOMER;
    };

    const getUserStoreId = (): number | null => {
        return user?.storeId || null;
    };

    return {
        availableRoutes,
        hasPermission,
        hasRole,
        canAccessRoute,
        getUserRole,
        isAdmin,
        isStoreOwner,
        isManager,
        isCustomer,
        getUserStoreId,
        user
    };
};
