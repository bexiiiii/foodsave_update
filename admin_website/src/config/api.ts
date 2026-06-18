export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim() && process.env.NEXT_PUBLIC_API_URL.trim().length > 0
    ? process.env.NEXT_PUBLIC_API_URL.trim()
    : 'http://localhost:8080/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
  },
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile/update',
    CHANGE_PASSWORD: '/users/change-password',
    FORGOT_PASSWORD: '/users/forgot-password',
    RESET_PASSWORD: '/users/reset-password',
  },
  STORES: {
    BASE: '/stores',
    ACTIVE: '/stores/active',
    MY_STORE: '/stores/my-store',
    PRODUCTS: '/stores/products',
    ANALYTICS: '/stores/analytics',
  },
  PRODUCTS: {
    BASE: '/products',
    CATEGORIES: '/products/categories',
    FEATURED: '/products/featured',
    STORE_PRODUCTS: '/products/store',
    SEARCH: '/products/search',
  },
  ORDERS: {
    BASE: '/orders',
    MY_ORDERS: '/orders/my-orders',
    STORE_ORDERS: '/orders/store-orders',
    UPDATE_STATUS: '/orders',
  },
  CART: {
    BASE: '/cart',
    ADD_ITEM: '/cart/items',
    UPDATE_ITEM: '/cart/items',
    REMOVE_ITEM: '/cart/items',
    CLEAR: '/cart',
  },
  DISCOUNTS: {
    BASE: '/discounts',
    APPLY: '/discounts/apply',
    VALIDATE: '/discounts/validate',
  },
  REVIEWS: {
    BASE: '/reviews',
    PRODUCT_REVIEWS: '/reviews/product',
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    MARK_READ: '/notifications/mark-read',
    MARK_ALL_READ: '/notifications/mark-all-read',
    UNREAD_COUNT: '/notifications/unread-count',
    TELEGRAM_BROADCAST: '/notifications/telegram/broadcast',
  },
  ANALYTICS: {
    BASE: '/analytics',
    DASHBOARD: '/analytics/dashboard',
    STORE_SALES: '/analytics/store/sales',
    STORE_PRODUCTS: '/analytics/store/products',
    STORE_DISCOUNTS: '/analytics/store/discounts',
    STORE_USERS: '/analytics/store/users',
  },
  SEARCH: {
    BASE: '/search',
  },
  HEALTH: {
    BASE: '/health',
  },
};

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export const getAuthHeaders = (token: string) => ({
  ...DEFAULT_HEADERS,
  'Authorization': `Bearer ${token}`,
}); 
