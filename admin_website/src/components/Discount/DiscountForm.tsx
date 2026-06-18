"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import ApiService from '@/services/api';
import { CalenderIcon } from '@/icons';
import { DiscountDTO, DiscountCreateRequest } from '@/types/api';

interface DiscountFormProps {
    discount?: DiscountDTO;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function DiscountForm({ discount, onSuccess, onCancel }: DiscountFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<DiscountCreateRequest>({
        code: discount?.code || '',
        type: discount?.type || 'PERCENTAGE',
        value: discount?.value || 0,
        minPurchaseAmount: discount?.minPurchaseAmount || 0,
        maxDiscountAmount: discount?.maxDiscountAmount || 0,
        startDate: discount?.startDate || new Date().toISOString(),
        endDate: discount?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        usageLimit: discount?.usageLimit || 100,
        applicableCategories: discount?.applicableCategories || [],
        applicableProducts: discount?.applicableProducts || [],
    });

    const api = ApiService.getInstance();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (discount) {
                await api.updateDiscount(discount.id.toString(), formData);
                toast.success('Скидка успешно обновлена');
            } else {
                await api.createDiscount(formData);
                toast.success('Скидка успешно создана');
            }
            onSuccess();
        } catch (error) {
            console.error('Не удалось сохранить скидку:', error);
            toast.error('Не удалось сохранить скидку');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'value' || name === 'minPurchaseAmount' || name === 'maxDiscountAmount' || name === 'usageLimit'
                ? parseFloat(value) || 0
                : value
        }));
    };

    const handleDateChange = (name: string, date: Date) => {
        setFormData(prev => ({
            ...prev,
            [name]: date.toISOString()
        }));
    };

    return (
        <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">
                    {discount ? 'Редактировать скидку' : 'Создать новую скидку'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Код скидки
                            </label>
                            <Input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                required
                                className="w-full"
                                placeholder="Введите код скидки"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Тип
                            </label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-800 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-300"
                                aria-label="Discount type"
                            >
                                <option value="PERCENTAGE">Процент</option>
                                <option value="FIXED_AMOUNT">Фиксированная сумма</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Значение ({formData.type === 'PERCENTAGE' ? '%' : '$'})
                            </label>
                            <Input
                                type="number"
                                name="value"
                                value={formData.value}
                                onChange={handleChange}
                                required
                                min="0"
                                step={formData.type === 'PERCENTAGE' ? '1' : '0.01'}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Минимальная покупка ($)
                            </label>
                            <Input
                                type="number"
                                name="minPurchaseAmount"
                                value={formData.minPurchaseAmount}
                                onChange={handleChange}
                                required
                                min="0"
                                step="0.01"
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Максимальная скидка ($)
                            </label>
                            <Input
                                type="number"
                                name="maxDiscountAmount"
                                value={formData.maxDiscountAmount}
                                onChange={handleChange}
                                required
                                min="0"
                                step="0.01"
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Лимит использования
                            </label>
                            <Input
                                type="number"
                                name="usageLimit"
                                value={formData.usageLimit}
                                onChange={handleChange}
                                required
                                min="1"
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Дата начала
                            </label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    name="startDate"
                                    value={formData.startDate.split('T')[0]}
                                    onChange={(e) => handleDateChange('startDate', new Date(e.target.value))}
                                    className="w-full pl-10"
                                />
                                <CalenderIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Дата окончания
                            </label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    name="endDate"
                                    value={formData.endDate.split('T')[0]}
                                    onChange={(e) => handleDateChange('endDate', new Date(e.target.value))}
                                    className="w-full pl-10"
                                />
                                <CalenderIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            className="bg-brand-500 hover:bg-brand-600 text-white"
                            disabled={loading}
                        >
                            {loading ? 'Сохранение...' : discount ? 'Обновить скидку' : 'Создать скидку'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}