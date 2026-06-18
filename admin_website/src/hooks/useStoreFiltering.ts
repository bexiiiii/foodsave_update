"use client";

import { useRoleBasedRoutes } from './useRoleBasedRoutes';
import { UserRole } from '@/types/roles';

export function useStoreFiltering() {
  const { user, isAdmin, isStoreOwner, isManager, getUserStoreId } = useRoleBasedRoutes();

  /**
   * Filters data array to only include items belonging to the user's store
   * For admins, returns all data
   * For store owners/managers, returns only their store's data
   */
  const filterByUserStore = <T extends { storeId?: number | string }>(data: T[]): T[] => {
    if (isAdmin()) {
      return data; // Admins see all data
    }

    const userStoreId = getUserStoreId();
    if (!userStoreId) {
      return []; // No store assigned, return empty array
    }

    return data.filter(item => {
      const itemStoreId = typeof item.storeId === 'string' 
        ? parseInt(item.storeId) 
        : item.storeId;
      return itemStoreId === userStoreId;
    });
  };

  /**
   * Checks if user can access data for a specific store
   */
  const canAccessStore = (storeId: number | string): boolean => {
    if (isAdmin()) {
      return true; // Admins can access all stores
    }

    const userStoreId = getUserStoreId();
    if (!userStoreId) {
      return false;
    }

    const targetStoreId = typeof storeId === 'string' ? parseInt(storeId) : storeId;
    return targetStoreId === userStoreId;
  };

  /**
   * Gets the store ID that should be used for API calls
   * Returns null for admins (they can see all stores)
   * Returns user's store ID for store owners/managers
   */
  const getStoreFilterId = (): number | null => {
    if (isAdmin()) {
      return null; // No filtering for admins
    }
    return getUserStoreId();
  };

  /**
   * Adds store filter parameter to URL search params
   */
  const addStoreFilter = (url: string): string => {
    const storeId = getStoreFilterId();
    if (!storeId) {
      return url; // No filtering needed
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}storeId=${storeId}`;
  };

  /**
   * Creates fetch options with store filtering for API calls
   */
  const createStoreFilteredRequest = (baseUrl: string, options: RequestInit = {}): [string, RequestInit] => {
    const filteredUrl = addStoreFilter(baseUrl);
    return [filteredUrl, options];
  };

  return {
    filterByUserStore,
    canAccessStore,
    getStoreFilterId,
    addStoreFilter,
    createStoreFilteredRequest,
    userStoreId: getUserStoreId(),
    shouldFilterByStore: !isAdmin()
  };
}
