"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, SearchIcon } from '@/icons';
import ApiService from '@/services/api';
import { toast } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import DiscountForm from '@/components/Discount/DiscountForm';
import { DiscountDTO } from '@/types/api';

export default function DiscountsPage() {
    const [discounts, setDiscounts] = useState<DiscountDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [selectedDiscount, setSelectedDiscount] = useState<DiscountDTO | undefined>();

    const api = ApiService.getInstance();

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const fetchDiscounts = async () => {
        try {
            const response = await api.getAllDiscounts();
            setDiscounts(response);
        } catch (error) {
            console.error('Failed to fetch discounts:', error);
            toast.error('Не удалось загрузить скидки');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Вы уверены, что хотите удалить эту скидку?')) {
            try {
                await api.deleteDiscount(id);
                toast.success('Скидка успешно удалена');
                fetchDiscounts();
            } catch (error) {
                console.error('Failed to delete discount:', error);
                toast.error('Не удалось удалить скидку');
            }
        }
    };

    const handleEdit = (discount: DiscountDTO) => {
        setSelectedDiscount(discount);
        setShowForm(true);
    };

    const handleFormSuccess = () => {
        setShowForm(false);
        setSelectedDiscount(undefined);
        fetchDiscounts();
    };

    const filteredDiscounts = discounts.filter(discount =>
        (discount.code?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const formatDiscountValue = (discount: DiscountDTO) => {
        if (!discount || typeof discount.value === 'undefined') {
            return 'N/A';
        }
        return discount.type === 'PERCENTAGE'
            ? `${discount.value}%`
            : `$${Number(discount.value).toFixed(2)}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'default';
            case 'EXPIRED':
                return 'destructive';
            case 'INACTIVE':
                return 'secondary';
            default:
                return 'default';
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="bg-white dark:bg-gray-800">
                            <CardContent className="p-6">
                                <Skeleton className="h-4 w-1/4 mb-2" />
                                <Skeleton className="h-4 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Управление скидками</h1>
                <Button
                    className="bg-brand-500 hover:bg-brand-600 text-white"
                    onClick={() => setShowForm(true)}
                >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Создать скидку
                </Button>
            </div>

            {showForm ? (
                <div className="mb-6">
                    <DiscountForm
                        discount={selectedDiscount}
                        onSuccess={handleFormSuccess}
                        onCancel={() => {
                            setShowForm(false);
                            setSelectedDiscount(undefined);
                        }}
                    />
                </div>
            ) : (
                <>
                    <div className="mb-6">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Поиск по коду..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white dark:bg-gray-800"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {filteredDiscounts.length === 0 ? (
                            <Card className="bg-white dark:bg-gray-800">
                                <CardContent className="p-6">
                                    <p className="text-gray-500 dark:text-gray-400 text-center">Скидки не найдены</p>
                                </CardContent>
                            </Card>
                        ) : (
                            filteredDiscounts.map((discount) => (
                                <Card key={discount.id} className="bg-white dark:bg-gray-800">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                                                    {discount.code}
                                                </h3>
                                            </div>
                                            <Badge variant={getStatusColor(discount.status)}>
                                                {discount.status}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                                    Значение: {formatDiscountValue(discount)}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                                    Мин. покупка: ${discount.minPurchaseAmount}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                                    Использовано: {discount.usedCount}/{discount.usageLimit}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                                    Макс. скидка: ${discount.maxDiscountAmount}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                Действителен: {new Date(discount.startDate).toLocaleDateString()} -{' '}
                                                {new Date(discount.endDate).toLocaleDateString()}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(discount)}
                                                >
                                                    Редактировать
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(discount.id)}
                                                >
                                                    Удалить
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}