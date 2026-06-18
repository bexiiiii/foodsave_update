"use client";
import React, { useEffect, useState } from 'react';
import { OrderDTO } from '@/types/api';
import ApiService from '@/services/api';

const api = ApiService.getInstance();

export default function RecentOrders() {
    const [orders, setOrders] = useState<OrderDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.getOrders();
                setOrders(response);
                setError(null);
            } catch (err) {
                console.error('Error fetching orders:', err);
                setError('Failed to load orders');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (loading) {
        return <div>Загружаем заказы...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Недавние заказы</h2>
            <div className="space-y-4">
                {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium">Заказ #{order.id}</p>
                                <p className="text-sm text-gray-500">
                                    {new Date(order.orderDate || '').toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <span className={`px-2 py-1 rounded-full text-sm ${
                                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                    order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {order.status}
                                </span>
                            </div>
                        </div>
                        <div className="mt-2">
                            <p className="text-sm">
                                Общее количество: ${order.totalAmount.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">
                                Товары: {order.items.length}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 