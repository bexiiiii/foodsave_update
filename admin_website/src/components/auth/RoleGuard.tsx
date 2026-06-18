"use client";

import { ReactNode } from 'react';
import { useRoleBasedRoutes } from '@/hooks/useRoleBasedRoutes';
import { UserRole } from '@/types/roles';
import { Permission } from '@/types/permission';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredPermissions?: Permission[];
  fallback?: ReactNode;
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  requiredPermissions,
  fallback = null,
  requireAll = false
}: RoleGuardProps) {
  const { user, hasRole, hasPermission } = useRoleBasedRoutes();

  // If user is not authenticated, don't show anything
  if (!user) {
    return null;
  }

  // Check role requirements
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = allowedRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return fallback;
    }
  }

  // Check permission requirements
  if (requiredPermissions && requiredPermissions.length > 0) {
    console.log('RoleGuard checking permissions:', requiredPermissions);
    console.log('User permissions:', user?.permissions);
    console.log('User role:', user?.role);
    
    const permissionCheck = requireAll
      ? requiredPermissions.every(permission => hasPermission(permission))
      : requiredPermissions.some(permission => hasPermission(permission));
    
    console.log('Permission check result:', permissionCheck);
    
    if (!permissionCheck) {
      console.log('Access denied - permission check failed');
      return fallback;
    }
  }

  console.log('RoleGuard access granted');
  return <>{children}</>;
}

// Convenience components for specific roles
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function StoreOwnerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={[UserRole.STORE_OWNER]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function ManagerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={[UserRole.MANAGER]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function StoreManagementRoles({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.STORE_OWNER, UserRole.MANAGER]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function AdminAndStoreOwner({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.STORE_OWNER]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
