"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { storeApi } from '@/services/api';
import { categoryApi } from '@/services/api/categories';
import { userApi } from '@/services/api/users';
import { FileUploadService } from '@/services/fileUploadService';
import { useModal } from '@/hooks/useModal';
import { useToast } from "@/components/ui/use-toast";
import { StoreDTO, PageableResponse, CategoryDTO } from '@/types/api';
import { ValidationError } from '@/utils/validation';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface StoreFormData {
    name: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    logo: string;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
    openingHours: string;
    closingHours: string;
    category: string;
    active: boolean;
    managerId?: number;
    user: {
        email: string;
        role: 'STORE_OWNER';
    };
}

const STORE_STATUSES = [
    { value: 'PENDING', label: 'В ожидании', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'ACTIVE', label: 'Активен', color: 'bg-green-100 text-green-800' },
    { value: 'INACTIVE', label: 'Неактивен', color: 'bg-red-100 text-red-800' },
    { value: 'SUSPENDED', label: 'Приостановлен', color: 'bg-gray-100 text-gray-800' }
];

export default function StoresPage() {
    const [stores, setStores] = useState<StoreDTO[]>([]);
    const [categories, setCategories] = useState<CategoryDTO[]>([]);
    const [availableManagers, setAvailableManagers] = useState<Array<{ id: number, email: string, firstName: string, lastName: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [error, setError] = useState<string>('');
    const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoFilename, setLogoFilename] = useState<string>('');
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const { isOpen, openModal, closeModal } = useModal();
    const [selectedStore, setSelectedStore] = useState<StoreDTO | undefined>();
    const [formData, setFormData] = useState<StoreFormData>({
        name: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        logo: '',
        openingHours: '',
        closingHours: '',
        category: '',
        active: true,
        status: 'ACTIVE',
        user: {
            email: '',
            role: 'STORE_OWNER'
        }
    });

    const getFieldError = (fieldName: string): string | undefined => {
        const error = validationErrors.find(err => err.field === fieldName);
        return error?.message;
    };

    const validateForm = (): boolean => {
        const errors: ValidationError[] = [];

        if (!formData.name.trim()) {
            errors.push({ field: 'name', message: 'Название заведения обязательно' });
        }

        if (!formData.user.email.trim()) {
            errors.push({ field: 'user.email', message: 'Email владельца обязателен' });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.user.email)) {
            errors.push({ field: 'user.email', message: 'Неверный формат email' });
        }

        if (!formData.address.trim()) {
            errors.push({ field: 'address', message: 'Адрес обязателен' });
        }

        if (!formData.phone.trim()) {
            errors.push({ field: 'phone', message: 'Номер телефона обязателен' });
        }

        if (!formData.email.trim()) {
            errors.push({ field: 'email', message: 'Email заведения обязателен' });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.push({ field: 'email', message: 'Неверный формат email' });
        }

        if (!formData.category) {
            errors.push({ field: 'category', message: 'Категория обязательна' });
        }

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const fetchStores = async () => {
        try {
            setLoading(true);
            setError('');
            // Попробуем сначала получить активные магазины с количеством продуктов
            let response;
            try {
                response = await storeApi.getActive();
                if (Array.isArray(response)) {
                    setStores(response as StoreDTO[]);
                    return;
                }
            } catch (activeError) {
                console.warn('Failed to fetch active stores, falling back to getAll:', activeError);
            }

            // Если не удалось получить активные, используем старый метод
            response = await storeApi.getAll();
            if (response && typeof response === 'object' && 'content' in response) {
                // Пагинированный ответ от Spring Boot
                const pageableResponse = response as PageableResponse<StoreDTO>;
                setStores(pageableResponse.content);
            } else if (Array.isArray(response)) {
                // Обычный массив
                setStores(response as StoreDTO[]);
            } else {
                console.warn('Unexpected API response structure:', response);
                setStores([]);
            }
        } catch (error) {
            console.error('Failed to fetch stores:', error);
            setError('Не удалось загрузить заведения. Пожалуйста, попробуйте позже.');
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить заведения. Пожалуйста, попробуйте позже.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await categoryApi.fetchActiveCategories();
            setCategories(response);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить категории',
                variant: 'destructive',
            });
        }
    };

    useEffect(() => {
        fetchStores();
        fetchCategories();
        fetchAvailableManagers();
    }, []);

    const fetchAvailableManagers = async () => {
        try {
            const managers = await userApi.getAvailableManagers();
            setAvailableManagers(managers);
        } catch (error) {
            console.error('Failed to fetch available managers:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Вы уверены, что хотите удалить это заведение?')) {
            try {
                await storeApi.delete(id);
                toast({
                    title: 'Успех',
                    description: 'Заведение успешно удалено',
                });
                fetchStores();
            } catch (error) {
                console.error('Failed to delete store:', error);
                toast({
                    title: 'Ошибка',
                    description: 'Не удалось удалить заведение',
                    variant: 'destructive',
                });
            }
        }
    };

    const getFileNameFromUrl = (url?: string | null) => {
        if (!url) {
            return '';
        }
        try {
            const pathname = new URL(url).pathname;
            return pathname.split('/').pop() ?? '';
        } catch (e) {
            return url.split('/').pop() ?? '';
        }
    };

    const handleEdit = (store: StoreDTO) => {
        console.log('Editing store:', store);
        setSelectedStore(store);
        setFormData({
            name: store.name,
            description: store.description || '',
            address: store.address,
            phone: store.phone,
            email: store.email || '',
            logo: store.logo || '',
            status: store.status,
            openingHours: store.openingHours || '09:00',
            closingHours: store.closingHours || '18:00',
            category: store.category || '',
            active: store.active,
            managerId: store.managerId || undefined, // Добавляем managerId
            user: {
                email: store.ownerName || '',
                role: 'STORE_OWNER'
            }
        });
        setLogoFilename(getFileNameFromUrl(store.logo));
        setLogoUploadError(null);
        openModal();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast({
                title: 'Ошибка валидации',
                description: 'Пожалуйста, исправьте ошибки валидации',
                variant: 'destructive',
            });
            return;
        }

        if (logoUploading) {
            toast({
                title: 'Загрузка логотипа',
                description: 'Дождитесь окончания загрузки изображения перед сохранением.',
                variant: 'destructive',
            });
            return;
        }

        setSubmitting(true);
        try {
            // Check if store with same name exists (excluding current store when updating)
            const existingStoreByName = stores.find(
                store => store.name.toLowerCase() === formData.name.toLowerCase() &&
                    (!selectedStore || store.id !== selectedStore.id)
            );
            if (existingStoreByName) {
                toast({
                    title: 'Ошибка',
                    description: 'Заведение с таким названием уже существует',
                    variant: 'destructive',
                });
                setSubmitting(false);
                return;
            }

            // Check if store with same phone exists (excluding current store when updating)
            const existingStoreByPhone = stores.find(
                store => store.phone === formData.phone &&
                    (!selectedStore || store.id !== selectedStore.id)
            );
            if (existingStoreByPhone) {
                toast({
                    title: 'Ошибка',
                    description: 'Заведение с таким номером телефона уже существует',
                    variant: 'destructive',
                });
                setSubmitting(false);
                return;
            }

            const formattedData = {
                ...formData,
                openingHours: formData.openingHours || '00:00:00',
                closingHours: formData.closingHours || '00:00:00',
                user: {
                    email: formData.user.email,
                    role: 'STORE_OWNER' as const
                }
            };

            console.log('Submitting store data:', formattedData);

            if (selectedStore) {
                await storeApi.update(selectedStore.id, formattedData);
                toast({
                    title: 'Успех',
                    description: 'Заведение успешно обновлено',
                });
            } else {
                await storeApi.create(formattedData);
                toast({
                    title: 'Успех',
                    description: 'Заведение успешно создано',
                });
            }

            await fetchStores();
            closeModal();
            resetForm();
        } catch (error) {
            console.error('Error saving store:', error);
            toast({
                title: 'Ошибка',
                description: 'Не удалось сохранить заведение',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const validationError = FileUploadService.validateImageFile(file);
        if (validationError) {
            setLogoUploadError(validationError);
            event.target.value = '';
            return;
        }

        setLogoUploadError(null);
        setLogoUploading(true);

        try {
            const uploadResult = await FileUploadService.uploadStoreLogo(file);
            setFormData(prev => ({
                ...prev,
                logo: uploadResult.url,
            }));
            setLogoFilename(uploadResult.filename || file.name);
            setValidationErrors(prev => prev.filter(error => error.field !== 'logo'));
            toast({
                title: 'Успешная загрузка',
                description: 'Логотип успешно загружен.',
            });
        } catch (uploadError) {
            console.error('Logo upload failed:', uploadError);
            setLogoUploadError('Не удалось загрузить изображение. Попробуйте позже.');
            toast({
                title: 'Ошибка загрузки',
                description: 'Не удалось загрузить изображение. Попробуйте позже.',
                variant: 'destructive',
            });
        } finally {
            setLogoUploading(false);
            event.target.value = '';
        }
    };

    const handleRemoveLogo = () => {
        setFormData(prev => ({
            ...prev,
            logo: '',
        }));
        setLogoFilename('');
        setLogoUploadError(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        console.log('Form field changed:', name, value);
        if (name.startsWith('user.')) {
            const userField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                user: {
                    ...prev.user,
                    [userField]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleCategoryChange = (value: string) => {
        console.log('Selected category:', value);
        setFormData(prev => ({
            ...prev,
            category: value
        }));
        // Clear category validation error if it exists
        setValidationErrors(prev => prev.filter(error => error.field !== 'category'));
    };

    const handleStatusChange = (value: string) => {
        console.log('Selected status:', value);
        setFormData(prev => ({
            ...prev,
            status: value as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING'
        }));
    };

    const filteredStores = Array.isArray(stores) ? stores.filter(store =>
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.address.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [];

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            address: '',
            phone: '',
            email: '',
            logo: '',
            status: 'ACTIVE',
            openingHours: '09:00',
            closingHours: '18:00',
            category: '',
            active: true,
            managerId: undefined,
            user: {
                email: '',
                role: 'STORE_OWNER'
            }
        });
        setValidationErrors([]);
        setLogoUploadError(null);
        setLogoFilename('');
        setLogoUploading(false);
    };

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
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
                <button
                    onClick={fetchStores}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Повторить
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Управление заведениями</h1>
                <Button
                    className="bg-brand-500 hover:bg-brand-600 text-white"
                    onClick={() => {
                        setSelectedStore(undefined);
                        setFormData({
                            name: '',
                            description: '',
                            address: '',
                            phone: '',
                            email: '',
                            logo: '',
                            status: 'ACTIVE',
                            openingHours: '09:00',
                            closingHours: '18:00',
                            category: '',
                            active: true,
                            user: {
                                email: '',
                                role: 'STORE_OWNER'
                            }
                        });
                        setLogoFilename('');
                        setLogoUploadError(null);
                        setLogoUploading(false);
                        openModal();
                    }}
                >
                    <span className="mr-2">+</span>
                    Добавить заведение
                </Button>
            </div>

            <div className="mb-6">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">🔍</span>
                    <Input
                        type="text"
                        placeholder="Поиск по названию или адресу..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white dark:bg-gray-800"
                    />
                </div>
            </div>

            <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Изображение</TableHead>
                                <TableHead>Название</TableHead>
                                <TableHead>Категория</TableHead>
                                <TableHead>Адрес</TableHead>
                                <TableHead>Контакты</TableHead>
                                <TableHead>Товары</TableHead>
                                <TableHead>Часы работы</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStores.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-4">
                                        Заведения не найдены
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStores.map((store) => (
                                    <TableRow key={store.id}>
                                        <TableCell>
                                            <div className="w-12 h-12 rounded-lg overflow-hidden">
                                                {store.logo ? (
                                                    <img
                                                        src={store.logo}
                                                        alt={store.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                        <span className="text-gray-400">🏪</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {store.name}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                                    {store.description}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                                {store.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm">{store.address}</p>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="text-sm">{store.phone}</p>
                                                <p className="text-sm text-gray-500">{store.email}</p>
                                                <p className="text-xs text-gray-400">
                                                    Владелец: {store.ownerName}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-center">
                                                <p className="font-medium text-lg">
                                                    {store.productCount || 0}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    товаров
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p>{store.openingHours} - {store.closingHours}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <Badge
                                                    variant={store.status === 'ACTIVE' ? 'default' : 'destructive'}
                                                >
                                                    {store.status}
                                                </Badge>
                                                <Badge
                                                    variant={store.active ? 'default' : 'destructive'}
                                                    className="ml-2"
                                                >
                                                    {store.active ? 'Активен' : 'Неактивен'}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(store)}
                                                >
                                                    Редактировать
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(store.id)}
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
                </CardContent>
            </Card>

            <Modal
                isOpen={isOpen}
                onClose={() => {
                    closeModal();
                    setSelectedStore(undefined);
                }}
                className="max-w-3xl mx-auto max-h-[90vh] overflow-y-auto"
            >
                <div className="p-3">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold">
                            {selectedStore ? 'Редактировать заведение' : 'Добавить новое заведение'}
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                closeModal();
                                setSelectedStore(undefined);
                            }}
                        >
                            ✕
                        </Button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="name">Название заведения *</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Введите название заведения"
                                    className={getFieldError('name') ? 'border-red-500' : ''}
                                />
                                {getFieldError('name') && (
                                    <p className="mt-1 text-sm text-red-500">{getFieldError('name')}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="user.email">Email владельца *</Label>
                                <Input
                                    id="user.email"
                                    name="user.email"
                                    type="email"
                                    value={formData.user.email}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        user: {
                                            ...prev.user,
                                            email: e.target.value
                                        }
                                    }))}
                                    placeholder="Введите email владельца"
                                    className={getFieldError('user.email') ? 'border-red-500' : ''}
                                />
                                {getFieldError('user.email') && (
                                    <p className="mt-1 text-sm text-red-500">{getFieldError('user.email')}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description">Описание</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Введите описание заведения"
                                rows={3}
                                className={getFieldError('description') ? 'border-red-500' : ''}
                            />
                            {getFieldError('description') && (
                                <p className="mt-1 text-sm text-red-500">{getFieldError('description')}</p>
                            )}
                        </div>

                        {/* Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="address">Адрес *</Label>
                                <Input
                                    id="address"
                                    name="address"
                                    type="text"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Введите адрес заведения"
                                    className={getFieldError('address') ? 'border-red-500' : ''}
                                />
                                {getFieldError('address') && (
                                    <p className="mt-1 text-sm text-red-500">{getFieldError('address')}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="phone">Номер телефона *</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Введите номер телефона"
                                    className={getFieldError('phone') ? 'border-red-500' : ''}
                                />
                                {getFieldError('phone') && (
                                    <p className="mt-1 text-sm text-red-500">{getFieldError('phone')}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="email">Email заведения *</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Введите email заведения"
                                className={getFieldError('email') ? 'border-red-500' : ''}
                            />
                            {getFieldError('email') && (
                                <p className="mt-1 text-sm text-red-500">{getFieldError('email')}</p>
                            )}
                        </div>

                        {/* Operating Hours */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="openingHours">Часы открытия</Label>
                                <Input
                                    id="openingHours"
                                    name="openingHours"
                                    type="time"
                                    value={formData.openingHours}
                                    onChange={handleChange}
                                    className={getFieldError('openingHours') ? 'border-red-500' : ''}
                                />
                                {getFieldError('openingHours') && (
                                    <p className="mt-1 text-sm text-red-500">{getFieldError('openingHours')}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="closingHours">Часы закрытия</Label>
                                <Input
                                    id="closingHours"
                                    name="closingHours"
                                    type="time"
                                    value={formData.closingHours}
                                    onChange={handleChange}
                                    className={getFieldError('closingHours') ? 'border-red-500' : ''}
                                />
                                {getFieldError('closingHours') && (
                                    <p className="mt-1 text-sm text-red-500">{getFieldError('closingHours')}</p>
                                )}
                            </div>
                        </div>

                        {/* Category and Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="category">Категория</Label>
                                <select
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer relative z-10"
                                    aria-label="Select category"
                                    style={{ WebkitAppearance: 'menulist' }}
                                >
                                    <option value="">Выберите категорию</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                                {getFieldError('category') && (
                                    <p className="mt-1 text-sm text-red-500">{getFieldError('category')}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="status">Статус</Label>
                                <select
                                    id="status"
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as StoreFormData['status'] }))}
                                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer relative z-10"
                                    aria-label="Select status"
                                    style={{ WebkitAppearance: 'menulist' }}
                                >
                                    {STORE_STATUSES.map((status) => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Manager Selection */}
                        <div>
                            <Label htmlFor="manager">Менеджер (необязательно)</Label>
                            <select
                                id="manager"
                                value={formData.managerId || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, managerId: e.target.value ? parseInt(e.target.value) : undefined }))}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer relative z-10"
                                aria-label="Select manager"
                                style={{ WebkitAppearance: 'menulist' }}
                            >
                                <option value="">Без менеджера</option>
                                {availableManagers.map((manager) => (
                                    <option key={manager.id} value={manager.id}>
                                        {manager.firstName} {manager.lastName} ({manager.email})
                                    </option>
                                ))}
                            </select>
                            {getFieldError('managerId') && (
                                <p className="mt-1 text-sm text-red-500">{getFieldError('managerId')}</p>
                            )}
                        </div>

                        {/* Logo Upload */}
                        <div>
                            <Label htmlFor="logo">Логотип заведения</Label>
                            <div className="mt-2 space-y-3">
                                {formData.logo && (
                                    <div className="flex items-center space-x-4">
                                        <div className="h-16 w-16 overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                                            <img
                                                src={formData.logo}
                                                alt="Предпросмотр логотипа"
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">
                                            <p className="font-medium break-all">{logoFilename || 'Загруженный логотип'}</p>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleRemoveLogo}
                                                disabled={logoUploading}
                                            >
                                                Удалить логотип
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                <Input
                                    id="logo"
                                    type="file"
                                    accept={FileUploadService.ALLOWED_IMAGE_TYPES.join(',')}
                                    onChange={handleLogoUpload}
                                    disabled={logoUploading}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Поддерживаемые форматы: {FileUploadService.SUPPORTED_FORMATS_LABEL}. Максимальный размер 10MB.
                                </p>
                                {logoUploading && (
                                    <p className="text-sm text-gray-500">Загружается логотип...</p>
                                )}
                                {logoUploadError && (
                                    <p className="text-sm text-red-500">{logoUploadError}</p>
                                )}
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
                                aria-label="Store active status"
                            />
                            <Label htmlFor="active" className="text-sm font-medium text-gray-700">
                                Активно (заведение будет видно клиентам)
                            </Label>
                        </div>

                        {/* Form Actions */}
                        <div className="flex items-center justify-end space-x-4 pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeModal}
                                disabled={submitting}
                            >
                                Отмена
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting || logoUploading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {submitting ? 'Сохранение...' : selectedStore ? 'Обновить заведение' : 'Создать заведение'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}
