import React from 'react';
import { Permission } from '@/types/permission';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
    permission: Permission | Permission[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
    requireAll?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    permission,
    children,
    fallback = null,
    requireAll = false
}) => {
    const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

    const hasAccess = React.useMemo(() => {
        if (Array.isArray(permission)) {
            return requireAll
                ? hasAllPermissions(permission)
                : hasAnyPermission(permission);
        }
        return hasPermission(permission);
    }, [permission, requireAll, hasPermission, hasAllPermissions, hasAnyPermission]);

    return hasAccess ? <>{children}</> : <>{fallback}</>;
}; 