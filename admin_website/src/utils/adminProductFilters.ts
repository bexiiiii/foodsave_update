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
