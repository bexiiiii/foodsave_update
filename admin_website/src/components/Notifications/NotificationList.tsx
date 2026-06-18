"use client";

import React from 'react';
import { useNotifications } from '@/hooks/useApi';
import { NotificationDTO } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const NotificationList: React.FC = () => {
    const { notifications, loading, error } = useNotifications();

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Уведомления</CardTitle>
                </CardHeader>
                <CardContent>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="mb-4">
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Уведомления</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-red-500">Не удалось загрузить уведомления</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Уведомления</CardTitle>
            </CardHeader>
            <CardContent>
                {notifications.length === 0 ? (
                    <div className="text-gray-500">Нет уведомлений</div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map((notification: NotificationDTO) => (
                            <div
                                key={notification.id}
                                className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-medium">{notification.title}</h3>
                                    <Badge
                                        variant={
                                            notification.type === 'ERROR'
                                                ? 'destructive'
                                                : notification.type === 'SUCCESS'
                                                ? 'default'
                                                : 'default'
                                        }
                                    >
                                        {notification.type}
                                    </Badge>
                                </div>
                                <p className="text-gray-600">{notification.message}</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    {new Date(notification.createdAt).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default NotificationList; 