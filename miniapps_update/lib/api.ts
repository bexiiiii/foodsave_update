// API client configuration
const getApiBaseUrl = (): string => {
  // Check if we have an explicit API URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // In development, use localhost or the current host
  if (process.env.NODE_ENV === 'development') {
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
  lastLatitude?: number;
  lastLongitude?: number;
  lastLocationAccuracyMeters?: number;
  lastLocationUpdatedAt?: string;
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

export interface NotificationSettings {
  id?: number;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  orderUpdates: boolean;
  promotions: boolean;
  systemUpdates: boolean;
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
  isFavorite?: boolean;
  closingSoon?: boolean;
  closingSoonMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string | null;
  active: boolean;
}

export type ProductAvailability = 'AVAILABLE' | 'RESERVED' | 'SOLD_OUT' | 'UNAVAILABLE';

export interface Product {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  originalPrice: number;
  price?: number; // Backend sends this field - the calculated discounted price
  discountedPrice?: number; // Alternative field name for compatibility
  discountPercentage?: number;
  stockQuantity: number;
  sortOrder?: number;
  expirationDate?: string;
  storeId: number;
  storeName?: string;
  categoryId?: number;
  categoryName?: string;
  storeLatitude?: number;
  storeLongitude?: number;
  status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'EXPIRED' | 'INACTIVE' | 'DISCONTINUED' | 'HIDDEN' | string;
  isAvailable?: boolean;
  canReserve?: boolean;
  availabilityState?: ProductAvailability;
  active?: boolean;
  featured: boolean;
  isFavorite?: boolean;
  closingSoon?: boolean;
  closingSoonMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FavoritesResponse {
  stores: Store[];
  products: Product[];
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
  status: 'CREATED' | 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'CANCELLED_BY_USER' | 'CANCELLED_BY_PARTNER' | 'EXPIRED' | 'NO_SHOW' | 'REJECTED' | 'REFUNDED';
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

export type ReservationCancellationReason =
  | 'USER_CHANGED_MIND'
  | 'USER_TOO_FAR'
  | 'USER_WRONG_TIME'
  | 'USER_ORDERED_BY_MISTAKE'
  | 'OTHER';

export interface ProductEventPayload {
  eventType: string;
  sessionId?: string;
  source?: string;
  telegramPostId?: string;
  campaignId?: string;
  notificationId?: number;
  notificationGroupId?: number;
  partnerId?: number;
  branchId?: number;
  boxId?: number;
  deepLink?: string;
  startParam?: string;
  platform?: string;
  deviceType?: string;
  appVersion?: string;
  language?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface DecisionHelpResponse {
  showPrompt: boolean;
  recentViews: number;
  uniqueBoxes: number;
}

export interface NotificationGroup {
  id: number;
  status: string;
  notificationType: string;
  triggerType: string;
  timeWindow: string;
  totalPartners: number;
  totalBoxes: number;
  minimumPrice?: number;
  maximumDiscount?: number;
  deepLink?: string;
  campaignId?: string;
  scheduledAt?: string;
  sentAt?: string;
  openedAt?: string;
  items: NotificationGroupItem[];
}

export interface NotificationGroupItem {
  id: number;
  partnerId: number;
  partnerName: string;
  branchId: number;
  branchName: string;
  boxId?: number;
  boxName?: string;
  boxImageUrl?: string;
  availableQuantity: number;
  price?: number;
  originalPrice?: number;
  discountPercent?: number;
  pickupEndAt?: string;
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
          let message = `HTTP error! status: ${response.status}`;
          try {
            const errorText = await response.text();
            if (errorText) {
              const errorBody = JSON.parse(errorText);
              message = errorBody.message || errorBody.error || message;
            }
          } catch {
            // Keep the status-based fallback when the server returns non-JSON.
          }
          throw new Error(message);
        }

        if (response.status === 204) {
          return undefined as T;
        }
        const text = await response.text();
        return text ? JSON.parse(text) : (undefined as T);
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

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      let response = await fetch(url, config);

      // Public catalogue pages must remain available when a stored JWT expires.
      // Retry anonymously; the next Telegram auth pass will issue a fresh token.
      if ((response.status === 401 || response.status === 403) && headers.Authorization) {
        this.clearToken();
        const anonymousHeaders = { ...headers };
        delete anonymousHeaders.Authorization;
        response = await fetch(url, { ...config, headers: anonymousHeaders });
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (response.status === 204) return undefined as T;
      const text = await response.text();
      return text ? JSON.parse(text) : (undefined as T);
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

  async updateMyLocation(latitude: number, longitude: number, accuracyMeters?: number): Promise<User> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    return this.makeRequest<User>('/users/profile/location', {
      method: 'PUT',
      body: JSON.stringify({
        latitude,
        longitude,
        accuracyMeters,
      }),
    });
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

  async searchStores(query: string, page = 0, size = 20): Promise<PaginationResponse<Store>> {
    try {
      const response = await this.makePublicRequest<PaginationResponse<Store>>(
        `/stores/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}`
      );
      if (!response || !Array.isArray(response.content)) {
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size,
          number: page,
          first: true,
          last: true
        };
      }
      return response;
    } catch (err) {
      console.error('Failed to search stores:', err);
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size,
        number: page,
        first: true,
        last: true
      };
    }
  }

  async getActiveCategories(): Promise<Category[]> {
    try {
      const response = await this.makePublicRequest<Category[]>('/categories/active');
      return Array.isArray(response) ? response : [];
    } catch (err) {
      console.error('Failed to fetch active categories:', err);
      return [];
    }
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

  async searchProducts(query: string, page = 0, size = 50, minPrice?: number, maxPrice?: number): Promise<PaginationResponse<Product>> {
    try {
      const priceParams = [
        Number.isFinite(minPrice) ? `minPrice=${encodeURIComponent(String(minPrice))}` : null,
        Number.isFinite(maxPrice) ? `maxPrice=${encodeURIComponent(String(maxPrice))}` : null,
      ].filter(Boolean).join('&');
      const response = await this.makePublicRequest<PaginationResponse<Product>>(
        `/products/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}&includeUnavailable=true${priceParams ? `&${priceParams}` : ''}`
      );
      if (!response || !Array.isArray(response.content)) {
        return { content: [], totalElements: 0, totalPages: 0, size, number: page, first: true, last: true };
      }
      return response;
    } catch (error) {
      console.error('Failed to search products:', error);
      return { content: [], totalElements: 0, totalPages: 0, size, number: page, first: true, last: true };
    }
  }

  async getProductsByStore(storeId: number, page = 0, size = 20): Promise<PaginationResponse<Product>> {
    try {
      const response = await this.makePublicRequest<PaginationResponse<Product>>(`/products/store/${storeId}?page=${page}&size=${size}&includeUnavailable=true`);
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
    const cacheKey = `foodsave-product-${id}`;
    try {
      const product = await this.makePublicRequest<Product>(`/products/${id}`);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(cacheKey, JSON.stringify(product));
      }
      return product;
    } catch (error) {
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached) as Product;
          } catch {
            sessionStorage.removeItem(cacheKey);
          }
        }
      }
      throw error;
    }
  }

  // Favorites methods
  async getFavorites(): Promise<FavoritesResponse> {
    try {
      const response = await this.makeRequest<FavoritesResponse>('/favorites');
      return {
        stores: Array.isArray(response?.stores) ? response.stores : [],
        products: Array.isArray(response?.products) ? response.products : [],
      };
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
      return { stores: [], products: [] };
    }
  }

  async addFavoriteStore(storeId: number): Promise<void> {
    await this.makeRequest<void>(`/favorites/store/${storeId}`, { method: 'POST' });
  }

  async removeFavoriteStore(storeId: number): Promise<void> {
    await this.makeRequest<void>(`/favorites/store/${storeId}`, { method: 'DELETE' });
  }

  async addFavoriteProduct(productId: number): Promise<void> {
    await this.makeRequest<void>(`/favorites/product/${productId}`, { method: 'POST' });
  }

  async removeFavoriteProduct(productId: number): Promise<void> {
    await this.makeRequest<void>(`/favorites/product/${productId}`, { method: 'DELETE' });
  }

  async toggleFavoriteStore(storeId: number, isFavorite: boolean): Promise<void> {
    if (isFavorite) {
      await this.removeFavoriteStore(storeId);
    } else {
      await this.addFavoriteStore(storeId);
    }
  }

  async toggleFavoriteProduct(productId: number, isFavorite: boolean): Promise<void> {
    if (isFavorite) {
      await this.removeFavoriteProduct(productId);
    } else {
      await this.addFavoriteProduct(productId);
    }
  }

  async getFeaturedProducts(page = 0, size = 20, minPrice?: number, maxPrice?: number): Promise<PaginationResponse<Product>> {
    try {
      const priceParams = [
        Number.isFinite(minPrice) ? `minPrice=${encodeURIComponent(String(minPrice))}` : null,
        Number.isFinite(maxPrice) ? `maxPrice=${encodeURIComponent(String(maxPrice))}` : null,
      ].filter(Boolean).join('&');
      const response = await this.makePublicRequest<PaginationResponse<Product>>(`/products/featured?page=${page}&size=${size}&includeUnavailable=true${priceParams ? `&${priceParams}` : ''}`);
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

  async getRecommendedProducts(page = 0, size = 20, minPrice?: number, maxPrice?: number): Promise<PaginationResponse<Product>> {
    try {
      const priceParams = [
        Number.isFinite(minPrice) ? `minPrice=${encodeURIComponent(String(minPrice))}` : null,
        Number.isFinite(maxPrice) ? `maxPrice=${encodeURIComponent(String(maxPrice))}` : null,
      ].filter(Boolean).join('&');
      const response = await this.makePublicRequest<PaginationResponse<Product>>(
        `/products/recommended?page=${page}&size=${size}${priceParams ? `&${priceParams}` : ''}`
      );
      if (!response || !Array.isArray(response.content)) {
        return { content: [], totalElements: 0, totalPages: 0, size, number: page, first: true, last: true };
      }
      return response;
    } catch (error) {
      console.error('Failed to fetch recommended products:', error);
      return this.getFeaturedProducts(page, size, minPrice, maxPrice);
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

  async cancelOrder(id: number, cancellationReason: ReservationCancellationReason, cancellationComment?: string): Promise<Order> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    const response = await this.makeRequest<Order>(`/orders/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({
        cancellationReason,
        cancellationComment: cancellationComment?.trim() || undefined,
      }),
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

  async markOrderPickedUp(id: number): Promise<Order> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    const response = await this.makeRequest<Order>(`/orders/${id}/picked-up`, {
      method: 'PUT',
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

  async getNotificationSettings(): Promise<NotificationSettings> {
    return this.makeRequest<NotificationSettings>('/notifications/settings');
  }

  async updateNotificationSettings(data: NotificationSettings): Promise<NotificationSettings> {
    return this.makeRequest<NotificationSettings>('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async trackEvent(payload: ProductEventPayload): Promise<void> {
    try {
      await this.makePublicRequest('/analytics/events', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'telegram_miniapp',
          ...payload,
        }),
      });
    } catch (error) {
      console.warn('Analytics event ignored:', error);
    }
  }

  async shouldShowDecisionHelp(sessionId?: string): Promise<DecisionHelpResponse> {
    try {
      const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
      const response = await this.makePublicRequest<DecisionHelpResponse>(`/analytics/decision-help${query}`);
      return {
        showPrompt: !!response?.showPrompt,
        recentViews: Number(response?.recentViews || 0),
        uniqueBoxes: Number(response?.uniqueBoxes || 0),
      };
    } catch (error) {
      console.warn('Decision help check ignored:', error);
      return { showPrompt: false, recentViews: 0, uniqueBoxes: 0 };
    }
  }

  async getNotificationGroup(id: number): Promise<NotificationGroup> {
    return this.makePublicRequest<NotificationGroup>(`/notifications/groups/${id}`);
  }

  async markNotificationGroupOpened(id: number): Promise<void> {
    try {
      await this.makePublicRequest(`/notifications/groups/${id}/opened`, { method: 'POST' });
    } catch (error) {
      console.warn('Notification open event ignored:', error);
    }
  }

  // Mini App specific method for creating reservations
  async createReservation(orderData: {
    productId: number;
    quantity: number;
    note?: string;
    deliveryType?: 'PICKUP' | 'COURIER';
    contactPhone?: string;
    acquisitionSource?: string;
    campaignId?: string;
    notificationId?: number;
    notificationGroupId?: number;
    telegramPostId?: string;
    startParam?: string;
    sessionId?: string;
  }): Promise<Order> {
    const reservationData = {
      productId: orderData.productId,
      quantity: orderData.quantity,
      note: orderData.note || 'Забронировано через мини-приложение Telegram',
      deliveryType: orderData.deliveryType || 'PICKUP',
      contactPhone: orderData.contactPhone,
      acquisitionSource: orderData.acquisitionSource,
      campaignId: orderData.campaignId,
      notificationId: orderData.notificationId,
      notificationGroupId: orderData.notificationGroupId,
      telegramPostId: orderData.telegramPostId,
      startParam: orderData.startParam,
      sessionId: orderData.sessionId,
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

  const expiration = product.expirationDate;
  if (expiration) {
    // The expiry value is a calendar date: a box dated August 7 becomes
    // unavailable at 00:00 on August 7 in Asia/Almaty, regardless of its time.
    const expiryDate = expiration.slice(0, 10);
    const dateParts = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Almaty',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const part = (type: 'year' | 'month' | 'day') =>
      dateParts.find((item) => item.type === type)?.value || '';
    const todayInAlmaty = `${part('year')}-${part('month')}-${part('day')}`;
    if (expiryDate <= todayInAlmaty) return false;
  }

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

export const getProductAvailability = (product: Product | null | undefined): ProductAvailability => {
  if (!product) return 'UNAVAILABLE';
  if (product.availabilityState) return product.availabilityState;
  return isProductVisibleInMiniApp(product) ? 'AVAILABLE' : ((product.stockQuantity ?? 0) <= 0 ? 'SOLD_OUT' : 'UNAVAILABLE');
};

export const isProductDisplayableInMiniApp = (product: Product | null | undefined): boolean => {
  if (!product || product.active === false) return false;
  const status = String(product.status || '').toUpperCase();
  if (new Set(['EXPIRED', 'DISCONTINUED', 'HIDDEN', 'INACTIVE']).has(status)) return false;
  if (canReserveProduct(product)) return true;
  if (!product.createdAt) return false;

  const dateInAlmaty = (value: Date) => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);

  const createdAtText = String(product.createdAt);
  const parsedCreatedAt = new Date(createdAtText);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(createdAtText) && Number.isNaN(parsedCreatedAt.getTime())) return false;
  const createdBusinessDate = /^\d{4}-\d{2}-\d{2}T/.test(createdAtText)
    ? createdAtText.slice(0, 10)
    : dateInAlmaty(parsedCreatedAt);
  return createdBusinessDate === dateInAlmaty(new Date());
};

export const canReserveProduct = (product: Product | null | undefined): boolean =>
  !!product && (typeof product.canReserve === 'boolean'
    ? product.canReserve
    : getProductAvailability(product) === 'AVAILABLE');

export const getProductAvailabilityPresentation = (product: Product | null | undefined) => {
  const state = getProductAvailability(product);
  switch (state) {
    case 'RESERVED':
      return {
        state,
        label: 'Забронировано',
        message: 'Все доступные боксы сейчас в активных бронях. Если одну из броней отменят, бокс снова можно будет забронировать.',
        tone: 'reserved' as const,
      };
    case 'SOLD_OUT':
      return {
        state,
        label: 'Нет в наличии',
        message: 'Свободных боксов больше нет. Посмотрите другие доступные варианты.',
        tone: 'sold-out' as const,
      };
    case 'UNAVAILABLE':
      return { state, label: 'Недоступно', message: 'Этот бокс сейчас недоступен для бронирования.', tone: 'unavailable' as const };
    default:
      return { state, label: 'В наличии', message: '', tone: 'available' as const };
  }
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
