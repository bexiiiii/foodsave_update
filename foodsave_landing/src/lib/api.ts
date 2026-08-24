const API_BASE = 'https://foodsave.kz/api';

export interface ApiCategory {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  active: boolean;
}

export interface ApiStore {
  id: number;
  name: string;
  description: string | null;
  address: string;
  phone: string | null;
  logo: string | null;
  coverImage: string | null;
  openingHours: string | null;
  closingHours: string | null;
  category: string;
  status: string;
  active: boolean;
  productCount: number | null;
}

export interface ApiProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  discountPercentage: number | null;
  stockQuantity: number;
  storeId: number;
  storeName: string;
  storeLogo: string | null;
  storeAddress: string;
  categoryId: number;
  categoryName: string;
  images: string[];
  imageUrl: string | null;
  status: string;
  active: boolean;
  isAvailable: boolean;
  availableQuantity: number;
  isFeatured: boolean;
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/categories/active`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchStores(): Promise<ApiStore[]> {
  try {
    const res = await fetch(`${API_BASE}/stores/active`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchStore(id: string): Promise<ApiStore | null> {
  try {
    const res = await fetch(`${API_BASE}/stores/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchProductsByStore(storeId: string): Promise<ApiProduct[]> {
  try {
    const res = await fetch(`${API_BASE}/products/store/${storeId}?size=20`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data: { content: ApiProduct[] } = await res.json();
    return data.content ?? [];
  } catch {
    return [];
  }
}

export async function fetchFeaturedProducts(): Promise<ApiProduct[]> {
  try {
    const res = await fetch(`${API_BASE}/products/featured?size=12`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data: { content: ApiProduct[] } = await res.json();
    return data.content ?? [];
  } catch {
    return [];
  }
}
