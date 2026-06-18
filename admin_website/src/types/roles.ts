export enum UserRole {
    ADMIN = 'ADMIN',
    STORE_OWNER = 'STORE_OWNER',
    CUSTOMER = 'CUSTOMER',
    MANAGER = 'MANAGER'
}

export interface RoutePermission {
    path: string;
    label: string;
    icon?: string;
    requiredPermissions: Permission[];
    allowedRoles: UserRole[];
    children?: RoutePermission[];
}

import { Permission } from './permission';

export const ROUTE_PERMISSIONS: RoutePermission[] = [
    {
        path: '/analytics',
        label: 'Аналитика',
        icon: 'chart-bar',
        requiredPermissions: [Permission.ANALYTICS_READ],
        allowedRoles: [UserRole.ADMIN, UserRole.STORE_OWNER, UserRole.MANAGER]
    },
    {
        path: '/users',
        label: 'Пользователи',
        icon: 'users',
        requiredPermissions: [Permission.USER_READ],
        allowedRoles: [UserRole.ADMIN]
    },
    {
        path: '/stores',
        label: 'Заведения',
        icon: 'store',
        requiredPermissions: [Permission.STORE_READ],
        allowedRoles: [UserRole.ADMIN, UserRole.STORE_OWNER]
    },
    {
        path: '/products',
        label: 'Продукты',
        icon: 'package',
        requiredPermissions: [Permission.PRODUCT_READ],
        allowedRoles: [UserRole.ADMIN, UserRole.STORE_OWNER, UserRole.MANAGER]
    },
    {
        path: '/orders',
        label: 'Заказы',
        icon: 'shopping-cart',
        requiredPermissions: [Permission.ORDER_READ],
        allowedRoles: [UserRole.ADMIN, UserRole.STORE_OWNER, UserRole.MANAGER]
    },
    {
        path: '/categories',
        label: 'Категории',
        icon: 'tag',
        requiredPermissions: [Permission.CATEGORY_READ],
        allowedRoles: [UserRole.ADMIN, UserRole.STORE_OWNER]
    },
    {
        path: '/discounts',
        label: 'Скидки',
        icon: 'percent',
        requiredPermissions: [Permission.DISCOUNT_READ],
        allowedRoles: [UserRole.ADMIN, UserRole.STORE_OWNER, UserRole.MANAGER]
    },
    {
        path: '/reviews',
        label: 'Отзывы',
        icon: 'star',
        requiredPermissions: [Permission.REVIEW_READ],
        allowedRoles: [UserRole.ADMIN, UserRole.STORE_OWNER, UserRole.MANAGER]
    },
    {
        path: '/carts',
        label: 'Корзины',
        icon: 'shopping-bag',
        requiredPermissions: [Permission.CART_READ],
        allowedRoles: [UserRole.ADMIN, UserRole.STORE_OWNER]
    },
    {
        path: '/roles',
        label: 'Роли',
        icon: 'shield',
        requiredPermissions: [Permission.ROLE_READ],
        allowedRoles: [UserRole.ADMIN]
    },
    {
        path: '/permissions',
        label: 'Права доступа',
        icon: 'key',
        requiredPermissions: [Permission.ROLE_READ],
        allowedRoles: [UserRole.ADMIN]
    },
    {
        path: '/health',
        label: 'Состояние системы',
        icon: 'heart',
        requiredPermissions: [Permission.SETTINGS_READ],
        allowedRoles: [UserRole.ADMIN]
    },
    {
        path: '/system-health',
        label: 'Мониторинг',
        icon: 'activity',
        requiredPermissions: [Permission.SETTINGS_READ],
        allowedRoles: [UserRole.ADMIN]
    },
    {
        path: '/store-manager',
        label: 'Управление заведением',
        icon: 'store',
        requiredPermissions: [Permission.ORDER_READ],
        allowedRoles: [UserRole.MANAGER, UserRole.STORE_OWNER]
    },
    {
        path: '/user-store-management',
        label: 'Связки пользователей и заведений',
        icon: 'users',
        requiredPermissions: [Permission.USER_READ],
        allowedRoles: [UserRole.ADMIN]
    }
];

export const getRolePermissions = (role: UserRole): Permission[] => {
    switch (role) {
        case UserRole.ADMIN:
            return Object.values(Permission);
        case UserRole.STORE_OWNER:
            return [
                Permission.STORE_READ,
                Permission.STORE_UPDATE,
                Permission.PRODUCT_READ,
                Permission.PRODUCT_CREATE,
                Permission.PRODUCT_UPDATE,
                Permission.PRODUCT_DELETE,
                Permission.ORDER_READ,
                Permission.ORDER_UPDATE,
                Permission.CATEGORY_READ,
                Permission.CATEGORY_CREATE,
                Permission.CATEGORY_UPDATE,
                Permission.DISCOUNT_READ,
                Permission.DISCOUNT_CREATE,
                Permission.DISCOUNT_UPDATE,
                Permission.REVIEW_READ,
                Permission.REVIEW_UPDATE,
                Permission.ANALYTICS_READ,
                Permission.CART_READ
            ];
        case UserRole.MANAGER:
            return [
                Permission.PRODUCT_READ,
                Permission.PRODUCT_UPDATE,
                Permission.ORDER_READ,
                Permission.ORDER_UPDATE,
                Permission.DISCOUNT_READ,
                Permission.DISCOUNT_UPDATE,
                Permission.REVIEW_READ,
                Permission.ANALYTICS_READ
            ];
        case UserRole.CUSTOMER:
            return [
                Permission.REVIEW_CREATE,
                Permission.REVIEW_READ
            ];
        default:
            return [];
    }
};

export const getAvailableRoutes = (userRole: UserRole, userPermissions: Permission[]): RoutePermission[] => {
    return ROUTE_PERMISSIONS.filter(route => {
        const hasRole = route.allowedRoles.includes(userRole);
        const hasPermissions = route.requiredPermissions.every(permission => 
            userPermissions.includes(permission)
        );
        return hasRole && hasPermissions;
    });
};
