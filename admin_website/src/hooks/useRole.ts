import { useAuth } from './useAuth';
import { useCallback } from 'react';

export const useRole = () => {
  const { user } = useAuth();

  const hasRole = useCallback((role: string): boolean => {
    return user?.role === role;
  }, [user?.role]);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return user?.role ? roles.includes(user.role) : false;
  }, [user?.role]);

  const isStoreManager = useCallback((): boolean => {
    return user?.role === 'STORE_MANAGER';
  }, [user?.role]);

  const isStoreOwner = useCallback((): boolean => {
    return user?.role === 'STORE_OWNER';
  }, [user?.role]);

  const isSuperAdmin = useCallback((): boolean => {
    return user?.role === 'SUPER_ADMIN';
  }, [user?.role]);

  const isCustomer = useCallback((): boolean => {
    return user?.role === 'CUSTOMER';
  }, [user?.role]);

  return {
    userRole: user?.role,
    hasRole,
    hasAnyRole,
    isStoreManager,
    isStoreOwner,
    isSuperAdmin,
    isCustomer,
  };
};
