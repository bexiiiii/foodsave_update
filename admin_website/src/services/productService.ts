import { api } from './api';
import { ProductDTO, ProductCreateRequest, ProductUpdateRequest, ProductStats } from '@/types/product';
import { PageableResponse } from '@/types/api';

export class ProductService {
  private static readonly ENDPOINT = '/products';

  static async getAllProducts(page = 0, size = 20): Promise<PageableResponse<ProductDTO>> {
    try {
      const response = await api.get(
        `${this.ENDPOINT}?page=${page}&size=${size}&sort=createdAt,desc`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching products:', error.response?.data || error.message);
      throw error;
    }
  }

  static async getProductById(id: number): Promise<ProductDTO> {
    try {
      const response = await api.get(`${this.ENDPOINT}/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching product:', error.response?.data || error.message);
      throw error;
    }
  }

  static async createProduct(data: ProductCreateRequest): Promise<ProductDTO> {
    try {
      const response = await api.post(this.ENDPOINT, data);
      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  static async updateProduct(id: number, data: ProductUpdateRequest): Promise<ProductDTO> {
    try {
      const response = await api.put(`${this.ENDPOINT}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  static async deleteProduct(id: number): Promise<void> {
    try {
      await api.delete(`${this.ENDPOINT}/${id}`);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  static async getProductsByStore(storeId: number, page = 0, size = 20): Promise<PageableResponse<ProductDTO>> {
    try {
      const response = await api.get(
        `${this.ENDPOINT}/store/${storeId}?page=${page}&size=${size}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching store products:', error.response?.data || error.message);
      throw error;
    }
  }

  static async getProductsByCategory(categoryId: number, page = 0, size = 20): Promise<PageableResponse<ProductDTO>> {
    try {
      const response = await api.get(
        `${this.ENDPOINT}/category/${categoryId}?page=${page}&size=${size}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching category products:', error.response?.data || error.message);
      throw error;
    }
  }

  static async searchProducts(query: string, page = 0, size = 20): Promise<PageableResponse<ProductDTO>> {
    try {
      const response = await api.get(
        `${this.ENDPOINT}/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error searching products:', error.response?.data || error.message);
      throw error;
    }
  }

  static async getProductStats(): Promise<ProductStats> {
    try {
      const response = await api.get(`${this.ENDPOINT}/stats`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching product stats:', error.response?.data || error.message);
      throw error;
    }
  }

  // Backward compatibility
  static async getAllProductsLegacy(): Promise<ProductDTO[]> {
    try {
      const response = await this.getAllProducts();
      return response.content;
    } catch (error) {
      throw error;
    }
  }

  static async getProduct(id: number): Promise<ProductDTO> {
    try {
      const response = await api.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }
}
