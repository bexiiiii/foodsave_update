// Types for API responses based on backend DTOs

// Order Statistics Types
export interface OrderStatsDTO {
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    preparingOrders: number;
    readyOrders: number;
    pickedUpOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
}

export interface StoreOrderStatsDTO {
    storeId: number;
    storeName: string;
    storeLogo?: string;
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    preparingOrders: number;
    readyOrders: number;
    pickedUpOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
}

// User-related types
export interface UserDTO {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    profilePicture?: string;
    address?: string;
    role: 'STORE_OWNER' | 'SUPER_ADMIN' | 'CUSTOMER' | 'STORE_MANAGER';
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
    telegramUser?: boolean;
    telegramUserId?: number;
    telegramUsername?: string;
    telegramPhotoUrl?: string;
    telegramLanguageCode?: string;
    telegramRegisteredAt?: string;
    registrationSource?: string;
}

export interface UserCreateRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
    role?: string;
    active?: boolean;
}

export interface UserUpdateRequest extends Omit<UserCreateRequest, 'password'> {
    id: number;
}

export interface AnalyticsData {
    totalSales?: number;
    totalOrders: number;
    totalProducts: number;
    totalUsers: number;
    totalStores: number;
    totalRevenue: number;
    revenue?: number; // для обратной совместимости
    salesByDay?: Array<{
        date: string;
        amount: number;
        orders: number;
    }>;
    salesByMonth?: Array<{
        month: string;
        amount: number;
        orders: number;
    }>;
    topProducts?: Array<{
        id: number;
        name: string;
        sales: number;
        revenue: number;
    }>;
    topStores: Array<{
        id: number;
        name: string;
        sales: number;
        revenue: number;
    }>;
    topCategories: Array<{
        name: string;
        sales: number;
        revenue: number;
    }>;
    orderStatusDistribution: Array<{
        status: string;
        count: number;
        percentage: number;
    }>;
    paymentMethodDistribution: Array<{
        method: string;
        count: number;
        percentage: number;
    }>;
}

export interface DailySalesAnalytics {
    storeId: number;
    storeName: string;
    date: string;
    totalOrders: number;
    completedOrders: number;
    canceledOrders: number;
    totalRevenue: number;
    completedRevenue: number;
    canceledRevenue: number;
}

export interface DailySalesOrderItem {
    productId?: number;
    productName?: string;
    productDescription?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    itemSummary?: string;
}

export interface DailySalesOrderDetail {
    orderId: number;
    orderNumber?: string;
    orderDate?: string;
    orderCreatedAt?: string;
    orderStatus?: string;
    buyerId?: number;
    buyerName?: string;
    buyerPhone?: string;
    buyerTelegramUserId?: number;
    buyerTelegramUsername?: string;
    contactPhone?: string;
    orderSummary?: string;
    buyerSummary?: string;
    telegramSummary?: string;
    storeSummary?: string;
    addressSummary?: string;
    detailSummary?: string;
    storeId?: number;
    storeName?: string;
    storeAddress?: string;
    deliveryAddress?: string;
    orderTotal: number;
    items: DailySalesOrderItem[];
}

export interface ProductDTO {
    id: number;
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    discountPercentage?: number;
    stockQuantity: number;
    storeId: number;
    storeName?: string;
    storeLogo?: string;
    categoryId?: number;
    categoryName?: string;
    images?: string[];
    status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
    expiryDate?: string;
    createdAt?: string;
    updatedAt?: string;
    averageRating?: number;
    reviewCount?: number;
}

export interface OrderDTO {
    id: number;
    userId: number;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    storeId: number;
    storeName?: string;
    storeLogo?: string;
    storeAddress?: string;
    storePhone?: string;
    orderNumber?: string;
    items: OrderItemDTO[];
    status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
    deliveryAddress: string;
    contactPhone: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    deliveryFee: number;
    totalAmount: number;
    paymentMethod: 'CARD' | 'CASH' | 'DIGITAL_WALLET';
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    orderDate?: string;
    estimatedPickupTime?: string;
    actualPickupTime?: string;
    notes?: string;
    deliveryType?: 'PICKUP' | 'COURIER';
}

export interface OrderItemDTO {
    id?: number;
    productId: number;
    productName?: string;
    productImage?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    specialInstructions?: string;
}

