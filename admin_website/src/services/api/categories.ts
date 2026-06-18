import { api } from '../api';
import { CategoryDTO } from '@/types/api';

export interface CategoryCreateRequest {
    name: string;
    description?: string;
    imageUrl?: string;
    active?: boolean;
}

export interface CategoryUpdateRequest {
    name?: string;
    description?: string;
    imageUrl?: string;
    active?: boolean;
}

// Получение всех активных категорий
export const fetchActiveCategories = async (): Promise<CategoryDTO[]> => {
  try {
    const response = await api.get('/categories/active');
    return response.data;
  } catch (error) {
    console.error('Error fetching active categories:', error);
    throw error;
  }
};

// Получение всех категорий
export const fetchCategories = async (): Promise<CategoryDTO[]> => {
  try {
    const response = await api.get('/categories');
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

// Получение категории по ID
export const fetchCategory = async (id: number): Promise<CategoryDTO> => {
  try {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching category ${id}:`, error);
    throw error;
  }
};

// Создание новой категории
export const createCategory = async (data: CategoryCreateRequest): Promise<CategoryDTO> => {
  try {
    const response = await api.post('/categories', data);
    return response.data;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

// Обновление категории
export const updateCategory = async (id: number, data: CategoryUpdateRequest): Promise<CategoryDTO> => {
  try {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating category ${id}:`, error);
    throw error;
  }
};

// Удаление категории
export const deleteCategory = async (id: number): Promise<void> => {
  try {
    await api.delete(`/categories/${id}`);
  } catch (error) {
    console.error(`Error deleting category ${id}:`, error);
    throw error;
  }
};

export const categoryApi = {
  fetchActiveCategories,
  fetchCategories,
  fetchCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
