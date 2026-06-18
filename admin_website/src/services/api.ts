import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { NotificationDTO, DiscountDTO, AnalyticsData, DailySalesAnalytics, DailySalesOrderDetail, LoginRequest, AuthResponse, OrderDTO, StoreDTO, StoreCreateRequest, StoreUpdateRequest, PageableResponse, UserDTO, UserCreateRequest, UserUpdateRequest, ReviewDTO, CartDTO, CartAddItemRequest, CartUpdateItemRequest, OrderStatsDTO, StoreOrderStatsDTO } from '@/types/api';
import { BASE_URL, API_ENDPOINTS, DEFAULT_HEADERS } from '../config/api';
import { safeLocalStorage } from '@/utils/storage';

const api = axios.create({
    baseURL: BASE_URL,
    headers: DEFAULT_HEADERS
});

// Add request interceptor for authentication
api.interceptors.request.use((config) => {
    const token = safeLocalStorage.getItem('token');
    if (token) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
        console.log('Request headers:', config.headers); // Debug log
    }
    return config;
}, (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
});

// Add response interceptor for better error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            // Handle specific error cases
            switch (error.response.status) {
                case 401:
                    // Проверяем, не находимся ли мы уже на странице логина
                    // и не является ли это ответом на запрос логина
                    const isLoginRequest = error.config?.url?.includes('/auth/login');
                    const isLoginPage = typeof window !== 'undefined' && window.location.pathname.includes('/login');
                    const token = safeLocalStorage.getItem('token');
                    
                    // Если нет токена и мы не на странице логина - редирект
                    if (!token && !isLoginPage && !isLoginRequest && typeof window !== 'undefined') {
                        safeLocalStorage.removeItem('token');
                        safeLocalStorage.removeItem('user');
                        window.location.href = '/login';
                    }
                    break;
                case 403:
                    console.error('Access denied - Insufficient permissions');
                    window.location.href = '/unauthorized';
                    break;
                case 500:
                    console.error('Server error - Please try again later');
                    break;
                default:
                    const errorData = error.response?.data;
                    if (typeof errorData === 'string') {
                        console.error('API Error:', errorData);
                    } else if (typeof errorData === 'object' && errorData !== null) {
                        console.error('API Error:', JSON.stringify(errorData, null, 2));
                    } else {
                        console.error('API Error: Unknown format', errorData);
                    }
            }
        } else if (error.request) {
            console.error('Network error - No response received');
        } else {
            console.error('Error:', error.message);
        }
        return Promise.reject(error);
    }
);

class ApiService {
    private static instance: ApiService;
    private token: string | null = null;

    private constructor() {
        this.token = safeLocalStorage.getItem('token');
    }

    public static getInstance(): ApiService {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }

    public setToken(token: string) {
        this.token = token;
        safeLocalStorage.setItem('token', token);
    }

    public clearToken() {
        this.token = null;
        safeLocalStorage.removeItem('token');
    }

