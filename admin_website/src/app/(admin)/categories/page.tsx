"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoryApi, CategoryCreateRequest, CategoryUpdateRequest } from '@/services/api/categories';
import { useModal } from '@/hooks/useModal';
import { useToast } from "@/components/ui/use-toast";
import { CategoryDTO } from '@/types/api';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface CategoryFormData {
    name: string;
    description: string;
    image: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<CategoryDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const { isOpen, openModal, closeModal } = useModal();
    const [selectedCategory, setSelectedCategory] = useState<CategoryDTO | undefined>();
    const [formData, setFormData] = useState<CategoryFormData>({
        name: '',
        description: '',
        image: '',
        status: 'ACTIVE',
    });

    const fetchCategories = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await categoryApi.fetchCategories();
            setCategories(response);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            setError('Не удалось загрузить категории. Пожалуйста, попробуйте позже.');
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить категории. Пожалуйста, попробуйте позже.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            toast({
                title: 'Ошибка валидации',
                description: 'Название категории обязательно для заполнения',
                variant: 'destructive',
            });
            return;
        }

        try {
            if (selectedCategory) {
                // Обновление существующей категории
                const updateData: CategoryUpdateRequest = {
                    name: formData.name,
                    description: formData.description,
                    imageUrl: formData.image || undefined,
                    active: formData.status === 'ACTIVE'
                };
                console.log('Updating category with data:', updateData);
                await categoryApi.updateCategory(selectedCategory.id, updateData);
                toast({
                    title: 'Успех',
                    description: 'Категория успешно обновлена',
                });
            } else {
                // Создание новой категории
                const createData: CategoryCreateRequest = {
                    name: formData.name,
                    description: formData.description,
                    imageUrl: formData.image || undefined,
                    active: formData.status === 'ACTIVE'
                };
                console.log('Creating category with data:', createData);
                await categoryApi.createCategory(createData);
                toast({
                    title: 'Успех',
                    description: 'Категория успешно создана',
                });
            }
            
            closeModal();
            resetForm();
            fetchCategories();
        } catch (error) {
            console.error('Failed to save category:', error);
            toast({
                title: 'Ошибка',
                description: 'Не удалось сохранить категорию',
                variant: 'destructive',
            });
        }
    };

    const handleEdit = (category: CategoryDTO) => {
        setSelectedCategory(category);
        setFormData({
            name: category.name,
            description: category.description || '',
            image: category.imageUrl || '',
            status: category.active ? 'ACTIVE' : 'INACTIVE',
        });
        openModal();
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
            try {
                await categoryApi.deleteCategory(id);
                toast({
                    title: 'Успех',
                    description: 'Категория успешно удалена',
                });
                fetchCategories();
            } catch (error) {
                console.error('Failed to delete category:', error);
                toast({
                    title: 'Ошибка',
                    description: 'Не удалось удалить категорию',
                    variant: 'destructive',
                });
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            image: '',
            status: 'ACTIVE',
        });
        setSelectedCategory(undefined);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="space-y-4">
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

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Ошибка</h2>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button
                    onClick={fetchCategories}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Повторить
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Управление категориями</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Создание и управление категориями товаров</p>
                </div>
                <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                    onClick={() => {
                        resetForm();
                        openModal();
                    }}
                >
                    <PlusIcon className="h-5 w-5" />
                    Добавить категорию
                </Button>
            </div>

            {/* Search Bar */}
            <Card className="mb-6 bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Поиск категорий..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Categories Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="bg-white dark:bg-gray-800">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Всего категорий</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{categories.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Активные</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {categories.filter(cat => cat.active).length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Неактивные</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {categories.filter(cat => !cat.active).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Categories Table */}
            <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                        Список категорий ({filteredCategories.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredCategories.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            {searchQuery ? 'Категории не найдены' : 'Нет категорий для отображения'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Название</TableHead>
                                        <TableHead>Описание</TableHead>
                                        <TableHead>Статус</TableHead>
                                        <TableHead>Товаров</TableHead>
                                        <TableHead className="text-right">Действия</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCategories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">{category.id}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {category.imageUrl && (
                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                                            <img 
                                                                src={category.imageUrl} 
                                                                alt={category.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <span className="font-medium">{category.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-xs truncate text-gray-600 dark:text-gray-400">
                                                    {category.description || 'Нет описания'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={category.active ? 'default' : 'secondary'}
                                                    className={category.active 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                    }
                                                >
                                                    {category.active ? 'Активна' : 'Неактивна'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {category.productCount || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(category)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(category.id)}
                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Modal */}
            <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[600px] p-5 lg:p-10">
                <div className="relative w-full">
                    <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
                        {selectedCategory ? 'Редактировать категорию' : 'Создать новую категорию'}
                    </h4>
                    
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="name">Название *</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Введите название категории"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Описание</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Введите описание категории"
                                    rows={3}
                                    className="resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image">URL изображения</Label>
                                <Input
                                    id="image"
                                    name="image"
                                    type="url"
                                    value={formData.image}
                                    onChange={handleChange}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Статус</Label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="ACTIVE">Активна</option>
                                    <option value="INACTIVE">Неактивна</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-end w-full gap-3 mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeModal}
                                size="sm"
                            >
                                Отмена
                            </Button>
                            <Button type="submit" size="sm">
                                {selectedCategory ? 'Обновить' : 'Создать'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}
