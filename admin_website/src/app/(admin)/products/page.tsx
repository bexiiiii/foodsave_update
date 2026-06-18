"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { validateImageFile } from '@/utils/fileValidation';
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
import ProtectedRoute from '@/components/ProtectedRoute';
import { useModal } from '@/hooks/useModal';
import { ProductService } from '@/services/productService';
import { storeApi } from '@/services/api';
import { categoryApi } from '@/services/api/categories';
import { ProductDTO, ProductCreateRequest, ProductUpdateRequest, ProductStats } from '@/types/product';
import { StoreDTO, CategoryDTO, PageableResponse } from '@/types/api';
import { ValidationError } from '@/utils/validation';
import { formatCurrency } from '@/utils/currency';
import { FileUploadService } from '@/services/fileUploadService';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Permission } from '@/types/permission';

interface ProductFormData {
    name: string;
    description: string;
    originalPrice: number;
    discountPercentage: number;
    stockQuantity: number;
    storeId: number | null;
    categoryId: number | null;
    images: string[];
    imageFiles: File[];
    expiryDate: string;
    status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'PENDING';
    active: boolean;
}

const PRODUCT_STATUSES = [
    { value: 'AVAILABLE', label: 'В наличии', color: 'bg-green-100 text-green-800' },
    { value: 'OUT_OF_STOCK', label: 'Нет в наличии', color: 'bg-red-100 text-red-800' },
    { value: 'DISCONTINUED', label: 'Снят с производства', color: 'bg-gray-100 text-gray-800' },
    { value: 'PENDING', label: 'В ожидании', color: 'bg-yellow-100 text-yellow-800' }
];

