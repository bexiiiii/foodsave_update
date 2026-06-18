"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/useApi';
import { OrderDTO } from '@/types/api';

const OrderList: React.FC = () => {
    const { getOrders, loading, error } = useApi();
    const [orders, setOrders] = React.useState<OrderDTO[]>([]);

    React.useEffect(() => {
        const fetchOrders = async () => {
            const response = await getOrders();
            if (response) {
                setOrders(response);
            }
        };
        fetchOrders();
    }, [getOrders]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Заказы</CardTitle>
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
                    <CardTitle>Заказы</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-red-500">{error}</div>
                </CardContent>
            </Card>
        );
    }

    const getStatusColor = (status: OrderDTO['status']): "secondary" | "destructive" | "default" | "outline" => {
        switch (status) {
            case 'PENDING':
                return 'secondary';
            case 'CONFIRMED':
                return 'outline';
            case 'PREPARING':
                return 'secondary';
            case 'READY':
                return 'outline';
            case 'PICKED_UP':
                return 'outline';
            case 'DELIVERED':
                return 'default';
            case 'CANCELLED':
                return 'destructive';
            default:
                return 'default';
        }
    };

    const getPaymentStatusColor = (status: OrderDTO['paymentStatus']): "secondary" | "destructive" | "default" | "outline" => {
        switch (status) {
            case 'PENDING':
                return 'secondary';
            case 'PAID':
                return 'default';
            case 'FAILED':
                return 'destructive';
            case 'REFUNDED':
                return 'outline';
            default:
                return 'default';
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Заказы</CardTitle>
            </CardHeader>
            <CardContent>
                    <div className="space-y-4">
                        {orders.map((order) => (
                        <div key={order.id} className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                    <h3 className="font-medium">Order #{order.id}</h3>
                                        <p className="text-sm text-gray-500">
                                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'No date'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant={getStatusColor(order.status)}>
                                            {order.status}
                                        </Badge>
                                        <Badge variant={getPaymentStatusColor(order.paymentStatus)}>
                                            {order.paymentStatus}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="mt-2">
                                <p className="text-sm">
                                        Общая сумма: ${order.totalAmount.toFixed(2)}
                                    </p>
                                <p className="text-sm">
                                    Способ оплаты: {order.paymentMethod}
                                    </p>
                                </div>
                            <div className="mt-2">
                                <h4 className="text-sm font-medium mb-1">Продукт:</h4>
                                <ul className="text-sm space-y-1">
                                    {order.items.map((item, index) => (
                                        <li key={item.id || index}>
                                            {item.productName || 'Unknown Product'} x {item.quantity} - ${item.totalPrice.toFixed(2)}
                                        </li>
                                    ))}
                                </ul>
                                </div>
                            </div>
                        ))}
                    </div>
            </CardContent>
        </Card>
    );
};

export default OrderList; 