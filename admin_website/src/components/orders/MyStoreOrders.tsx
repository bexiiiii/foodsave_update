"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { OrderDTO } from '@/types/api';
import { orderApi } from '@/services/api';
import { useRoleBasedRoutes } from '@/hooks/useRoleBasedRoutes';
import { Permission } from '@/types/permission';
import { toast } from 'react-hot-toast';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  RefreshCwIcon,
  EyeIcon,
  ShoppingCartIcon
} from 'lucide-react';

export const MyStoreOrders: React.FC = () => {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { hasPermission, user } = useRoleBasedRoutes();

  const isStoreUser = user?.role === 'STORE_OWNER' || user?.role === 'MANAGER';

  useEffect(() => {
    if (hasPermission(Permission.ORDER_READ)) {
      fetchOrders();
    }
  }, [hasPermission]);

  const fetchOrders = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Получаем заказы (в будущем можно добавить фильтр по заведению)
      const response = await orderApi.getAll();
      const ordersData = Array.isArray(response) ? response : (response as any)?.content || [];
      
      // Если пользователь - менеджер заведения, показываем только заказы его заведения
      let filteredOrders = ordersData;
      if (isStoreUser) {
        // TODO: Добавить фильтрацию по storeName или storeId
        // Пока показываем все заказы
        filteredOrders = ordersData;
      }
      
      setOrders(filteredOrders.slice(0, 10)); // Показываем последние 10 заказов
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Ошибка загрузки заказов');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchOrders(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
      case 'PICKED_UP':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'CANCELLED':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'PENDING': { variant: 'outline', label: 'В ожидании' },
      'CONFIRMED': { variant: 'secondary', label: 'Подтвержден' },
      'PREPARING': { variant: 'default', label: 'Готовится' },
      'READY': { variant: 'default', label: 'Готов' },
      'PICKED_UP': { variant: 'default', label: 'Забран' },
      'DELIVERED': { variant: 'default', label: 'Доставлен' },
      'CANCELLED': { variant: 'destructive', label: 'Отменен' }
    };

    const statusInfo = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Заказы заведения</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5 text-blue-500" />
            Последние заказы
          </CardTitle>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Обновление...' : 'Обновить'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCartIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">Заказов пока нет</p>
            <p className="text-sm text-gray-400">
              Заказы будут отображаться здесь по мере их поступления
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№ заказа</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>
                    {order.userName || 'Клиент'}
                  </TableCell>
                  <TableCell>
                    {order.totalAmount ? `${order.totalAmount} ₸` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      {getStatusBadge(order.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <EyeIcon className="h-4 w-4 mr-2" />
                      Детали
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
