"use client";

import { useState, useCallback, useEffect } from 'react';
import ApiService from '@/services/api';
import { NotificationDTO, AnalyticsData, UserDTO, ReviewDTO, CartDTO, DiscountDTO } from '@/types/api';
import { userApi, systemApi } from '@/services/api';

export const useNotifications = () => {
    const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = ApiService.getInstance();

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getNotifications();
            setNotifications(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [api]);

    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            await api.markNotificationAsRead(notificationId);
            setNotifications(prev => 
                prev.map(notification => 
                    notification.id === notificationId 
                        ? { ...notification, status: 'read' as const }
                        : notification
                )
            );
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    }, [api]);

    const markAllAsRead = useCallback(async () => {
        try {
            await api.markAllNotificationsAsRead();
            setNotifications(prev => 
                prev.map(notification => ({ ...notification, status: 'read' as const }))
            );
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    }, [api]);

    return {
        notifications,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        markAllAsRead
    };
};

export const useApi = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = ApiService.getInstance();

    const getAnalytics = useCallback(async (): Promise<AnalyticsData | null> => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getAnalytics();
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
            console.error('Error fetching analytics:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [api]);

    const getOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getOrders();
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch orders');
            console.error('Error fetching orders:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [api]);

    const getCart = useCallback(async (): Promise<CartDTO | null> => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getCart();
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch cart');
            console.error('Error fetching cart:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [api]);

    const getDiscounts = useCallback(async (): Promise<DiscountDTO[] | null> => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getAllDiscounts();
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch discounts');
            console.error('Error fetching discounts:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [api]);

    const getUserProfile = useCallback(async (): Promise<UserDTO | null> => {
        try {
            setLoading(true);
            setError(null);
            const response = await userApi.getProfile();
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
            console.error('Error fetching user profile:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateUserProfile = useCallback(async (data: Partial<UserDTO>): Promise<UserDTO | null> => {
        try {
            setLoading(true);
            setError(null);
            const response = await userApi.updateProfile(data);
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update user profile');
            console.error('Error updating user profile:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateUserAvatar = useCallback(async (file: File): Promise<boolean> => {
        try {
            setLoading(true);
            setError(null);
            // For now, we'll just handle this as a placeholder
            // In a real implementation, you'd upload the file to your backend
            console.log('Avatar upload not implemented yet:', file);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update avatar');
            console.error('Error updating avatar:', err);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const getReviews = useCallback(async (): Promise<ReviewDTO[] | null> => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getReviews();
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
            console.error('Error fetching reviews:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [api]);

    const approveReview = useCallback(async (reviewId: number): Promise<ReviewDTO | null> => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.approveReview(reviewId);
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to approve review');
            console.error('Error approving review:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [api]);

    const rejectReview = useCallback(async (reviewId: number): Promise<ReviewDTO | null> => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.rejectReview(reviewId);
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reject review');
            console.error('Error rejecting review:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [api]);

    const deleteReview = useCallback(async (reviewId: number): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            await api.deleteReview(reviewId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete review');
            console.error('Error deleting review:', err);
        } finally {
            setLoading(false);
        }
    }, [api]);

    return {
        loading,
        error,
        getAnalytics,
        getOrders,
        getCart,
        getDiscounts,
        getUserProfile,
        updateUserProfile,
        updateUserAvatar,
        getReviews,
        approveReview,
        rejectReview,
        deleteReview
    };
};

export const useHealthCheck = <T>() => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHealthData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await systemApi.getHealth();
            setData(response as T);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch health data');
            console.error('Error fetching health data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealthData();
    }, [fetchHealthData]);

    return {
        data,
        loading,
        error,
        refetch: fetchHealthData
    };
};
