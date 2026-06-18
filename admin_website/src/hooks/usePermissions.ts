import { useState, useEffect, useCallback } from 'react';
import { Permission } from '@/types/permission';
import { permissionService } from '@/services/permissionService';
import { useAuth } from './useAuth';

export const usePermissions = () => {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPermissions = useCallback(async () => {
        if (user?.id) {
            try {
                const userPermissions = await permissionService.getUserPermissions(user.id);
                setPermissions(userPermissions);
            } catch (error) {
                console.error('Error loading permissions:', error);
            } finally {
                setLoading(false);
            }
        }
    }, [user?.id]);

    useEffect(() => {
        loadPermissions();
    }, [loadPermissions]);

    const hasPermission = useCallback((permission: Permission): boolean => {
        return permissions.includes(permission);
    }, [permissions]);

    const hasAnyPermission = useCallback((requiredPermissions: Permission[]): boolean => {
        return requiredPermissions.some(permission => hasPermission(permission));
    }, [hasPermission]);

    const hasAllPermissions = useCallback((requiredPermissions: Permission[]): boolean => {
        return requiredPermissions.every(permission => hasPermission(permission));
    }, [hasPermission]);

    return {
        permissions,
        loading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refreshPermissions: loadPermissions
    };
}; 