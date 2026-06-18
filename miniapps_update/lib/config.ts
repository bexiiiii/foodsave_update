// API Configuration and Constants

export const API_CONFIG = {
  // Base URL for API requests
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://foodsave.kz/api',
  
  // Request timeouts (in milliseconds)
  TIMEOUT: {
    DEFAULT: 30000, // 30 seconds
    UPLOAD: 60000,  // 1 minute for file uploads
    AUTH: 15000,    // 15 seconds for auth requests
  },
  
  // Cache durations (in milliseconds)
  CACHE_TIME: {
    STORES: 10 * 60 * 1000,      // 10 minutes
    PRODUCTS: 2 * 60 * 1000,     // 2 minutes
    FEATURED: 5 * 60 * 1000,     // 5 minutes
    ORDERS: 30 * 1000,           // 30 seconds
    USER: 5 * 60 * 1000,         // 5 minutes
  },
  
  // Rate limiting
  RATE_LIMIT: {
    AUTH_THROTTLE: 5000,         // 5 seconds between auth attempts
    REQUEST_THROTTLE: 500,       // 500ms between general requests
    RETRY_DELAY: 1000,           // 1 second base retry delay
    MAX_RETRIES: 3,              // Maximum retry attempts
  },
  
  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  
  // Error codes and messages
  ERROR_CODES: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    SERVER_ERROR: 'SERVER_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMITED: 'RATE_LIMITED',
  },
  
  // Default error messages
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Проблемы с сетью. Проверьте подключение к интернету.',
    TIMEOUT: 'Запрос занял слишком много времени. Попробуйте позже.',
    UNAUTHORIZED: 'Необходима авторизация.',
    FORBIDDEN: 'Доступ запрещен.',
    NOT_FOUND: 'Запрашиваемый ресурс не найден.',
    SERVER_ERROR: 'Ошибка сервера. Попробуйте позже.',
    VALIDATION_ERROR: 'Некорректные данные.',
    RATE_LIMITED: 'Слишком много запросов. Подождите немного.',
    UNKNOWN: 'Произошла неизвестная ошибка.',
  },
} as const;

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    TELEGRAM: '/auth/telegram',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  
  // Stores
  STORES: {
    ACTIVE: '/stores/active',
    BY_ID: (id: number) => `/stores/${id}`,
    SEARCH: '/stores/search',
  },
  
  // Products
  PRODUCTS: {
    ALL: '/products',
    BY_ID: (id: number) => `/products/${id}`,
    BY_STORE: (storeId: number) => `/products/store/${storeId}`,
    FEATURED: '/products/featured',
    SEARCH: '/products/search',
  },
  
  // Orders
  ORDERS: {
    MY_ORDERS: '/orders/my-orders',
    BY_ID: (id: number) => `/orders/${id}`,
    CREATE: '/orders',
    UPDATE: (id: number) => `/orders/${id}`,
    CANCEL: (id: number) => `/orders/${id}/cancel`,
  },
  
  // Mini App specific
  MINIAPP: {
    RESERVATIONS: '/miniapp/reservations',
  },
  
  // Categories
  CATEGORIES: {
    ALL: '/categories',
    BY_ID: (id: number) => `/categories/${id}`,
  },
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Utility function to get error message by status code
export const getErrorMessageByStatus = (status: number): string => {
  switch (status) {
    case HTTP_STATUS.BAD_REQUEST:
      return API_CONFIG.ERROR_MESSAGES.VALIDATION_ERROR;
    case HTTP_STATUS.UNAUTHORIZED:
      return API_CONFIG.ERROR_MESSAGES.UNAUTHORIZED;
    case HTTP_STATUS.FORBIDDEN:
      return API_CONFIG.ERROR_MESSAGES.FORBIDDEN;
    case HTTP_STATUS.NOT_FOUND:
      return API_CONFIG.ERROR_MESSAGES.NOT_FOUND;
    case HTTP_STATUS.TOO_MANY_REQUESTS:
      return API_CONFIG.ERROR_MESSAGES.RATE_LIMITED;
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
    case HTTP_STATUS.BAD_GATEWAY:
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
    case HTTP_STATUS.GATEWAY_TIMEOUT:
      return API_CONFIG.ERROR_MESSAGES.SERVER_ERROR;
    default:
      return API_CONFIG.ERROR_MESSAGES.UNKNOWN;
  }
};

// Utility function to check if error is retriable
export const isRetriableError = (status: number): boolean => {
  const retriableStatuses = [
    HTTP_STATUS.TOO_MANY_REQUESTS,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    HTTP_STATUS.BAD_GATEWAY,
    HTTP_STATUS.SERVICE_UNAVAILABLE,
    HTTP_STATUS.GATEWAY_TIMEOUT,
  ] as number[];
  
  return retriableStatuses.includes(status);
};