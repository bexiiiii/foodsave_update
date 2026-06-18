"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchIcon, FilterIcon, CalendarIcon, PlusIcon, RefreshCwIcon, QrCodeIcon, ScanIcon, PencilIcon, EyeIcon } from 'lucide-react';
import { format } from 'date-fns';
import ProtectedRoute from '@/components/ProtectedRoute';
import { orderApi } from '@/services/api';
import { OrderDTO } from '@/types/api';
import { useModal } from '@/hooks/useModal';
import { CreateOrderModal } from '@/components/modals/CreateOrderModal';
import { OrderQRModal } from '@/components/modals/OrderQRModal';
import { QROrderDetailsModal } from '@/components/modals/QROrderDetailsModal';
import { EditOrderModal } from '@/components/modals/EditOrderModal';
import OrderDetailsModal from '@/components/History/OrderDetailsModal';

const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PREPARING: 'bg-purple-100 text-purple-800',
    READY_FOR_PICKUP: 'bg-green-100 text-green-800',
    OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    REFUNDED: 'bg-gray-100 text-gray-800'
};

export default function OrderManagementPage() {
    const { isOpen: isCreateModalOpen, openModal: openCreateModal, closeModal: closeCreateModal } = useModal();
    const { isOpen: isQRScannerOpen, openModal: openQRScanner, closeModal: closeQRScanner } = useModal();
    const { isOpen: isEditModalOpen, openModal: openEditModal, closeModal: closeEditModal } = useModal();
    const { isOpen: isViewModalOpen, openModal: openViewModal, closeModal: closeViewModal } = useModal();
    const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null);
    const [orderToEdit, setOrderToEdit] = useState<OrderDTO | null>(null);
    const [orderToView, setOrderToView] = useState<OrderDTO | null>(null);
    const [orders, setOrders] = useState<OrderDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('today');
    const [stats, setStats] = useState({
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0
    });

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await orderApi.getAll();
            const ordersData = Array.isArray(response) ? response : [];
            
            // Отладка: выводим данные в консоль
            console.log('Orders data from API:', ordersData);
            if (ordersData.length > 0) {
                console.log('First order sample:', ordersData[0]);
                console.log('First order totalAmount type:', typeof ordersData[0].totalAmount);
                console.log('First order orderDate type:', typeof ordersData[0].orderDate);
                console.log('First order orderDate value:', ordersData[0].orderDate);
                console.log('First order createdAt:', (ordersData[0] as any).createdAt);
                
                // Проверяем все возможные поля дат
                const order = ordersData[0] as any;
                console.log('Date fields check:');
                console.log('- orderDate:', order.orderDate);
                console.log('- createdAt:', order.createdAt);
                console.log('- updatedAt:', order.updatedAt);
                console.log('- estimatedPickupTime:', order.estimatedPickupTime);
            }
            
            setOrders(ordersData);

            // Calculate statistics
            const stats = {
                totalOrders: ordersData.length,
                pendingOrders: ordersData.filter(o => o.status === 'PENDING').length,
                completedOrders: ordersData.filter(o => ['DELIVERED', 'PICKED_UP'].includes(o.status)).length,
                cancelledOrders: ordersData.filter(o => o.status === 'CANCELLED').length,
                totalRevenue: ordersData.reduce((sum, order) => {
                    const orderAny = order as any;
                    const amount = parseFloat((orderAny.total || order.totalAmount)?.toString() || '0') || 0;
                    console.log(`Order ${order.id}: total = ${orderAny.total}, totalAmount = ${order.totalAmount}, parsed = ${amount}`);
                    return sum + (isNaN(amount) ? 0 : amount);
                }, 0)
            };
            
            console.log('Calculated stats:', stats);
            setStats(stats);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            toast.error('Failed to load orders');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (orderId: number, newStatus: OrderDTO['status']) => {
        try {
            await orderApi.updateStatus(orderId, newStatus);
            toast.success('Order status updated successfully');
            fetchOrders();
        } catch (error) {
            console.error('Failed to update order status:', error);
            toast.error('Failed to update order status');
        }
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) {
            console.log('Empty date string:', dateString);
            return 'N/A';
        }
        
        try {
            // Парсим дату из ISO формата (2025-06-26T18:51:03.255075)
            const date = new Date(dateString);
            
            if (isNaN(date.getTime())) {
                console.log('Invalid date:', dateString);
                return 'Invalid Date';
            }
            
            // Форматируем дату с временем: "Jun 26, 2025 18:51"
            return format(date, 'MMM dd, yyyy HH:mm');
        } catch (error) {
            console.error('Date formatting error:', error, 'for date:', dateString);
            return 'Invalid Date';
        }
    };

    const formatPrice = (price: number | string | null | undefined) => {
        // Отладочная информация для цены
        console.log('formatPrice called with:', price, 'type:', typeof price);
        
        if (price === null || price === undefined) {
            console.log('Price is null/undefined, returning ₸0');
            return '₸0';
        }
        
        const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
        console.log('Numeric price:', numericPrice);
        
        if (isNaN(numericPrice)) {
            console.log('Price is NaN, returning ₸0');
            return '₸0';
        }
        
        // Временно возвращаем простое форматирование для отладки
        return `₸${numericPrice}`;
        
        // Форматируем в тенге (KZT) - отключено для отладки
        // const formatted = new Intl.NumberFormat('kk-KZ', {
        //     style: 'currency',
        //     currency: 'KZT',
        //     minimumFractionDigits: 0,
        //     maximumFractionDigits: 0,
        // }).format(numericPrice);
        
        // console.log('Formatted price:', formatted);
        // return formatted;
    };

    // Утилитарная функция для получения даты заказа из различных полей
    const getOrderDate = (order: OrderDTO) => {
        const orderAny = order as any;
        return order.orderDate || orderAny.createdAt || orderAny.updatedAt;
    };

    // Утилитарная функция для получения цены заказа из различных полей
    const getOrderTotal = (order: OrderDTO) => {
        const orderAny = order as any;
        return orderAny.total || order.totalAmount || 0;
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = 
            order.id.toString().includes(searchQuery) ||
            order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.items.some(item => 
                item.productName?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        
        // Обработка фильтра по дате
        let matchesDate = true;
        const dateField = getOrderDate(order);
        
        if (dateFilter !== 'all' && dateField) {
            const orderDate = new Date(dateField);
            const now = new Date();
            
            // Отладочная информация для фильтрации дат
            if (dateFilter === 'today') {
                console.log('Today filter debug for order', order.id);
                console.log('- Raw orderDate:', order.orderDate);
                console.log('- Raw createdAt:', (order as any).createdAt);
                console.log('- Using date field:', dateField);
                console.log('- Parsed orderDate:', orderDate);
                console.log('- Current time:', now);
                console.log('- OrderDate valid?', !isNaN(orderDate.getTime()));
            }
            
            switch (dateFilter) {
                case 'today': {
                    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                    matchesDate = orderDate >= startOfToday && orderDate <= endOfToday;
                    break;
                }
                case 'yesterday': {
                    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
                    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
                    matchesDate = orderDate >= startOfYesterday && orderDate <= endOfYesterday;
                    break;
                }
                case 'week': {
                    const weekAgo = new Date(now);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    matchesDate = orderDate >= weekAgo && orderDate <= now;
                    break;
                }
                case 'month': {
                    const monthAgo = new Date(now);
                    monthAgo.setDate(monthAgo.getDate() - 30);
                    matchesDate = orderDate >= monthAgo && orderDate <= now;
                    break;
                }
                default:
                    matchesDate = true;
            }
        } else if (dateFilter !== 'all' && !dateField) {
            matchesDate = false;
        }

        return matchesSearch && matchesStatus && matchesDate;
    });

    // Вычисляем статистику на основе отфильтрованных заказов
    const filteredStats = {
        totalOrders: filteredOrders.length,
        pendingOrders: filteredOrders.filter(o => o.status === 'PENDING').length,
        completedOrders: filteredOrders.filter(o => ['DELIVERED', 'PICKED_UP'].includes(o.status)).length,
        cancelledOrders: filteredOrders.filter(o => o.status === 'CANCELLED').length,
        totalRevenue: filteredOrders.reduce((sum, order) => {
            const orderAny = order as any;
            const amount = parseFloat((orderAny.total || order.totalAmount)?.toString() || '0') || 0;
            console.log(`Order ${order.id}: total = ${orderAny.total}, totalAmount = ${order.totalAmount} (type: ${typeof order.totalAmount}), parsed = ${amount}`);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0)
    };

    // Отладочная информация
    console.log('Filter settings:', { dateFilter, statusFilter, searchQuery });
    console.log('Total orders:', orders.length);
    if (orders.length > 0) {
        console.log('Sample order dates:');
        orders.slice(0, 3).forEach((order, index) => {
            const orderAny = order as any;
            console.log(`Order ${order.id}:`, {
                orderDate: order.orderDate,
                createdAt: orderAny.createdAt,
                updatedAt: orderAny.updatedAt
            });
        });
    }
    console.log('Filtered orders:', filteredOrders.length);
    console.log('Filtered stats:', filteredStats);

    const handleEditClick = (order: OrderDTO) => {
        setOrderToEdit(order);
        openEditModal();
    };

    const handleViewClick = (order: OrderDTO) => {
        setOrderToView(order);
        openViewModal();
    };

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="bg-white dark:bg-gray-800">
                            <CardContent className="p-6">
                                <Skeleton className="h-4 w-1/4 mb-2" />
                                <Skeleton className="h-4 w-3/4" />
                            </CardContent>
                        </Card>
                    ))}
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

    return (
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'STORE_MANAGER', 'STORE_OWNER']}>
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Управление заказами</h1>
                    <p className="text-gray-600 dark:text-gray-400">Управляйте и отслеживайте все заказы клиентов</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchOrders}
                        className="flex items-center gap-2"
                    >
                        <RefreshCwIcon className="h-4 w-4" />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        onClick={openQRScanner}
                        className="flex items-center gap-2"
                    >
                        <ScanIcon className="h-4 w-4" />
                        Scan QR
                    </Button>
                    <Button
                        onClick={openCreateModal}
                        className="flex items-center gap-2"
                    >
                        <PlusIcon className="h-4 w-4" />
                        Create Order
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-white dark:bg-gray-800">
                    <CardContent className="p-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Все заказы {dateFilter !== 'all' && `(${dateFilter === 'today' ? 'Сегодня' : dateFilter === 'yesterday' ? 'Вчера' : dateFilter === 'week' ? '7 дней' : '30 дней'})`}
                        </h3>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{filteredStats.totalOrders}</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800">
                    <CardContent className="p-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Ожидающие заказы {dateFilter !== 'all' && `(${dateFilter === 'today' ? 'Сегодня' : dateFilter === 'yesterday' ? 'Вчера' : dateFilter === 'week' ? '7 дней' : '30 дней'})`}
                        </h3>
                        <p className="text-2xl font-semibold text-yellow-600">{filteredStats.pendingOrders}</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800">
                    <CardContent className="p-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Выполненные заказы {dateFilter !== 'all' && `(${dateFilter === 'today' ? 'Сегодня' : dateFilter === 'yesterday' ? 'Вчера' : dateFilter === 'week' ? '7 дней' : '30 дней'})`}
                        </h3>
                        <p className="text-2xl font-semibold text-green-600">{filteredStats.completedOrders}</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800">
                    <CardContent className="p-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Общая выручка {dateFilter !== 'all' && `(${dateFilter === 'today' ? 'Сегодня' : dateFilter === 'yesterday' ? 'Вчера' : dateFilter === 'week' ? '7 дней' : '30 дней'})`}
                        </h3>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatPrice(filteredStats.totalRevenue)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Ищите заказы по ID, номеру заказа, имени клиента или товару..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white dark:bg-gray-800"
                        />
                    </div>
                </div>
                <div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Filter orders by status"
                    >
                        <option value="all">Все заказы</option>
                        <option value="PENDING">Ожидающие</option>
                        <option value="CONFIRMED">Подтвержденные</option>
                        <option value="PREPARING">В процессе подготовки</option>
                        <option value="READY">Готовые</option>
                        <option value="PICKED_UP">Забраны</option>
                        <option value="DELIVERED">Доставленные</option>
                        <option value="CANCELLED">Отмененные</option>
                    </select>
                </div>
                <div>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Filter orders by date"
                    >
                        <option value="all">За все время</option>
                        <option value="today">Сегодня</option>
                        <option value="yesterday">Вчера</option>
                        <option value="week">Последние 7 дней</option>
                        <option value="month">Последние 30 дней</option>
                    </select>
                </div>
            </div>

            {/* Orders Table */}
            <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6 pb-0">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Заказы ({filteredOrders.length} 
                            {dateFilter !== 'all' && ` - ${dateFilter === 'today' ? 'Сегодня' : dateFilter === 'yesterday' ? 'Вчера' : dateFilter === 'week' ? '7 дней' : '30 дней'}`}
                            {statusFilter !== 'all' && ` - ${statusFilter}`}
                            {searchQuery && ` - Search: "${searchQuery}"`})
                        </h2>
                        {dateFilter !== 'all' && (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setDateFilter('all')}
                                className="text-xs"
                            >
                                Показать все заказы
                            </Button>
                        )}
                    </div>
                </CardContent>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Номер заказа</TableHead>
                                <TableHead>Покупатель</TableHead>
                                <TableHead>Товары</TableHead>
                                <TableHead>Доставка</TableHead>
                                <TableHead>Итого</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead>Дата</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                                            <p className="text-lg font-medium mb-2">
                                                {orders.length === 0 ? 'No orders available' : 'No orders found'}
                                            </p>
                                            <p className="text-sm">
                                                {orders.length === 0 
                                                    ? 'No orders have been placed yet' 
                                                    : `Try adjusting your filters. Currently showing ${dateFilter === 'today' ? 'сегодняшние' : dateFilter === 'yesterday' ? 'вчерашние' : dateFilter === 'week' ? 'за 7 дней' : dateFilter === 'month' ? 'за 30 дней' : 'все'} orders${statusFilter !== 'all' ? ` with status: ${statusFilter}` : ''}`
                                                }
                                            </p>
                                            {dateFilter !== 'all' && (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => setDateFilter('all')}
                                                    className="mt-3"
                                                >
                                                    Show All Orders
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <div className="font-medium">
                                                {order.orderNumber ? `#${order.orderNumber}` : `#${order.id}`}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{order.userName}</p>
                                                <p className="text-sm text-gray-500">{order.userEmail}</p>
                                                {order.contactPhone && (
                                                    <p className="text-sm font-medium text-gray-700 mt-0.5">{order.contactPhone}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {order.items.map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between text-sm">
                                                        <span>{item.productName}</span>
                                                        <span className="text-gray-500">x{item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {(order as any).deliveryType === 'COURIER' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    Курьер
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                    Самовывоз
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {formatPrice((order as any).total || order.totalAmount)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[order.status]}>
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm">
                                                    {(() => {
                                                        const dateField = getOrderDate(order);
                                                        return dateField ? formatDate(dateField) : 'N/A';
                                                    })()}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewClick(order)}
                                                    title="Просмотр деталей"
                                                >
                                                    <EyeIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedOrder(order)}
                                                    title="QR код"
                                                >
                                                    <QrCodeIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditClick(order)}
                                                    title="Редактировать"
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                </Button>
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value as OrderDTO['status'])}
                                                    className="h-8 px-2 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    aria-label="Change order status"
                                                >
                                                    <option value="PENDING">Pending</option>
                                                    <option value="CONFIRMED">Confirmed</option>
                                                    <option value="PREPARING">Preparing</option>
                                                    <option value="READY">Ready</option>
                                                    <option value="PICKED_UP">Picked Up</option>
                                                    <option value="DELIVERED">Delivered</option>
                                                    <option value="CANCELLED">Cancelled</option>
                                                </select>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create Order Modal */}
            <CreateOrderModal
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                onOrderCreated={fetchOrders}
            />

            {/* Order QR Modal */}
            {selectedOrder && (
                <OrderQRModal
                    isOpen={!!selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    order={selectedOrder}
                />
            )}

            {/* QR Scanner Modal */}
            <QROrderDetailsModal
                isOpen={isQRScannerOpen}
                onClose={closeQRScanner}
                onOrderUpdated={fetchOrders}
            />

            {/* Edit Order Modal */}
            {orderToEdit && (
                <EditOrderModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        closeEditModal();
                        setOrderToEdit(null);
                    }}
                    order={orderToEdit}
                    onOrderUpdated={fetchOrders}
                />
            )}

            {/* View Order Details Modal */}
            {orderToView && (
                <OrderDetailsModal
                    order={orderToView}
                    isOpen={isViewModalOpen}
                    onClose={() => {
                        closeViewModal();
                        setOrderToView(null);
                    }}
                />
            )}
            </div>
        </ProtectedRoute>
    );
} 