import { 
  ProductDTO, 
  OrderDTO, 
  StoreDTO, 
  UserProfile, 
  CartDTO, 
  DiscountDTO, 
  ReviewDTO, 
  NotificationDTO,
  SearchResult,
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  ProductCreateRequest,
  ProductUpdateRequest,
  OrderCreateRequest,
  StoreCreateRequest,
  StoreUpdateRequest,
  ProfileUpdateRequest,
  ChangePasswordRequest,
  CartAddItemRequest,
  CartUpdateItemRequest,
  ReviewCreateRequest,
  DiscountCreateRequest,
  AnalyticsData
} from '../types/api';
import { BASE_URL, API_ENDPOINTS, DEFAULT_HEADERS } from '../config/api';

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  error?: string;
}

class ApiService {
  private static instance: ApiService;
  private token: string | null = null;

  private constructor() {
    this.token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  public setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  public clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      // List of public endpoints that don't require token
      const publicEndpoints = [
        API_ENDPOINTS.AUTH.LOGIN,
        API_ENDPOINTS.AUTH.REGISTER,
        '/api/v3/api-docs',
        '/swagger-ui'
      ];

      const headers = {
        ...DEFAULT_HEADERS,
        ...(this.token && !publicEndpoints.includes(endpoint) ? { Authorization: `Bearer ${this.token}` } : {}),
        ...options.headers,
      };

      // Always use full URL with /api
      const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
      console.log('API Request:', `${BASE_URL}${url}`);

      const response = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = 'An error occurred';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        
        // Handle specific status codes
        if (response.status === 401) {
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/signin';
          }
        }
        
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      return {} as T;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  public async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.accessToken);
    return response;
  }

  public async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      {
        method: 'POST',
        body: JSON.stringify(userData),
      }
    );
    return response;
  }

  public async logout(): Promise<void> {
    try {
      await this.request(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      this.clearToken();
    }
  }

  public async verifyEmail(token: string): Promise<void> {
    // TODO: Add VERIFY_EMAIL endpoint to API_ENDPOINTS
    await this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  public async refreshToken(): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(API_ENDPOINTS.AUTH.REFRESH, {
      method: 'POST',
    });
    this.setToken(response.accessToken);
    return response;
  }

  // User endpoints
  public async getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>(API_ENDPOINTS.USERS.PROFILE);
  }

  public async updateProfile(profileData: ProfileUpdateRequest): Promise<UserProfile> {
    return this.request<UserProfile>(API_ENDPOINTS.USERS.UPDATE_PROFILE, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  public async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    await this.request(API_ENDPOINTS.USERS.CHANGE_PASSWORD, {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  public async forgotPassword(email: string): Promise<void> {
    await this.request(API_ENDPOINTS.USERS.FORGOT_PASSWORD, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.request(API_ENDPOINTS.USERS.RESET_PASSWORD, {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // Store endpoints
  public async getStores(): Promise<StoreDTO[]> {
    return this.request<StoreDTO[]>(API_ENDPOINTS.STORES.BASE);
  }

  public async getMyStore(): Promise<StoreDTO> {
    return this.request<StoreDTO>(API_ENDPOINTS.STORES.MY_STORE);
  }

  public async createStore(storeData: StoreCreateRequest): Promise<StoreDTO> {
    return this.request<StoreDTO>(API_ENDPOINTS.STORES.BASE, {
      method: 'POST',
      body: JSON.stringify(storeData),
    });
  }

  public async updateStore(storeId: string, storeData: StoreUpdateRequest): Promise<StoreDTO> {
    return this.request<StoreDTO>(`${API_ENDPOINTS.STORES.BASE}/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify(storeData),
    });
  }

  // Product endpoints
  public async getProducts(): Promise<ProductDTO[]> {
    return this.request<ProductDTO[]>(API_ENDPOINTS.PRODUCTS.BASE);
  }

  public async getProduct(productId: string): Promise<ProductDTO> {
    return this.request<ProductDTO>(`${API_ENDPOINTS.PRODUCTS.BASE}/${productId}`);
  }

  public async getStoreProducts(storeId: string): Promise<ProductDTO[]> {
    return this.request<ProductDTO[]>(`${API_ENDPOINTS.PRODUCTS.STORE_PRODUCTS}/${storeId}`);
  }

  public async createProduct(productData: ProductCreateRequest): Promise<ProductDTO> {
    return this.request<ProductDTO>(API_ENDPOINTS.PRODUCTS.BASE, {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  public async updateProduct(productId: string, productData: ProductUpdateRequest): Promise<ProductDTO> {
    return this.request<ProductDTO>(`${API_ENDPOINTS.PRODUCTS.BASE}/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  public async deleteProduct(productId: string): Promise<void> {
    await this.request(`${API_ENDPOINTS.PRODUCTS.BASE}/${productId}`, {
      method: 'DELETE',
    });
  }

  // Order endpoints
  public async getOrders(): Promise<OrderDTO[]> {
    return this.request<OrderDTO[]>(API_ENDPOINTS.ORDERS.BASE);
  }

  public async getMyOrders(): Promise<OrderDTO[]> {
    return this.request<OrderDTO[]>(API_ENDPOINTS.ORDERS.MY_ORDERS);
  }

  public async getStoreOrders(): Promise<OrderDTO[]> {
    return this.request<OrderDTO[]>(API_ENDPOINTS.ORDERS.STORE_ORDERS);
  }

  public async createOrder(orderData: OrderCreateRequest): Promise<OrderDTO> {
    return this.request<OrderDTO>(API_ENDPOINTS.ORDERS.BASE, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  public async updateOrderStatus(orderId: string, status: string): Promise<OrderDTO> {
    return this.request<OrderDTO>(`${API_ENDPOINTS.ORDERS.UPDATE_STATUS}/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify(status),
    });
  }

  // Cart endpoints
  public async getCart(): Promise<CartDTO> {
    return this.request<CartDTO>(API_ENDPOINTS.CART.BASE);
  }

  public async addToCart(itemData: CartAddItemRequest): Promise<CartDTO> {
    return this.request<CartDTO>(API_ENDPOINTS.CART.ADD_ITEM, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  public async removeFromCart(itemId: string): Promise<CartDTO> {
    return this.request<CartDTO>(`${API_ENDPOINTS.CART.REMOVE_ITEM}/${itemId}`, {
      method: 'DELETE',
    });
  }

  public async updateCartItem(itemId: string, updateData: CartUpdateItemRequest): Promise<CartDTO> {
    return this.request<CartDTO>(`${API_ENDPOINTS.CART.UPDATE_ITEM}/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  public async clearCart(): Promise<CartDTO> {
    return this.request<CartDTO>(API_ENDPOINTS.CART.CLEAR, {
      method: 'DELETE',
    });
  }

  // Discount endpoints
  public async getDiscounts(): Promise<DiscountDTO[]> {
    return this.request<DiscountDTO[]>(API_ENDPOINTS.DISCOUNTS.BASE);
  }

  public async createDiscount(discountData: DiscountCreateRequest): Promise<DiscountDTO> {
    return this.request<DiscountDTO>(API_ENDPOINTS.DISCOUNTS.BASE, {
      method: 'POST',
      body: JSON.stringify(discountData),
    });
  }

  public async applyDiscount(code: string): Promise<DiscountDTO> {
    return this.request<DiscountDTO>(API_ENDPOINTS.DISCOUNTS.APPLY, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  public async validateDiscount(code: string): Promise<DiscountDTO> {
    return this.request<DiscountDTO>(API_ENDPOINTS.DISCOUNTS.VALIDATE, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // Review endpoints
  public async getProductReviews(productId: string): Promise<ReviewDTO[]> {
    return this.request<ReviewDTO[]>(`${API_ENDPOINTS.REVIEWS.PRODUCT_REVIEWS}/${productId}`);
  }

  public async createReview(reviewData: ReviewCreateRequest): Promise<ReviewDTO> {
    return this.request<ReviewDTO>(API_ENDPOINTS.REVIEWS.BASE, {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  // Notification endpoints
  public async getNotifications(): Promise<NotificationDTO[]> {
    return this.request<NotificationDTO[]>(API_ENDPOINTS.NOTIFICATIONS.BASE);
  }

  public async getUnreadCount(): Promise<number> {
    return this.request<number>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
  }

  public async markNotificationAsRead(notificationId: string): Promise<NotificationDTO> {
    return this.request<NotificationDTO>(`${API_ENDPOINTS.NOTIFICATIONS.MARK_READ}/${notificationId}`, {
      method: 'PUT',
    });
  }

  public async markAllNotificationsAsRead(): Promise<void> {
    await this.request(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {
      method: 'PUT',
    });
  }

  // Analytics endpoints
  public async getAnalytics(): Promise<AnalyticsData> {
    return this.request<AnalyticsData>(API_ENDPOINTS.ANALYTICS.DASHBOARD);
  }

  public async getStoreSalesAnalytics(storeId: string): Promise<AnalyticsData> {
    return this.request<AnalyticsData>(`${API_ENDPOINTS.ANALYTICS.STORE_SALES}/${storeId}`);
  }

  public async getStoreProductsAnalytics(storeId: string): Promise<AnalyticsData> {
    return this.request<AnalyticsData>(`${API_ENDPOINTS.ANALYTICS.STORE_PRODUCTS}/${storeId}`);
  }

  public async getStoreDiscountsAnalytics(storeId: string): Promise<AnalyticsData> {
    return this.request<AnalyticsData>(`${API_ENDPOINTS.ANALYTICS.STORE_DISCOUNTS}/${storeId}`);
  }

  public async getStoreUsersAnalytics(storeId: string): Promise<AnalyticsData> {
    return this.request<AnalyticsData>(`${API_ENDPOINTS.ANALYTICS.STORE_USERS}/${storeId}`);
  }

  // Search endpoint
  public async search(query: string): Promise<SearchResult> {
    return this.request<SearchResult>(`${API_ENDPOINTS.SEARCH.BASE}?query=${encodeURIComponent(query)}`);
  }

  // Health endpoint
  public async getHealth(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>(API_ENDPOINTS.HEALTH.BASE);
  }
}

export default ApiService;

// Create and export dashboardApi instance with SSR-safe initialization
export const dashboardApi = typeof window !== 'undefined' ? ApiService.getInstance() : {} as ApiService;

// Export api instance for backward compatibility
export const api = typeof window !== 'undefined' ? ApiService.getInstance() : {} as ApiService;
