import { axiosInstance } from './api';

export interface UserDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  telegramUser?: boolean;
  telegramUserId?: number;
  telegramUsername?: string;
  registrationSource?: string;
}

export interface PageableResponse<T> {
  content: T[];
  pageable: {
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    pageSize: number;
    pageNumber: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  empty: boolean;
}

export const userApi = {
  getUsers: async (page: number = 0, size: number = 10): Promise<PageableResponse<UserDTO>> => {
    const response = await axiosInstance.get(`/users/paginated?page=${page}&size=${size}`);
    return response.data;
  },

  getAvailableManagers: async (): Promise<UserDTO[]> => {
    const response = await axiosInstance.get('/users/available-managers');
    return response.data;
  },

  toggleUserStatus: async (id: number): Promise<UserDTO> => {
    const response = await axiosInstance.put(`/users/${id}/toggle-status`);
    return response.data;
  },

  getUsersByRole: async (role: string): Promise<UserDTO[]> => {
    const response = await axiosInstance.get(`/users/role/${role}`);
    return response.data;
  },

  getCurrentUserProfile: async (): Promise<UserDTO> => {
    const response = await axiosInstance.get('/users/profile');
    return response.data;
  },

  changePassword: async (newPassword: string): Promise<void> => {
    await axiosInstance.put('/users/change-password', newPassword, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  },
};
