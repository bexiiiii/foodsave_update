"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from "@/components/ui/modal";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { orderApi, productApi } from '@/services/api';
import { OrderDTO, ProductDTO } from '@/types/api';
import { formatCurrency } from '@/utils/currency';

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOrderCreated: () => void;
}

interface OrderItem {
    productId: number;
    productName: string;
    quantity: number;
    price: number;
}

export function CreateOrderModal({ isOpen, onClose, onOrderCreated }: CreateOrderModalProps) {
    const [products, setProducts] = useState<ProductDTO[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        contactPhone: '',
        notes: '',
        paymentMethod: 'CASH'
    });

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await productApi.getAll();
                console.log('Products response:', response); // Debug log
                if (response && typeof response === 'object' && 'content' in response) {
                    // Handle paginated response
                    setProducts(response.content);
                } else if (Array.isArray(response)) {
                    // Handle array response
                    setProducts(response);
                } else {
                    console.error('Unexpected response format:', response);
                    setProducts([]);
                }
            } catch (error) {
                console.error('Failed to fetch products:', error);
                toast.error('Failed to load products');
                setProducts([]);
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
                productId: product.id,
                productName: product.name,
                quantity: 1,
                price: product.price
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
        return selectedProducts.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const handleSubmit = async () => {
        if (selectedProducts.length === 0) {
            toast.error('Please select at least one product');
            return;
        }

        if (!formData.contactPhone) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            const orderData = {
                items: selectedProducts.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                })),
                contactPhone: formData.contactPhone,
                notes: formData.notes,
                paymentMethod: formData.paymentMethod
            };

            await orderApi.create(orderData);
            toast.success('Order created successfully');
            onOrderCreated();
            onClose();
        } catch (error) {
            console.error('Failed to create order:', error);
            toast.error('Failed to create order');
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
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Создать новый заказ</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Заполните данные для создания нового заказа</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <Label>Контактный телефон</Label>
                            <Input
                                value={formData.contactPhone}
                                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                placeholder="Введите контактный телефон"
                            />
                        </div>
                        <div>
                            <Label>Способ оплаты</Label>
                            <select
                                value={formData.paymentMethod}
                                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
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
                            <Label>Примечания</Label>
                            <Input
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Добавьте любые дополнительные примечания"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label>Выбор продуктов</Label>
                            <select
                                onChange={(e) => handleProductSelect(Number(e.target.value))}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer relative z-10"
                                aria-label="Select a product"
                                style={{ WebkitAppearance: 'menulist' }}
                            >
                                <option value="">Выберите продукт</option>
                                {products && products.length > 0 ? (
                                    products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} - {formatCurrency(product.price)}
                                        </option>
                                    ))
                                ) : (
                                    <option value="" disabled>Нет доступных продуктов</option>
                                )}
                            </select>
                        </div>

                        <Card>
                            <CardContent className="p-4">
                                <h3 className="font-medium mb-4">Выбранные продукты</h3>
                                <div className="space-y-3">
                                    {selectedProducts.map((item) => (
                                        <div key={item.productId} className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{item.productName}</p>
                                                <p className="text-sm text-gray-500">{formatCurrency(item.price)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
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
                                    ))}
                                </div>
                                {selectedProducts.length > 0 && (
                                    <div className="mt-4 pt-4 border-t">
                                        <div className="flex justify-between font-medium">
                                            <span>Итого:</span>
                                            <span>{formatCurrency(calculateTotal())}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Создание...' : 'Создать заказ'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
} 