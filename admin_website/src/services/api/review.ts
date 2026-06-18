import { ReviewDTO } from '@/types/api';
import { axiosInstance } from './api';

export const reviewApi = {
    getAll: async (): Promise<ReviewDTO[]> => {
        const response = await axiosInstance.get('/reviews');
        return response.data;
    },

    getById: async (id: number): Promise<ReviewDTO> => {
        const response = await axiosInstance.get(`/reviews/${id}`);
        return response.data;
    },

    create: async (data: Partial<ReviewDTO>): Promise<ReviewDTO> => {
        const response = await axiosInstance.post('/reviews', data);
        return response.data;
    },

    update: async (id: number, data: Partial<ReviewDTO>): Promise<ReviewDTO> => {
        const response = await axiosInstance.put(`/reviews/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await axiosInstance.delete(`/reviews/${id}`);
    }
}; 