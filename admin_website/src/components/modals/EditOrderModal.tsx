"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from "@/components/ui/modal";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { orderApi, productApi } from '@/services/api';
import { OrderDTO, OrderItemDTO, ProductDTO } from '@/types/api';
import { formatCurrency } from '@/utils/currency';

interface Order extends OrderDTO {
    orderNumber: string;
    qrCode: string;
    createdAt: string;
    updatedAt: string;
}

interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
}

interface OrderItem extends Omit<OrderItemDTO, 'unitPrice' | 'totalPrice'> {
    price: number;
}

interface EditOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: OrderDTO;
    onOrderUpdated: () => void;
}

export function EditOrderModal({ isOpen, onClose, order, onOrderUpdated }: EditOrderModalProps) {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<ProductDTO[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<OrderItemDTO[]>(order.items);
    const [formData, setFormData] = useState({
        userName: order.userName || '',
        userEmail: order.userEmail || '',
        contactPhone: order.contactPhone || '',
        paymentMethod: order.paymentMethod || '',
        status: order.status,
        notes: order.notes || ''
    });

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await productApi.getAll();
                if (response && typeof response === 'object' && 'content' in response) {
                    setProducts(response.content);
                } else if (Array.isArray(response)) {
                    setProducts(response);
                }
            } catch (error) {
                console.error('Failed to fetch products:', error);
                toast.error('Не удалось загрузить товары');
            }
        };

        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen]);

    const handleProductSelect = (productId: number) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = selectedProducts.find(item => item.productId === productId);
        if (existingItem) {
            setSelectedProducts(selectedProducts.map(item =>
                item.productId === productId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setSelectedProducts([...selectedProducts, {
                id: 0, // Temporary ID for new items
                productId: product.id,
                productName: product.name,
                quantity: 1,
                unitPrice: product.price,
                totalPrice: product.price // Initial total price equals unit price
            }]);
        }
    };

    const handleQuantityChange = (productId: number, quantity: number) => {
        if (quantity < 1) {
            setSelectedProducts(selectedProducts.filter(item => item.productId !== productId));
            return;
        }

        setSelectedProducts(selectedProducts.map(item =>
            item.productId === productId
                ? { ...item, quantity }
                : item
        ));
    };

    const calculateTotal = () => {
        return selectedProducts.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await orderApi.update(order.id, {
                ...formData,
                items: selectedProducts.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                }))
            });

            toast.success('Заказ успешно обновлен');
            onOrderUpdated();
            onClose();
        } catch (error) {
            console.error('Failed to update order:', error);
            toast.error('Не удалось обновить заказ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="max-w-[800px] p-6"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Редактировать заказ</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Заказ #{order.id}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="userName">Имя клиента</Label>
                            <Input
                                id="userName"
                                value={formData.userName}
                                onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="userEmail">Email</Label>
                            <Input
                                id="userEmail"
                                type="email"
                                value={formData.userEmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, userEmail: e.target.value }))}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="contactPhone">Телефон</Label>
                            <Input
                                id="contactPhone"
                                value={formData.contactPhone}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="paymentMethod">Метод оплаты</Label>
                            <select
                                id="paymentMethod"
                                value={formData.paymentMethod}
                                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as OrderDTO['paymentMethod'] }))}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer relative z-10"
                                aria-label="Select payment method"
                                style={{ WebkitAppearance: 'menulist' }}
                            >
                                <option value="CASH">Наличные</option>
                                <option value="CARD">Карта</option>
                                <option value="ONLINE">Онлайн</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="status">Статус</Label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as OrderDTO['status'] }))}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer relative z-10"
                                aria-label="Select status"
                                style={{ WebkitAppearance: 'menulist' }}
                            >
                                <option value="PENDING">В ожидании</option>
                                <option value="CONFIRMED">Подтвержден</option>
                                <option value="PREPARING">Готовится</option>
                                <option value="READY">Готов</option>
                                <option value="PICKED_UP">Забран</option>
                                <option value="DELIVERED">Доставлен</option>
                                <option value="CANCELLED">Отменен</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="notes">Примечания</Label>
                            <Input
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Позиции заказа</h3>
                        <div className="w-64">
                            <select
                                onChange={(e) => handleProductSelect(Number(e.target.value))}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer relative z-10"
                                aria-label="Select a product"
                                style={{ WebkitAppearance: 'menulist' }}
                            >
                                <option value="">Добавить товар</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} - {formatCurrency(product.price)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {selectedProducts.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div>
                                    <p className="font-medium">{item.productName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                                        >
                                            -
                                        </Button>
                                        <span className="w-8 text-center">{item.quantity}</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                                        >
                                            +
                                        </Button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">{formatCurrency(item.unitPrice)}</p>
                                    <p className="text-sm text-gray-500">Итого: {formatCurrency(item.unitPrice * item.quantity)}</p>
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-3 border-t">
                            <span className="font-medium">Общая сумма:</span>
                            <span className="font-bold">{formatCurrency(calculateTotal())}</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                    >
                        Отмена
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Сохранение...' : 'Сохранить изменения'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
