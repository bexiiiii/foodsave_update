import type { ProductDTO } from '@/types/product';

export type AdminProductFilters = {
    query: string;
    store: string;
    category: string;
    status: string;
};

export function adminProductFilterUrl(filters: AdminProductFilters, page = 0, size = 20) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const query = filters.query.trim();
    if (query) params.set('query', query);
    for (const [key, value] of [['storeId', filters.store], ['categoryId', filters.category], ['status', filters.status]]) {
        if (value && value !== 'all') params.set(key, value);
    }
    return `/products/admin-filter?${params.toString()}`;
}

export function adminProductStatus(product: Pick<ProductDTO, 'status' | 'active' | 'stockQuantity' | 'availabilityState'>) {
    if (product.status !== 'AVAILABLE' && product.status !== 'OUT_OF_STOCK') return product.status;
    if ((product.stockQuantity ?? 0) <= 0) {
        return product.active && product.availabilityState === 'RESERVED' ? 'RESERVED' : 'OUT_OF_STOCK';
    }
    if (product.status === 'AVAILABLE' && product.active === false) return 'HIDDEN';
    return product.status;
}
