// API client configuration
const getApiBaseUrl = (): string => {
  // Check if we have an explicit API URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // In development, use localhost or the current host
  if (process.env.NODE_ENV === 'development') {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api`;
    }
    return 'https://foodsave.kz/api';
  }
  
  // In production, try to determine the correct API URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If we're on the mini app domain
    if (hostname.includes('miniapp.foodsave.kz')) {
      return 'https://foodsave.kz/api';
    }
    
    // If we're on localhost or any other domain, try the main API
    return 'https://foodsave.kz/api';
  }
  
  // Default fallback
  return 'https://foodsave.kz/api';
};

const API_BASE_URL = getApiBaseUrl();

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginationResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// Entity types based on backend DTOs
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  telegramUserId?: string | number;
  telegramUsername?: string;
  telegramPhotoUrl?: string;
  telegramLanguageCode?: string;
  telegramRegisteredAt?: string;
  telegramUser?: boolean;
  role: string;
  phoneNumber?: string;
  phone?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
  active?: boolean;
  address?: string;
  password?: string;
  profilePicture?: string;
  registrationSource?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  id: number;
  name: string;
  description?: string;
  logo?: string;
  logoUrl?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  openingHours?: string;
  closingHours?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL';
  category?: string;
  rating?: number;
  ownerId: number;
  managerId?: number;
  managerName?: string;
  ownerName?: string;
  productCount?: number;
  active?: boolean;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  originalPrice: number;
  price?: number; // Backend sends this field - the calculated discounted price
  discountedPrice?: number; // Alternative field name for compatibility
  discountPercentage?: number;
  stockQuantity: number;
  expirationDate?: string;
  storeId: number;
  storeName?: string;
  categoryId?: number;
  categoryName?: string;
  status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'EXPIRED' | 'INACTIVE' | 'DISCONTINUED' | 'HIDDEN' | string;
  isAvailable?: boolean;
  active?: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: number;
  userId: number;
  storeId: number;
  storeName?: string;
  storeAddress?: string;
  storeLogo?: string;
  storePhone?: string;
  orderNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  paymentMethod?: string;
  paymentStatus?: string;
  totalAmount?: number;
  total?: number;
  subtotal?: number;
  totalDiscount?: number;
  orderItems?: OrderItem[];
  items?: OrderItem[]; // Alternative field name
  deliveryAddress?: string;
  deliveryNotes?: string;
  userAddress?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  contactPhone?: string;
  estimatedDeliveryTime?: string;
  trackingNumber?: string;
  reservationDateTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id?: number;
  orderId?: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  totalPrice?: number;
}

// Authentication types
export interface AuthResponse {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user: User;
}

export interface TelegramAuthRequest {
  initData: string;
}

// API client class
class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private activeRequests = new Map<string, Promise<unknown>>(); // Cache for preventing duplicate requests
  private isAuthenticating = false; // Flag to prevent multiple auth attempts

  constructor() {
    this.baseURL = API_BASE_URL;
    
    // Log the API URL in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Base URL:', this.baseURL);
    }
    
    // Load token from localStorage on client side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  clearToken() {
    this.token = null;
    this.isAuthenticating = false; // Reset authentication flag
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Create a unique key for this request
    const requestKey = `${options.method || 'GET'}:${endpoint}:${JSON.stringify(options.body || '')}`;
    
    // If the same request is already in progress, return the existing promise
    if (this.activeRequests.has(requestKey)) {
      return this.activeRequests.get(requestKey) as Promise<T>;
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
      cache: 'no-store',
    };

    const requestPromise = (async () => {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          // Handle 401 Unauthorized - clear tokens
          if (response.status === 401) {
            console.warn('Authentication failed - clearing tokens');
            this.clearToken();
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('API request failed:', {
          url,
          method: options.method || 'GET',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      } finally {
        // Remove from active requests when done
        this.activeRequests.delete(requestKey);
      }
    })();

    // Store the promise to prevent duplicate requests
    this.activeRequests.set(requestKey, requestPromise);
    
    return requestPromise;
  }

  // Helper method for public requests (no auth required)
  private async makePublicRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Public API request failed:', {
        url,
        method: options.method || 'GET', 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  // Authentication methods
  async authenticateWithTelegram(initData: string): Promise<AuthResponse> {
    // Prevent multiple simultaneous authentication attempts
    if (this.isAuthenticating) {
      console.log('Authentication already in progress, waiting...');
      // Wait for current authentication to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (this.token) {
        const user = await this.getCurrentUser();
        return { user, accessToken: this.token, token: this.token };
      }
      throw new Error('Authentication failed - please try again');
    }

    // Check if already authenticated and token is valid
    if (this.token) {
      console.log('Already authenticated, validating token');
      try {
        const user = await this.getCurrentUser();
        return { user, accessToken: this.token, token: this.token };
      } catch {
        console.log('Existing token invalid, proceeding with authentication');
        this.clearToken();
      }
    }

    // Validate initData before making request
    if (!initData || initData.trim().length === 0) {
      throw new Error('Invalid Telegram init data');
    }

    this.isAuthenticating = true;

    try {
      const response = await this.makeRequest<AuthResponse>('/auth/telegram', {
        method: 'POST',
        body: JSON.stringify({ initData }),
      });
      
      // Validate response
      if (!response || !response.user) {
        throw new Error('Invalid authentication response');
      }
      
      // Server returns 'accessToken', not 'token'
      const token = response.accessToken || response.token;
      if (token) {
        this.setToken(token);
      } else {
        throw new Error('No token received from server');
      }
      
      return response;
    } catch (error) {
      console.error('Authentication failed:', error);
      this.clearToken(); // Clear any partial state
      throw error;
    } finally {
      this.isAuthenticating = false;
    }
  }

  async getCurrentUser(): Promise<User> {
    if (!this.token) {
      throw new Error('No authentication token available');
    }
    return this.makeRequest<User>('/auth/me');
  }

  // Store methods
  async getActiveStores(): Promise<Store[]> {
    try {
      const response = await this.makePublicRequest<Store[]>('/stores/active');
      // Ensure response is an array
      return Array.isArray(response) ? response : [];
    } catch (err) {
      console.error('Failed to fetch active stores:', err);
      return [];
    }
  }

  async getStoreById(id: number): Promise<Store> {
    return this.makePublicRequest<Store>(`/stores/${id}`);
  }

  // Product methods
  async getAllProducts(page = 0, size = 20): Promise<PaginationResponse<Product>> {
    try {
      const response = await this.makePublicRequest<PaginationResponse<Product>>(`/products?page=${page}&size=${size}`);
      // Ensure content is an array
      if (!response || !Array.isArray(response.content)) {
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: size,
          number: page,
          first: true,
          last: true
        };
      }
      return response;
    } catch (error) {
      console.error('Failed to fetch products:', error);
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: size,
        number: page,
        first: true,
        last: true
      };
    }
  }

  async getProductsByStore(storeId: number, page = 0, size = 20): Promise<PaginationResponse<Product>> {
    try {
      const response = await this.makePublicRequest<PaginationResponse<Product>>(`/products/store/${storeId}?page=${page}&size=${size}`);
      // Ensure content is an array
      if (!response || !Array.isArray(response.content)) {
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: size,
          number: page,
          first: true,
          last: true
        };
      }
      return response;
    } catch (error) {
      console.error('Failed to fetch store products:', error);
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: size,
        number: page,
        first: true,
        last: true
      };
    }
  }

  async getProductById(id: number): Promise<Product> {
    return this.makePublicRequest<Product>(`/products/${id}`);
  }

  async getFeaturedProducts(page = 0, size = 20): Promise<PaginationResponse<Product>> {
    try {
      const response = await this.makePublicRequest<PaginationResponse<Product>>(`/products/featured?page=${page}&size=${size}`);
      // Ensure content is an array
      if (!response || !Array.isArray(response.content)) {
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: size,
          number: page,
          first: true,
          last: true
        };
      }
      return response;
    } catch (error) {
      console.error('Failed to fetch featured products:', error);
      
      // Try fallback to all products if featured fails
      try {
        console.log('Trying fallback to all products...');
        return await this.getAllProducts(page, size);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: size,
          number: page,
          first: true,
          last: true
        };
      }
    }
  }

  // Order methods
  async getMyOrders(): Promise<Order[]> {
    try {
      if (!this.token) {
        throw new Error('Authentication required');
      }
      const response = await this.makeRequest<Order[]>('/orders/my-orders', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      
      // Ensure response is an array and normalize the data
      if (!Array.isArray(response)) {
        return [];
      }
      
      // Normalize order data to ensure all required fields are present
      return response.map(order => ({
        ...order,
        orderItems: Array.isArray(order.orderItems) ? order.orderItems : 
                   Array.isArray(order.items) ? order.items : [],
        totalAmount: order.totalAmount || order.total || 0,
        storeName: order.storeName || 'Unknown Store',
        notes: order.notes || order.deliveryNotes || ''
      }));
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      return [];
    }
  }

  async getOrderById(id: number): Promise<Order> {
    return this.makeRequest<Order>(`/orders/${id}`);
  }

  async cancelOrder(id: number): Promise<Order> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    const response = await this.makeRequest<Order>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify('CANCELLED'),
    });

    return {
      ...response,
      orderItems: Array.isArray(response.orderItems)
        ? response.orderItems
        : Array.isArray(response.items)
          ? response.items
          : [],
      totalAmount: response.totalAmount || response.total || 0,
      storeName: response.storeName || 'Unknown Store',
      notes: response.notes || response.deliveryNotes || ''
    };
  }

  // Update current user profile (firstName, lastName, phone)
  async updateProfile(data: { firstName?: string; lastName?: string; phone?: string }): Promise<User> {
    return this.makeRequest<User>('/users/profile/update', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Mini App specific method for creating reservations
  async createReservation(orderData: {
    productId: number;
    quantity: number;
    note?: string;
    deliveryType?: 'PICKUP' | 'COURIER';
    contactPhone?: string;
  }): Promise<Order> {
    const reservationData = {
      productId: orderData.productId,
      quantity: orderData.quantity,
      note: orderData.note || 'Забронировано через мини-приложение Telegram',
      deliveryType: orderData.deliveryType || 'PICKUP',
      contactPhone: orderData.contactPhone,
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating reservation with data:', reservationData);
    }
    
    return this.makeRequest<Order>('/miniapp/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData),
    });
  }

  // Legacy method - keep for compatibility but use createReservation instead
  async createOrder(orderData: {
    storeId: number;
    orderItems: Array<{
      productId: number;
      quantity: number;
    }>;
    notes?: string;
    reservationDateTime?: string;
    contactPhone?: string;
  }): Promise<Order> {
    // For mini app, use the first product for reservation
    if (orderData.orderItems && orderData.orderItems.length > 0) {
      const firstItem = orderData.orderItems[0];
      return this.createReservation({
        productId: firstItem.productId,
        quantity: firstItem.quantity,
        note: orderData.notes || 'Забронировано через мини-приложение Telegram'
      });
    }
    
    throw new Error('No items to order');
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Helper function to safely handle arrays
export const safeArray = <T>(data: T[] | undefined | null): T[] => {
  return Array.isArray(data) ? data : [];
};

// Helper function to safely handle pagination data
export const safePaginationResponse = <T>(
  data: PaginationResponse<T> | undefined | null,
  page = 0,
  size = 20
): PaginationResponse<T> => {
  if (!data || !Array.isArray(data.content)) {
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: size,
      number: page,
      first: true,
      last: true
    };
  }
  return data;
};

// Product visibility guard for mini app listings/details.
export const isProductVisibleInMiniApp = (product: Product | null | undefined): boolean => {
  if (!product) return false;

  if (product.active === false) return false;

  if (typeof product.isAvailable === 'boolean') {
    return product.isAvailable;
  }

  const status = String(product.status || '').toUpperCase();
  if (!status) {
    return (product.stockQuantity ?? 0) > 0;
  }

  if (status === 'AVAILABLE') {
    return (product.stockQuantity ?? 0) > 0;
  }

  const blockedStatuses = new Set(['OUT_OF_STOCK', 'EXPIRED', 'DISCONTINUED', 'HIDDEN', 'INACTIVE']);
  return !blockedStatuses.has(status) && (product.stockQuantity ?? 0) > 0;
};

// Rate limiting helper
let lastRequestTime = 0;
const REQUEST_THROTTLE_MS = 500; // 500ms between requests

export const throttleRequest = async (): Promise<void> => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < REQUEST_THROTTLE_MS) {
    const waitTime = REQUEST_THROTTLE_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
};

// Helper hooks and functions for React components
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};