export interface StoreDTO {
    id: number;
    name: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    logo: string | null;
    coverImage: string | null;
    openingHours: string;
    closingHours: string;
    latitude: number | null;
    longitude: number | null;
    category: string;
    status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    active: boolean;
    ownerId: number;
    ownerName: string;
    managerId?: number | null;
    managerName?: string | null;
    createdAt: string;
    updatedAt: string;
    user: UserDTO;
    productCount?: number;
}

export interface CartDTO {
    id: number;
    userId: number;
    items: CartItemDTO[];
    totalItems: number;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CartItemDTO {
    id?: number;
    productId: number;
    productName?: string;
    productImage?: string;
    productPrice?: number;
    quantity: number;
    totalPrice: number;
    addedAt?: string;
}

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    dateOfBirth?: string;
    profilePicture?: string;
    role: string;
    status: 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED';
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
}

export interface NotificationDTO {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'ORDER_UPDATE' | 'PROMOTION' | 'TELEGRAM';
    status: 'read' | 'unread';
    userId: number;
    relatedEntityId?: number;
    relatedEntityType?: string;
    createdAt: string;
    readAt?: string;
}

export interface CategoryDTO {
    id: number;
    name: string;
    description?: string;
    image?: string;
    imageUrl?: string;
    active: boolean;
    productCount?: number;
}

export interface DiscountDTO {
    id: number;
    code: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
    startDate: string;
    endDate: string;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    usedCount?: number;
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
    storeId?: number;
    applicableCategories?: number[];
    applicableProducts?: number[];
}

export interface ReviewDTO {
    id: number;
    userId: number;
    userName?: string;
    userAvatar?: string;
    productId: number;
    productName?: string;
    storeId: number;
    rating: number;
    comment?: string;
    images?: string[];
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    updatedAt: string;
    helpfulCount?: number;
    isHelpfulByCurrentUser?: boolean;
    user: {
        firstName: string;
        lastName: string;
    };
    product: {
        name: string;
    };
}

// Request DTOs
export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    username: string;
    roleName: string;
    status: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
}

export interface ProductCreateRequest {
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    stockQuantity: number;
    categoryId?: number;
    images?: string[];
    expiryDate?: string;
}

export interface ProductUpdateRequest {
    name?: string;
    description?: string;
    price?: number;
    originalPrice?: number;
    stockQuantity?: number;
    categoryId?: number;
    images?: string[];
    expiryDate?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
}

export interface OrderCreateRequest {
    storeId: number;
    items: Array<{
        productId: number;
        quantity: number;
        specialInstructions?: string;
    }>;
    deliveryAddress: string;
    contactPhone: string;
    paymentMethod: 'CARD' | 'CASH' | 'DIGITAL_WALLET';
    notes?: string;
    estimatedPickupTime?: string;
}

export interface StoreCreateRequest {
    name: string;
    description?: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
    openingHours?: string;
    closingHours?: string;
    category?: string;
    active: boolean;
    status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    user: {
        email: string;
        role: 'STORE_OWNER';
    };
}

export interface StoreUpdateRequest {
    name: string;
    description?: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
    openingHours?: string;
    closingHours?: string;
    category?: string;
    active: boolean;
    status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    user: {
        email: string;
        role: 'STORE_OWNER';
    };
}

export interface ProfileUpdateRequest {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    dateOfBirth?: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface CartAddItemRequest {
    productId: number;
    quantity: number;
}

export interface CartUpdateItemRequest {
    quantity: number;
}

export interface ReviewCreateRequest {
    productId: number;
    rating: number;
    comment?: string;
    images?: string[];
}

export interface DiscountCreateRequest {
    code: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
    startDate: string;
    endDate: string;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    applicableCategories?: number[];
    applicableProducts?: number[];
}

// API Response wrappers
export interface ApiResponse<T> {
    data: T;
    message?: string;
    status: number;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}

export interface SearchResult {
    products: ProductDTO[];
    stores: StoreDTO[];
    totalResults: number;
}

// Пагинированный ответ от Spring Boot
export interface PageableResponse<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
        sort: {
            sorted: boolean;
            unsorted: boolean;
            empty: boolean;
        };
        offset: number;
        paged: boolean;
        unpaged: boolean;
    };
    totalPages: number;
    totalElements: number;
    last: boolean;
    numberOfElements: number;
    first: boolean;
    size: number;
    number: number;
    sort: {
        sorted: boolean;
        unsorted: boolean;
        empty: boolean;
    };
    empty: boolean;
}