export default function ProductsPage() {
    const [mounted, setMounted] = useState(false);
    const [products, setProducts] = useState<ProductDTO[]>([]);
    const [stores, setStores] = useState<StoreDTO[]>([]);
    const [categories, setCategories] = useState<CategoryDTO[]>([]);
    const [stats, setStats] = useState<ProductStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStore, setFilterStore] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [errors, setErrors] = useState<ValidationError[]>([]);

    const { isOpen, openModal, closeModal } = useModal();
    const [selectedProduct, setSelectedProduct] = useState<ProductDTO | undefined>();

    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        description: '',
        originalPrice: 0,
        discountPercentage: 0,
        stockQuantity: 0,
        storeId: null,
        categoryId: null,
        images: [],
        imageFiles: [],
        expiryDate: '',
        status: 'AVAILABLE',
        active: true,
    });

    const fetchStats = async () => {
        try {
            // Calculate stats from products data instead of API call
            if (products.length > 0) {
                const totalProducts = products.length;
                const activeProducts = products.filter(p => p.status === 'AVAILABLE').length;
                const outOfStockProducts = products.filter(p => p.status === 'OUT_OF_STOCK').length;
                const lowStockProducts = products.filter(p => p.stockQuantity < 10).length;
                const totalValue = products.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0);
                const averagePrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;

                setStats({
                    totalProducts,
                    activeProducts,
                    outOfStockProducts,
                    lowStockProducts,
                    totalValue,
                    averagePrice
                });
            } else {
                setStats({
                    totalProducts: 0,
                    activeProducts: 0,
                    outOfStockProducts: 0,
                    lowStockProducts: 0,
                    totalValue: 0,
                    averagePrice: 0
                });
            }
        } catch (error) {
            console.error('Failed to calculate product stats:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            console.log('Fetching products...');
            setLoading(true);
            let response: PageableResponse<ProductDTO>;

            if (searchQuery.trim()) {
                response = await ProductService.searchProducts(searchQuery, currentPage);
            } else {
                response = await ProductService.getAllProducts(currentPage);
            }

            console.log('Products response:', response);
            setProducts(response.content);
            setTotalPages(response.totalPages);
            await fetchStats();
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Не удалось загрузить товары');
        } finally {
            setLoading(false);
        }
    };

    const fetchStores = async () => {
        try {
            // Сначала пробуем получить активные магазины (без пагинации, полный список)
            try {
                const activeResponse = await storeApi.getActive();
                if (Array.isArray(activeResponse)) {
                    setStores(activeResponse as StoreDTO[]);
                    console.log('Stores set (active):', activeResponse);
                    return;
                }
            } catch (activeError) {
                console.warn('Failed to fetch active stores, falling back to getAll:', activeError);
            }

            const response = await storeApi.getAll();
            console.log('Stores response:', response);
            if (response && typeof response === 'object' && 'content' in response) {
                const pageableResponse = response as PageableResponse<StoreDTO>;
                setStores(pageableResponse.content);
                console.log('Stores set:', pageableResponse.content);
            } else if (Array.isArray(response)) {
                setStores(response as StoreDTO[]);
                console.log('Stores set (array):', response);
            }
        } catch (error) {
            console.error('Failed to fetch stores:', error);
            toast.error('Не удалось загрузить заведения');
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await categoryApi.fetchCategories();
            console.log('Categories response:', response);
            setCategories(response);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            toast.error('Не удалось загрузить категории');
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchStores();
        fetchCategories();
    }, []); // Загружаем stores и categories только 1 раз

    useEffect(() => {
        if (mounted) {
            fetchProducts();
        }
    }, [currentPage, filterStore, filterCategory, filterStatus, searchQuery, mounted]);

    useEffect(() => {
        // Clean up object URLs when component unmounts
        return () => {
            formData.images.forEach(image => {
                if (image && image.startsWith('blob:')) {
                    URL.revokeObjectURL(image);
                }
            });
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Don't render anything until mounted
    if (!mounted) {
        return null;
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
        setErrors(prev => prev.filter(error => error.field !== name));
    };

    const handleSelectChange = (name: string, value: string) => {
        console.log('Select change:', { name, value });
        console.log('Current form data:', formData);

        if (name === 'categoryId') {
            const categoryId = value === '' ? null : Number(value);
            const selectedCategory = categories.find(cat => cat.id === categoryId);
            console.log('Selected category:', selectedCategory);
        }

        setFormData(prev => {
            if (name === 'storeId' || name === 'categoryId') {
                const newValue = value === '' ? null : Number(value);
                console.log(`Setting ${name} to:`, newValue);
                return {
                    ...prev,
                    [name]: newValue
                };
            }
            return {
                ...prev,
                [name]: value
            };
        });
    };

    const handleImageFileChange = (index: number, file: File | null) => {
        if (file) {
            // Валидация файла
            if (!validateImageFile(file)) {
                return;
            }
        }

        setFormData(prev => {
            const newImageFiles = [...prev.imageFiles];
            const newImages = [...prev.images];
            
            if (file) {
                newImageFiles[index] = file;
                // Create a preview URL for display
                newImages[index] = URL.createObjectURL(file);
            } else {
                newImageFiles.splice(index, 1);
                newImages.splice(index, 1);
            }
            
            return {
                ...prev,
                imageFiles: newImageFiles,
                images: newImages
            };
        });
    };

    const addImageField = () => {
        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ''],
            imageFiles: [...prev.imageFiles]
        }));
    };

    const removeImageField = (index: number) => {
        setFormData(prev => {
            // Revoke the object URL to prevent memory leaks
            if (prev.images[index] && prev.images[index].startsWith('blob:')) {
                URL.revokeObjectURL(prev.images[index]);
            }
            
            return {
                ...prev,
                images: prev.images.filter((_, i) => i !== index),
                imageFiles: prev.imageFiles.filter((_, i) => i !== index)
            };
        });
    };

    const validateForm = (): boolean => {
        const validationErrors: ValidationError[] = [];

        if (!formData.name.trim()) {
            validationErrors.push({ field: 'name', message: 'Название товара обязательно' });
        } else if (formData.name.length < 3 || formData.name.length > 100) {
            validationErrors.push({ field: 'name', message: 'Название товара должно содержать от 3 до 100 символов' });
        }

        if (formData.description && formData.description.length > 1000) {
            validationErrors.push({ field: 'description', message: 'Описание не может превышать 1000 символов' });
        }

        if (formData.originalPrice <= 0) {
            validationErrors.push({ field: 'originalPrice', message: 'Оригинальная цена должна быть больше 0' });
        }

        if (formData.stockQuantity < 0) {
            validationErrors.push({ field: 'stockQuantity', message: 'Количество на складе не может быть отрицательным' });
        }

        if (!formData.storeId) {
            validationErrors.push({ field: 'storeId', message: 'Заведение обязательно' });
        }

        if (!formData.categoryId) {
            validationErrors.push({ field: 'categoryId', message: 'Категория обязательна' });
        }

        if (formData.discountPercentage && (formData.discountPercentage < 0 || formData.discountPercentage > 100)) {
            validationErrors.push({ field: 'discountPercentage', message: 'Процент скидки должен быть от 0 до 100' });
        }

        setErrors(validationErrors);
        return validationErrors.length === 0;
    };

    const getFieldError = (fieldName: string): string | undefined => {
        return errors.find(error => error.field === fieldName)?.message;
    };

    const resetForm = () => {
        // Clean up object URLs to prevent memory leaks
        formData.images.forEach(image => {
            if (image && image.startsWith('blob:')) {
                URL.revokeObjectURL(image);
            }
        });
        
        setFormData({
            name: '',
            description: '',
            price: 0,
            originalPrice: 0,
            discountPercentage: 0,
            stockQuantity: 0,
            storeId: null,
            categoryId: null,
            images: [],
            imageFiles: [],
            expiryDate: '',
            status: 'AVAILABLE',
            active: true,
        });
        setErrors([]);
        setSelectedProduct(undefined);
    };

    const handleCreate = () => {
        resetForm();
        openModal();
    };

    const handleEdit = (product: ProductDTO) => {
        setSelectedProduct(product);
        setFormData({
            name: product.name,
            description: product.description || '',
            originalPrice: Number(product.originalPrice) || 0,
            discountPercentage: product.discountPercentage || 0,
            stockQuantity: product.stockQuantity,
            storeId: product.storeId,
            categoryId: product.categoryId,
            images: product.images && product.images.length > 0 ? product.images : [],
            imageFiles: [],
            expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : '',
            status: product.status,
            active: product.active,
        });
        setErrors([]);
        openModal();
    };

    const uploadImages = async (files: File[]): Promise<string[]> => {
        const uploadedUrls: string[] = [];
        
        for (const file of files) {
            if (file) {
                try {
                    // Validate file before upload
                    const validationError = FileUploadService.validateImageFile(file);
                    if (validationError) {
                        console.error('File validation error:', validationError);
                        // Fallback to base64 encoding
                        const base64 = await FileUploadService.convertToBase64(file);
                        uploadedUrls.push(base64);
                        continue;
                    }

                    // Upload file using the service
                    const uploadResponse = await FileUploadService.uploadImage(file);
                    uploadedUrls.push(uploadResponse.url);
                } catch (error) {
                    console.error('Error uploading image:', error);
                    // Fallback to base64 encoding
                    try {
                        const base64 = await FileUploadService.convertToBase64(file);
                        uploadedUrls.push(base64);
                    } catch (base64Error) {
                        console.error('Error converting to base64:', base64Error);
                        // Skip this file if both upload and base64 fail
                    }
                }
            }
        }
        
        return uploadedUrls;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Пожалуйста, исправьте ошибки валидации');
            return;
        }

        setSaving(true);
        try {
            // Find the selected category
            const selectedCategory = categories.find(cat => cat.id === formData.categoryId);
            if (!selectedCategory) {
                toast.error('Пожалуйста, выберите действительную категорию');
                return;
            }

            // Upload new images if any
            let imageUrls = formData.images.filter(img => img.trim() && !img.startsWith('blob:'));
            if (formData.imageFiles.length > 0) {
                const uploadedUrls = await uploadImages(formData.imageFiles);
                imageUrls = [...imageUrls, ...uploadedUrls];
            }

            // Format the expiry date to include time if it exists
            // Convert null values to undefined for API compatibility
            const formattedData: ProductUpdateRequest = {
                name: formData.name,
                description: formData.description,
                originalPrice: formData.originalPrice,
                discountPercentage: formData.discountPercentage,
                stockQuantity: formData.stockQuantity,
                storeId: formData.storeId ?? undefined,
                categoryId: formData.categoryId ?? undefined,
                images: imageUrls,
                expiryDate: formData.expiryDate ? `${formData.expiryDate}T00:00:00.000Z` : undefined,
                status: formData.status,
                active: formData.active,
            };

            if (selectedProduct) {
                await ProductService.updateProduct(selectedProduct.id, formattedData);
                toast.success('Товар успешно обновлен');
            } else {
                // For create, we need ProductCreateRequest
                const createData: ProductCreateRequest = {
                    name: formData.name,
                    description: formData.description,
                    originalPrice: formData.originalPrice,
                    discountPercentage: formData.discountPercentage,
                    stockQuantity: formData.stockQuantity,
                    storeId: formData.storeId ?? undefined,
                    categoryId: formData.categoryId ?? undefined,
                    images: imageUrls,
                    expiryDate: formData.expiryDate ? `${formData.expiryDate}T00:00:00.000Z` : undefined,
                    status: formData.status,
                    active: formData.active,
                };
                await ProductService.createProduct(createData);
                toast.success('Товар успешно создан');
            }

            await fetchProducts();
            await fetchStats();
            closeModal();
            resetForm();
        } catch (error: any) {
            console.error('Error saving product:', error);
            if (error.response?.data?.message) {
                toast.error(`Ошибка: ${error.response.data.message}`);
            } else {
                toast.error('Не удалось сохранить товар');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить этот товар?')) {
            return;
        }

        try {
            await ProductService.deleteProduct(id);
            toast.success('Товар успешно удален');
            await fetchProducts();
            await fetchStats();
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Не удалось удалить товар');
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = PRODUCT_STATUSES.find(s => s.value === status) || PRODUCT_STATUSES[0];
        return (
            <Badge className={`${statusConfig.color} border-0`}>
                {statusConfig.label}
            </Badge>
        );
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = !searchQuery ||
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStore = !filterStore || filterStore === 'all' || product.storeId.toString() === filterStore;
        const matchesCategory = !filterCategory || filterCategory === 'all' || product.categoryId.toString() === filterCategory;
        const matchesStatus = !filterStatus || filterStatus === 'all' || product.status === filterStatus;

        return matchesSearch && matchesStore && matchesCategory && matchesStatus;
    });

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Intl.DateTimeFormat('ru-RU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date(dateString));
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Неверная дата';
        }
    };

    const StatsCards = () => {
        return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Всего товаров</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats?.totalProducts || 0}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Активные товары</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {stats?.activeProducts || 0}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Нет в наличии</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {stats?.outOfStockProducts || 0}
                                </p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-full">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L5.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Общая стоимость</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {stats?.totalValue ? formatCurrency(stats.totalValue) : formatCurrency(0)}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'STORE_MANAGER', 'STORE_OWNER']}>
            <div className="p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Управление товарами</h1>
                    <p className="text-gray-600">Управляйте своими товарами, запасами и ценами</p>
                </div>

                <StatsCards />

                {/* Filters and Search */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="md:col-span-2">
                                <Input
                                    type="text"
                                    placeholder="Поиск товаров..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            <select
                                value={filterStore}
                                onChange={(e) => setFilterStore(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                <option value="all">Все заведения</option>
                                {stores.map((store) => (
                                    <option key={store.id} value={store.id.toString()}>
                                        {store.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                <option value="all">Все категории</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id.toString()}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                <option value="all">Все статусы</option>
                                {PRODUCT_STATUSES.map((status) => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                                Добавить новый товар
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Products Table */}
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-6">
                                <div className="space-y-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Товар</TableHead>
                                        <TableHead>Заведение</TableHead>
                                        <TableHead>Категория</TableHead>
                                        <TableHead>Цена</TableHead>
                                        <TableHead>Запас</TableHead>
                                        <TableHead>Статус</TableHead>
                                        <TableHead>Создан</TableHead>
                                        <TableHead className="text-right">Действия</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProducts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8">
                                                <div className="text-gray-500">
                                                    <p className="text-lg font-medium">Товары не найдены</p>
                                                    <p className="text-sm">Создайте свой первый товар, чтобы начать</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredProducts.map((product) => (
                                            <TableRow key={product.id}>
                                                <TableCell>
                                                    <div className="flex items-center space-x-3">
                                                        {product.images && product.images[0] ? (
                                                            <img
                                                                src={product.images[0]}
                                                                alt={product.name}
                                                                className="w-10 h-10 rounded-lg object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-gray-900">{product.name}</p>
                                                            <p className="text-sm text-gray-500 truncate max-w-[200px]">
                                                                {product.description || 'Нет описания'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{product.storeName || `Store ${product.storeId}`}</p>
                                                        {product.storeAddress && (
                                                            <p className="text-sm text-gray-500 truncate max-w-[150px]">
                                                                {product.storeAddress}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {product.categoryName || `Category ${product.categoryId}`}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div>                                    <p className="font-medium">{formatCurrency(Number(product.price))}</p>
                                                        {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                                                            <p className="text-sm text-gray-500 line-through">
                                                                {formatCurrency(Number(product.originalPrice))}
                                                            </p>
                                                        )}
                                                        {product.discountPercentage && product.discountPercentage > 0 && (
                                                            <p className="text-sm text-green-600">
                                                                -{product.discountPercentage}%
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className={`font-medium ${product.stockQuantity === 0 ? 'text-red-600' : product.stockQuantity < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                            {product.stockQuantity}
                                                        </p>
                                                        {product.stockQuantity < 10 && product.stockQuantity > 0 && (
                                                            <p className="text-xs text-yellow-600">Мало на складе</p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(product.status)}
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-sm text-gray-600">
                                                        {formatDate(product.createdAt)}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(product)}
                                                        >
                                                            Редактировать
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(product.id)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            Удалить
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t">
                                <div className="text-sm text-gray-500">
                                    Страница {currentPage + 1} из {totalPages}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage === 0}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                    >
                                        Назад
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage >= totalPages - 1}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                    >
                                        Вперед
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Product Form Modal */}
                <Modal
                    isOpen={isOpen}
                    onClose={closeModal}
                    className="max-w-4xl"
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-lg p-6 max-h-[90vh] overflow-y-auto relative"
                        style={{ zIndex: 9999 }}
                    >
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {selectedProduct ? 'Редактировать товар' : 'Создать новый товар'}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                {selectedProduct ? 'Обновить информацию о товаре' : 'Добавить новый товар в инвентарь'}
                            </p>
                            {/* Debug info */}
                            {process.env.NODE_ENV === 'development' && (
                                <div className="mt-2 text-xs text-gray-500">
                                    Debug: Stores: {stores.length}, Categories: {categories.length},
                                    StoreId: {formData.storeId}, CategoryId: {formData.categoryId}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="name">Название товара *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Введите название товара"
                                        className={getFieldError('name') ? 'border-red-500' : ''}
                                    />
                                    {getFieldError('name') && (
                                        <p className="mt-1 text-sm text-red-500">{getFieldError('name')}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="storeId">Заведение *</Label>
                                    <select
                                        id="storeId"
                                        name="storeId"
                                        value={formData.storeId?.toString() || ''}
                                        onChange={(e) => handleSelectChange('storeId', e.target.value)}
                                        className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${getFieldError('storeId') ? 'border-red-500' : 'border-input'}`}
                                    >
                                        <option value="">{stores.length > 0 ? "Выберите заведение" : "Нет доступных заведений"}</option>
                                        {stores.map((store) => (
                                            <option key={store.id} value={store.id.toString()}>
                                                {store.name}
                                            </option>
                                        ))}
                                    </select>
                                    {getFieldError('storeId') && (
                                        <p className="mt-1 text-sm text-red-500">{getFieldError('storeId')}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description">Описание</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Введите описание товара"
                                    rows={3}
                                    className={getFieldError('description') ? 'border-red-500' : ''}
                                />
                                {getFieldError('description') && (
                                    <p className="mt-1 text-sm text-red-500">{getFieldError('description')}</p>
                                )}
                            </div>

                            {/* Price and Category */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Label htmlFor="originalPrice">Оригинальная цена *</Label>
                                    <Input
                                        id="originalPrice"
                                        name="originalPrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.originalPrice}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        className={getFieldError('originalPrice') ? 'border-red-500' : ''}
                                    />
                                    {getFieldError('originalPrice') && (
                                        <p className="mt-1 text-sm text-red-500">{getFieldError('originalPrice')}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="discountPercentage">Скидка %</Label>
                                    <Input
                                        id="discountPercentage"
                                        name="discountPercentage"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={formData.discountPercentage}
                                        onChange={handleInputChange}
                                        placeholder="0"
                                        className={getFieldError('discountPercentage') ? 'border-red-500' : ''}
                                    />
                                    {getFieldError('discountPercentage') && (
                                        <p className="mt-1 text-sm text-red-500">{getFieldError('discountPercentage')}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="calculatedPrice">Цена со скидкой (авто)</Label>
                                    <Input
                                        id="calculatedPrice"
                                        name="calculatedPrice"
                                        type="text"
                                        value={
                                            formData.originalPrice && formData.discountPercentage > 0
                                                ? (formData.originalPrice * (1 - formData.discountPercentage / 100)).toFixed(2)
                                                : formData.originalPrice.toFixed(2)
                                        }
                                        readOnly
                                        disabled
                                        className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Автоматически рассчитывается</p>
                                </div>
                            </div>

                            {/* Stock and Category */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Label htmlFor="stockQuantity">Количество на складе *</Label>
                                    <Input
                                        id="stockQuantity"
                                        name="stockQuantity"
                                        type="number"
                                        min="0"
                                        value={formData.stockQuantity}
                                        onChange={handleInputChange}
                                        placeholder="0"
                                        className={getFieldError('stockQuantity') ? 'border-red-500' : ''}
                                    />
                                    {getFieldError('stockQuantity') && (
                                        <p className="mt-1 text-sm text-red-500">{getFieldError('stockQuantity')}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="categoryId">Категория *</Label>
                                    <select
                                        id="categoryId"
                                        name="categoryId"
                                        value={formData.categoryId?.toString() || ''}
                                        onChange={(e) => handleSelectChange('categoryId', e.target.value)}
                                        className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${getFieldError('categoryId') ? 'border-red-500' : 'border-input'}`}
                                    >
                                        <option value="">{categories.length > 0 ? "Выберите категорию" : "Нет доступных категорий"}</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id.toString()}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                    {getFieldError('categoryId') && (
                                        <p className="mt-1 text-sm text-red-500">{getFieldError('categoryId')}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="status">Статус *</Label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={formData.status}
                                        onChange={(e) => handleSelectChange('status', e.target.value)}
                                        className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${getFieldError('status') ? 'border-red-500' : 'border-input'}`}
                                    >
                                        <option value="">Выберите статус</option>
                                        {PRODUCT_STATUSES.map((status) => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                    {getFieldError('status') && (
                                        <p className="mt-1 text-sm text-red-500">{getFieldError('status')}</p>
                                    )}
                                </div>
                            </div>

                            {/* Expiry Date */}
                            <div>
                                <Label htmlFor="expiryDate">Срок годности</Label>
                                <Input
                                    id="expiryDate"
                                    name="expiryDate"
                                    type="date"
                                    value={formData.expiryDate}
                                    onChange={handleInputChange}
                                />
                            </div>

                            {/* Images */}
                            <div>
                                <Label>Изображения товара</Label>
                                <div className="space-y-3">
                                    {formData.images.length === 0 ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-3">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        handleImageFileChange(0, file);
                                                    }}
                                                    className="flex-1"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        formData.images.map((image, index) => (
                                            <div key={index} className="space-y-2">
                                                <div className="flex items-center space-x-3">
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0] || null;
                                                            handleImageFileChange(index, file);
                                                        }}
                                                        className="flex-1"
                                                    />
                                                    {formData.images.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => removeImageField(index)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            Удалить
                                                        </Button>
                                                    )}
                                                </div>
                                                {/* Image preview */}
                                                {image && (
                                                    <div className="relative w-32 h-32 border border-gray-300 rounded-lg overflow-hidden">
                                                        <img
                                                            src={image}
                                                            alt={`Превью ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addImageField}
                                        className="w-full"
                                    >
                                        Добавить еще изображение
                                    </Button>
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center space-x-3">
                                <input
                                    id="active"
                                    name="active"
                                    type="checkbox"
                                    checked={formData.active}
                                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <Label htmlFor="active" className="text-sm font-medium text-gray-700">
                                    Активен (товар будет виден покупателям)
                                </Label>
                            </div>

                            {/* Validation Errors Summary */}
                            {errors.length > 0 && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
                                        Пожалуйста, исправьте следующие ошибки:
                                    </p>
                                    <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                                        {errors.map((error, index) => (
                                            <li key={index}>{error.message}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Form Actions */}
                            <div className="flex items-center justify-end space-x-4 pt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Отмена
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {saving ? 'Сохранение...' : selectedProduct ? 'Обновить товар' : 'Создать товар'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>
            </div>
        </ProtectedRoute>
    );
}