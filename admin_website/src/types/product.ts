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
  storeAddress?: string;
  categoryId: number;
  categoryName?: string;
  images?: string[];
  expiryDate?: string;
  status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'PENDING';
  active: boolean;
  orderCount?: number;
  averageRating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCreateRequest {
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  stockQuantity: number;
  storeId?: number;
  categoryId?: number;
  images?: string[];
  expiryDate?: string;
  status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'PENDING';
  active: boolean;
}

export interface ProductUpdateRequest {
  name?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  discountPercentage?: number;
  stockQuantity?: number;
  storeId?: number;
  categoryId?: number;
  images?: string[];
  expiryDate?: string;
  status?: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'PENDING';
  active?: boolean;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  totalValue: number;
  averagePrice: number;
}

// Backward compatibility types
export interface Product extends ProductDTO {}

export interface ProductFormData {
  name: string;
  description: string;
  regularPrice: number;
  discountPrice?: number;
  discountPercentage?: number;
  discountStartDate?: string;
  discountEndDate?: string;
  imageUrl?: string;
  stockQuantity: number;
  storeId: number;
  category: string;
  active: boolean;
}

export interface ProductDiscountData {
  discountPrice: number;
  discountPercentage: number;
  startDate: string;
  endDate: string;
} 