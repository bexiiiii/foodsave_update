import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRoleBasedRoutes } from '@/hooks/useRoleBasedRoutes';
import { cn } from '@/lib/utils';
import {
  AnalyticsIcon,
  UsersIcon,
  StoreIcon,
  PackageIcon,
  ShoppingCartIcon,
  TagIcon,
  PercentIcon,
  StarIcon,
  ShoppingBagIcon,
  ShieldIcon,
  KeyIcon,
  HeartIcon,
  ActivityIcon
} from '@/icons';

const iconMap = {
  'chart-bar': AnalyticsIcon,
  'users': UsersIcon,
  'store': StoreIcon,
  'package': PackageIcon,
  'shopping-cart': ShoppingCartIcon,
  'tag': TagIcon,
  'percent': PercentIcon,
  'star': StarIcon,
  'shopping-bag': ShoppingBagIcon,
  'shield': ShieldIcon,
  'key': KeyIcon,
  'heart': HeartIcon,
  'activity': ActivityIcon,
};

export default function Sidebar() {
  const pathname = usePathname();
  const { availableRoutes, getUserRole, user } = useRoleBasedRoutes();

  return (
    <div className="w-64 bg-white shadow-lg h-full">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold text-gray-800">FoodSave Админ</h1>
        </div>

        {user && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Роль: {user.role}</p>
            <p className="text-xs text-gray-500">ID: {user.id}</p>
          </div>
        )}
      </div>

      <nav className="mt-6 px-4">
        <ul className="space-y-2">
          {availableRoutes.map((route) => {
            const Icon = iconMap[route.icon as keyof typeof iconMap] || PackageIcon;
            const isActive = pathname === route.path;

            return (
              <li key={route.path}>
                <Link
                  href={route.path}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{route.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-700">
            Доступно {availableRoutes.length} страниц для роли {getUserRole()}
          </p>
        </div>
      </div>
    </div>
  );
}