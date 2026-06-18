"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import { useRoleBasedRoutes } from "@/hooks/useRoleBasedRoutes";
import { Permission } from "@/types/permission";
import { OrderDTO } from "@/types/api";

const RecentOrders: React.FC = () => {
    const { getOrders, loading, error } = useApi();
    const { hasPermission, user } = useRoleBasedRoutes();
    const [orders, setOrders] = React.useState<OrderDTO[]>([]);

    const isStoreUser = user?.role === 'STORE_OWNER' || user?.role === 'MANAGER';
    const isAdmin = hasPermission(Permission.ANALYTICS_READ);

    React.useEffect(() => {
        const fetchOrders = async () => {
            const response = await getOrders();
            if (response) {
                // Для пользователей заведений показываем только их заказы
                let filteredOrders = response;
                if (isStoreUser && !isAdmin) {
                    // Фильтруем заказы по заведению пользователя
                    // Предполагается, что в OrderDTO есть поле storeName или storeId
                    filteredOrders = response.filter(order =>
                        // Здесь нужно добавить логику фильтрации по заведению
                        // Пока показываем все заказы, но с соответствующим заголовком
                        true
                    );
                }
                setOrders(filteredOrders.slice(0, 5));
            }
        };
        fetchOrders();
    }, [getOrders, isStoreUser, isAdmin]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Недавние заказы</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                                </div>
                                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Недавние заказы</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-red-500">{error}</div>
                </CardContent>
            </Card>
        );
    }

    if (!orders.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Недавние заказы</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-gray-500">Нет недавних заказов</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Недавние заказы</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    Заказ #{order.id}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {order.userName || 'Неизвестный клиент'}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="text-sm font-medium">
                                    ${(order.totalAmount || 0).toFixed(2)}
                                </p>
                                <Badge variant={
                                    order.status === 'DELIVERED' ? 'default' :
                                        order.status === 'PENDING' ? 'secondary' :
                                            order.status === 'CANCELLED' ? 'destructive' : 'outline'
                                }>
                                    {order.status}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default RecentOrders;