    private async request<T>(
        endpoint: string,
        options: AxiosRequestConfig = {}
    ): Promise<T> {
        try {
            const token = safeLocalStorage.getItem('token');
            const headers = {
                ...options.headers,
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            console.log('Request headers:', headers); // Debug log

            const response = await api({
                url: endpoint,
                ...options,
                headers
            });

            // Проверяем, что ответ содержит данные
            if (!response.data) {
                throw new Error('No data received from server');
            }

            return response.data;
        } catch (error) {
            console.error('API Request Error:', error);
            
            if (error instanceof AxiosError) {
                // Обработка ошибок аутентификации
                if (error.response?.status === 401) {
                    this.clearToken();
                    window.location.href = '/login';
                    throw new Error('Session expired. Please login again.');
                }

                // Обработка ошибок сервера
                if (error.response?.status === 500) {
                    throw new Error('Server error. Please try again later.');
                }

                // Обработка сетевых ошибок
                if (!error.response) {
                    throw new Error('Network error. Please check your connection.');
                }

                // Обработка других ошибок
                const errorMessage = error.response?.data?.message || error.message;
                throw new Error(errorMessage);
            }

            throw error;
        }
    }

    // Notification endpoints
    public async getNotifications(): Promise<NotificationDTO[]> {
        return this.request<NotificationDTO[]>(API_ENDPOINTS.NOTIFICATIONS.BASE);
    }

    public async markNotificationAsRead(notificationId: string): Promise<NotificationDTO> {
        return this.request<NotificationDTO>(`${API_ENDPOINTS.NOTIFICATIONS.MARK_READ}/${notificationId}`, {
            method: 'PUT',
        });
    }

    public async markAllNotificationsAsRead(): Promise<void> {
        return this.request<void>(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {
            method: 'PUT',
        });
    }

    // Discount endpoints
    public async getAllDiscounts(): Promise<DiscountDTO[]> {
        return this.request<DiscountDTO[]>(API_ENDPOINTS.DISCOUNTS.BASE);
    }

    public async createDiscount(data: Partial<DiscountDTO>): Promise<DiscountDTO> {
        return this.request<DiscountDTO>(API_ENDPOINTS.DISCOUNTS.BASE, {
            method: 'POST',
            data,
        });
    }

    public async updateDiscount(id: string, data: Partial<DiscountDTO>): Promise<DiscountDTO> {
        return this.request<DiscountDTO>(`${API_ENDPOINTS.DISCOUNTS.BASE}/${id}`, {
            method: 'PUT',
            data,
        });
    }

    public async deleteDiscount(id: number): Promise<void> {
        return this.request<void>(`${API_ENDPOINTS.DISCOUNTS.BASE}/${id}`, {
            method: 'DELETE',
        });
    }

    // Analytics endpoints
    public async getAnalytics(): Promise<AnalyticsData> {
        const response = await this.request<{ data: AnalyticsData }>(API_ENDPOINTS.ANALYTICS.BASE);
        return response.data;
    }

    // Order endpoints
    public async getOrders(): Promise<OrderDTO[]> {
        return this.request<OrderDTO[]>(API_ENDPOINTS.ORDERS.BASE);
    }

    public async getOrderById(id: number): Promise<OrderDTO> {
        return this.request<OrderDTO>(`${API_ENDPOINTS.ORDERS.BASE}/${id}`);
    }

    public async updateOrderStatus(id: number, status: OrderDTO['status']): Promise<OrderDTO> {
        return this.request<OrderDTO>(`${API_ENDPOINTS.ORDERS.BASE}/${id}/status`, {
            method: 'PUT',
            data: status
        });
    }

    // Auth endpoints
    public async login(data: LoginRequest): Promise<AuthResponse> {
        try {
            const response = await this.request<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
                method: 'POST',
                data,
            });
            console.log('Login response:', response); // Debug log
            if (response && response.accessToken) {
                this.setToken(response.accessToken);
            }
            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    public async logout(): Promise<void> {
        try {
            await this.request<void>(API_ENDPOINTS.AUTH.LOGOUT, {
                method: 'POST',
            });
        } finally {
            this.clearToken();
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    }

    // Store endpoints
    public async getStores(): Promise<StoreDTO[]> {
        return this.request<StoreDTO[]>(API_ENDPOINTS.STORES.BASE);
    }

    public async getStoreById(id: number): Promise<StoreDTO> {
        return this.request<StoreDTO>(`${API_ENDPOINTS.STORES.BASE}/${id}`);
    }

    public async getMyStore(): Promise<StoreDTO> {
        return this.request<StoreDTO>(API_ENDPOINTS.STORES.MY_STORE);
    }

    public async createStore(data: Partial<StoreDTO>): Promise<StoreDTO> {
        return this.request<StoreDTO>(API_ENDPOINTS.STORES.BASE, {
            method: 'POST',
            data,
        });
    }

    public async updateStore(id: number, data: Partial<StoreDTO>): Promise<StoreDTO> {
        return this.request<StoreDTO>(`${API_ENDPOINTS.STORES.BASE}/${id}`, {
            method: 'PUT',
            data,
        });
    }

    public async deleteStore(id: number): Promise<void> {
        return this.request<void>(`${API_ENDPOINTS.STORES.BASE}/${id}`, {
            method: 'DELETE',
        });
    }

    // Review endpoints
    public async getReviews(): Promise<ReviewDTO[]> {
        return this.request<ReviewDTO[]>(API_ENDPOINTS.REVIEWS.BASE);
    }

    public async approveReview(reviewId: number): Promise<ReviewDTO> {
        return this.request<ReviewDTO>(`${API_ENDPOINTS.REVIEWS.BASE}/${reviewId}/approve`, {
            method: 'PUT',
        });
    }

    public async rejectReview(reviewId: number): Promise<ReviewDTO> {
        return this.request<ReviewDTO>(`${API_ENDPOINTS.REVIEWS.BASE}/${reviewId}/reject`, {
            method: 'PUT',
        });
    }

    public async deleteReview(reviewId: number): Promise<void> {
        return this.request<void>(`${API_ENDPOINTS.REVIEWS.BASE}/${reviewId}`, {
            method: 'DELETE',
        });
    }

    // Cart endpoints
    public async getCart(): Promise<CartDTO> {
        return this.request<CartDTO>(API_ENDPOINTS.CART.BASE);
    }

    public async getAllCarts(): Promise<CartDTO[]> {
        return this.request<CartDTO[]>(`${API_ENDPOINTS.CART.BASE}/all`);
    }

    public async addToCart(itemData: CartAddItemRequest): Promise<CartDTO> {
        return this.request<CartDTO>(API_ENDPOINTS.CART.ADD_ITEM, {
            method: 'POST',
            data: itemData,
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
            data: updateData,
        });
    }

    public async clearCart(): Promise<CartDTO> {
        return this.request<CartDTO>(API_ENDPOINTS.CART.CLEAR, {
            method: 'DELETE',
        });
    }
}

export default ApiService;

// Экспорт api instance для использования в других модулях
export { api };

export const storeApi = {
    getAll: async (): Promise<PageableResponse<StoreDTO> | StoreDTO[]> => {
        const response = await api.get(API_ENDPOINTS.STORES.BASE);
        // Обработка пагинированного ответа от Spring Boot
        if (response.data && typeof response.data === 'object' && 'content' in response.data) {
            return response.data as PageableResponse<StoreDTO>; // Возвращаем весь пагинированный объект
        }
        return Array.isArray(response.data) ? response.data : [];
    },
    getActive: async (): Promise<StoreDTO[]> => {
        const response = await api.get(`${API_ENDPOINTS.STORES.BASE}/active`);
        return Array.isArray(response.data) ? response.data : [];
    },
    getById: (id: number) => api.get<StoreDTO>(`${API_ENDPOINTS.STORES.BASE}/${id}`).then(response => response.data),
    getMyStore: () => api.get<StoreDTO>(API_ENDPOINTS.STORES.MY_STORE).then(response => response.data),
    create: (data: StoreCreateRequest) => api.post<StoreDTO>(API_ENDPOINTS.STORES.BASE, data).then(response => response.data),
    update: (id: number, data: StoreUpdateRequest) => api.put<StoreDTO>(`${API_ENDPOINTS.STORES.BASE}/${id}`, data).then(response => response.data),
    delete: (id: number) => api.delete(`${API_ENDPOINTS.STORES.BASE}/${id}`).then(response => response.data),
    
    // User-Store assignment methods
    assignUserToStore: (storeId: number, userId: number) => 
        api.post(`${API_ENDPOINTS.STORES.BASE}/${storeId}/assign-user/${userId}`).then(response => response.data),
    unassignUserFromStore: (storeId: number, userId: number) => 
        api.delete(`${API_ENDPOINTS.STORES.BASE}/${storeId}/unassign-user/${userId}`).then(response => response.data),
    getStoreUsers: async (storeId: number): Promise<PageableResponse<UserDTO> | UserDTO[]> => {
        const response = await api.get(`${API_ENDPOINTS.STORES.BASE}/${storeId}/users`);
        if (response.data && typeof response.data === 'object' && 'content' in response.data) {
            return response.data as PageableResponse<UserDTO>;
        }
        return Array.isArray(response.data) ? response.data : [];
    }
};

// User API
export const userApi = {
    getAll: async (): Promise<UserDTO[]> => {
        const response = await api.get(API_ENDPOINTS.USERS.BASE);
        return Array.isArray(response.data) ? response.data : [];
    },
    getAllPaginated: async (pageable?: any): Promise<PageableResponse<UserDTO>> => {
        const response = await api.get(`${API_ENDPOINTS.USERS.BASE}/paginated`, { params: pageable });
        return response.data;
    },
    getById: (id: number) => api.get<UserDTO>(`${API_ENDPOINTS.USERS.BASE}/${id}`).then(response => response.data),
    getProfile: () => api.get<UserDTO>(API_ENDPOINTS.USERS.PROFILE).then(response => response.data),
    create: (data: UserCreateRequest) => api.post<UserDTO>(API_ENDPOINTS.USERS.BASE, data).then(response => response.data),
    update: (id: number, data: UserUpdateRequest) => api.put<UserDTO>(`${API_ENDPOINTS.USERS.BASE}/${id}`, data).then(response => response.data),
    updateProfile: (data: Partial<UserDTO>) => api.put<UserDTO>(API_ENDPOINTS.USERS.UPDATE_PROFILE, data).then(response => response.data),
    delete: (id: number) => api.delete(`${API_ENDPOINTS.USERS.BASE}/${id}`).then(response => response.data),
    updateRole: (id: number, role: string) => api.put<UserDTO>(`${API_ENDPOINTS.USERS.BASE}/${id}/role`, null, { params: { role } }).then(response => response.data),
    updateStatus: (id: number, active: boolean) => api.put<UserDTO>(`${API_ENDPOINTS.USERS.BASE}/${id}/status`, null, { params: { active } }).then(response => response.data),
    toggleStatus: (id: number) => api.patch<UserDTO>(`${API_ENDPOINTS.USERS.BASE}/${id}/toggle-status`).then(response => response.data),
    changePassword: (newPassword: string) => api.put(API_ENDPOINTS.USERS.CHANGE_PASSWORD, newPassword).then(response => response.data),
    register: (data: UserCreateRequest) => api.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data).then(response => response.data),
};

// Order API
export const orderApi = {
    getAll: () => api.get<OrderDTO[]>(API_ENDPOINTS.ORDERS.BASE).then(response => response.data),
    getById: (id: number) => api.get<OrderDTO>(`${API_ENDPOINTS.ORDERS.BASE}/${id}`).then(response => response.data),
    updateStatus: (id: number, status: string) => api.put<OrderDTO>(`${API_ENDPOINTS.ORDERS.BASE}/${id}/status`, status).then(response => response.data),
    update: (id: number, data: any) => api.put<OrderDTO>(`${API_ENDPOINTS.ORDERS.BASE}/${id}`, data).then(response => response.data),
    create: (data: any) => api.post<OrderDTO>(API_ENDPOINTS.ORDERS.BASE, data).then(response => response.data),
    delete: (id: number) => api.delete(`${API_ENDPOINTS.ORDERS.BASE}/${id}`).then(response => response.data),
    
    // Статистика заказов
    getStats: () => api.get<OrderStatsDTO>(`${API_ENDPOINTS.ORDERS.BASE}/stats`).then(response => response.data),
    getStatsByStore: () => api.get<StoreOrderStatsDTO[]>(`${API_ENDPOINTS.ORDERS.BASE}/stats/by-store`).then(response => response.data),
    getMyStoreStats: () => api.get<OrderStatsDTO>(`${API_ENDPOINTS.ORDERS.BASE}/stats/my-store`).then(response => response.data)
};

export const analyticsApi = {
    getGeneral: () => api.get<{ data: AnalyticsData }>(API_ENDPOINTS.ANALYTICS.BASE).then(response => response.data.data),
    getDailySales: (params: { startDate: string; endDate: string; storeId?: number }) =>
        api.get<DailySalesAnalytics[]>(`${API_ENDPOINTS.ANALYTICS.BASE}/daily-sales`, { params }).then(response => response.data),
    getDailySalesOrderDetails: (params: { startDate: string; endDate: string; storeId?: number }) =>
        api.get<DailySalesOrderDetail[]>(`${API_ENDPOINTS.ANALYTICS.BASE}/daily-sales/orders`, { params }).then(response => response.data),
};

// Product API  
export const productApi = {
    getAll: () => api.get('/products').then(response => response.data),
    getById: (id: number) => api.get(`/products/${id}`).then(response => response.data),
    create: (data: any) => api.post('/products', data).then(response => response.data),
    update: (id: number, data: any) => api.put(`/products/${id}`, data).then(response => response.data),
    delete: (id: number) => api.delete(`/products/${id}`).then(response => response.data)
};

// System API
export const systemApi = {
    getHealth: () => api.get('/system/health').then(response => response.data),
    getMetrics: () => api.get('/system/metrics').then(response => response.data),
    getSystemInfo: () => api.get('/system/info').then(response => response.data)
};
