"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/useApi';
import { CartDTO } from '@/types/api';

const CartList: React.FC = () => {
    const { getCart, loading, error } = useApi();
    const [cart, setCart] = React.useState<CartDTO | null>(null);

    React.useEffect(() => {
        const fetchCart = async () => {
            const response = await getCart();
            if (response) {
                setCart(response);
            }
        };
        fetchCart();
    }, [getCart]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Корзина</CardTitle>
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
                    <CardTitle>Корзина</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-red-500">{error}</div>
                </CardContent>
            </Card>
        );
    }

    if (!cart) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Корзина</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-gray-500">Ваша корзина пуста</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Корзина</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-medium">ID корзины: {cart.id}</h3>
                            <p className="text-sm text-gray-500">ID пользователя: {cart.userId}</p>
                            <p className="text-sm text-gray-500">Всего товаров: {cart.totalItems}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Общая сумма</p>
                            <p className="text-lg font-bold">${cart.totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {cart.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <h4 className="font-medium">{item.productName || `Продукт ${item.productId}`}</h4>
                                    <p className="text-sm text-gray-500">
                                        Количество: {item.quantity}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">
                                        ${item.totalPrice.toFixed(2)}
                                    </p>
                                    {item.productPrice && (
                                        <p className="text-sm text-gray-500">
                                            ${item.productPrice.toFixed(2)} за шт.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default CartList;