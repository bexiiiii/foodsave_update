'use client';

import React from 'react';
import { Permission } from '@/types/permission';
import { usePermissions } from '@/hooks/usePermissions';

const PermissionsPage = () => {
  const { permissions, loading } = usePermissions();

  const permissionGroups = {
    'User Management': [
      Permission.USER_READ,
      Permission.USER_CREATE,
      Permission.USER_UPDATE,
      Permission.USER_DELETE,
    ],
    'Role Management': [
      Permission.ROLE_READ,
      Permission.ROLE_CREATE,
      Permission.ROLE_UPDATE,
      Permission.ROLE_DELETE,
    ],
    'Store Management': [
      Permission.STORE_READ,
      Permission.STORE_CREATE,
      Permission.STORE_UPDATE,
      Permission.STORE_DELETE,
    ],
    'Product Management': [
      Permission.PRODUCT_READ,
      Permission.PRODUCT_CREATE,
      Permission.PRODUCT_UPDATE,
      Permission.PRODUCT_DELETE,
    ],
    'Order Management': [
      Permission.ORDER_READ,
      Permission.ORDER_CREATE,
      Permission.ORDER_UPDATE,
      Permission.ORDER_DELETE,
    ],
    'Analytics': [
      Permission.ANALYTICS_READ,
      Permission.ANALYTICS_EXPORT,
    ],
    'Discount Management': [
      Permission.DISCOUNT_READ,
      Permission.DISCOUNT_CREATE,
      Permission.DISCOUNT_UPDATE,
      Permission.DISCOUNT_DELETE,
    ],
    'Review Management': [
      Permission.REVIEW_READ,
      Permission.REVIEW_CREATE,
      Permission.REVIEW_UPDATE,
      Permission.REVIEW_DELETE,
    ],
    'System Settings': [
      Permission.SETTINGS_READ,
      Permission.SETTINGS_UPDATE,
    ],
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Permissions Management</h1>
      
      <div className="grid gap-6">
        {Object.entries(permissionGroups).map(([group, groupPermissions]) => (
          <div key={group} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{group}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupPermissions.map((permission) => (
                <div
                  key={permission}
                  className={`p-4 rounded-lg border ${
                    permissions?.includes(permission)
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{permission}</span>
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        permissions?.includes(permission)
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {permissions?.includes(permission) ? 'Granted' : 'Denied'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PermissionsPage; 