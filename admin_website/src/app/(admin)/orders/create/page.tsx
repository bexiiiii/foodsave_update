"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { orderApi } from '@/services/api';
import { useRouter } from 'next/navigation';
import { BASE_URL } from '@/config/api';

interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
}

interface OrderItem {
    productId: number;
    quantity: number;
}

interface OrderData {
    storeId: number;
    items: OrderItem[];
    deliveryAddress: string;
    contactPhone: string;
    paymentMethod: 'CASH' | 'CARD' | 'DIGITAL_WALLET';
    notes?: string;
    status: string;
    paymentStatus: string;
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
}

export default function CreateOrderPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'DIGITAL_WALLET'>('CASH');
    const [loading, setLoading] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        setMounted(true);
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await fetch(`${BASE_URL}/products`);
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Failed to load products');
        }
    };

    const handleAddProduct = (productId: number) => {
        const existingItem = selectedProducts.find(item => item.productId === productId);
        if (existingItem) {
            setSelectedProducts(selectedProducts.map(item =>
                item.productId === productId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setSelectedProducts([...selectedProducts, { productId, quantity: 1 }]);
        }
    };

    const handleQuantityChange = (productId: number, quantity: number) => {
        if (quantity <= 0) {
            setSelectedProducts(selectedProducts.filter(item => item.productId !== productId));
        } else {
            setSelectedProducts(selectedProducts.map(item =>
                item.productId === productId
                    ? { ...item, quantity }
                    : item
            ));
        }
    };

    const calculateTotal = () => {
        return selectedProducts.reduce((total, item) => {
            const product = products.find(p => p.id === item.productId);
            return total + (product?.price || 0) * item.quantity;
        }, 0);
    };

    const handleCreateOrder = async () => {
        if (!deliveryAddress || !contactPhone) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (selectedProducts.length === 0) {
            toast.error('Please add at least one product to the order');
            return;
        }

        setLoading(true);
        try {
            const orderData: OrderData = {
                storeId: 1, // TODO: Get from context or props
                items: selectedProducts,
                deliveryAddress,
                contactPhone,
                paymentMethod,
                notes: notes || undefined,
                status: 'PENDING',
                paymentStatus: 'PENDING',
                subtotal: calculateTotal(),
                deliveryFee: 0,
                discount: 0,
                total: calculateTotal()
            };

            console.log('Submitting order data:', orderData);
            const response = await orderApi.create(orderData);
            console.log('Order created:', response);
            
            toast.success('Order created successfully');
            router.push('/orders');
        } catch (error) {
            console.error('Error creating order:', error);
            toast.error('Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-6">Create New Order</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Order Details</h2>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                                <Input
                                    id="deliveryAddress"
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    placeholder="Enter delivery address"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="contactPhone">Contact Phone *</Label>
                                <Input
                                    id="contactPhone"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    placeholder="Enter contact phone"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Input
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Enter any special instructions"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Select Products</h2>
                        <div className="space-y-4">
                            {products.map(product => (
                                <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                                    <div>
                                        <p className="font-medium">{product.name}</p>
                                        <p className="text-sm text-gray-500">${product.price}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleAddProduct(product.id)}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-6">
                <CardContent className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                    <div className="space-y-4">
                        {selectedProducts.map(item => {
                            const product = products.find(p => p.id === item.productId);
                            return (
                                <div key={item.productId} className="flex items-center justify-between p-2 border rounded">
                                    <div>
                                        <p className="font-medium">{product?.name}</p>
                                        <p className="text-sm text-gray-500">${product?.price} x {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                                        >
                                            -
                                        </Button>
                                        <span>{item.quantity}</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                                        >
                                            +
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="mt-4">
                            <Label>Payment Method *</Label>
                            <Select
                                value={paymentMethod}
                                onValueChange={(value: 'CASH' | 'CARD' | 'DIGITAL_WALLET') => setPaymentMethod(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="CARD">Card</SelectItem>
                                    <SelectItem value="DIGITAL_WALLET">Digital Wallet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="mt-4">
                            <p className="text-lg font-semibold">
                                Total: ${calculateTotal().toFixed(2)}
                            </p>
                        </div>

                        <Button
                            className="w-full mt-4"
                            onClick={handleCreateOrder}
                            disabled={loading || selectedProducts.length === 0 || !deliveryAddress || !contactPhone}
                        >
                            {loading ? 'Creating Order...' : 'Create Order'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 