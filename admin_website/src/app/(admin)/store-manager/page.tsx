"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { OrderStatsCard } from '@/components/stats/OrderStatsCard';
import { OrderStatsDTO } from '@/types/api';
import { orderApi } from '@/services/api';
import { toast } from 'react-hot-toast';
import { useRoleBasedRoutes } from '@/hooks/useRoleBasedRoutes';
import { Permission } from '@/types/permission';
import { 
  ShoppingCartIcon, 
  TrendingUpIcon, 
  ActivityIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
  StoreIcon,
  BarChart3Icon
} from 'lucide-react';

export default function StoreManagerDashboard() {
  const [orderStats, setOrderStats] = useState<OrderStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { hasPermission, user } = useRoleBasedRoutes();

  useEffect(() => {
    if (hasPermission(Permission.ORDER_READ)) {
      fetchStoreStats();
    }
  }, [hasPermission]);

  const fetchStoreStats = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const stats = await orderApi.getMyStoreStats();
      setOrderStats(stats);
    } catch (error) {
      console.error('Error fetching store stats:', error);
      toast.error('Ошибка загрузки статистики заведения');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchStoreStats(true);
  };

  if (!hasPermission(Permission.ORDER_READ)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Доступ запрещен
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            У вас нет прав для просмотра статистики заказов
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const successRate = orderStats && orderStats.totalOrders > 0 
    ? ((orderStats.successfulOrders / orderStats.totalOrders) * 100).toFixed(1)
    : '0';

  const activeOrders = orderStats
    ? orderStats.pendingOrders + orderStats.confirmedOrders + orderStats.preparingOrders + orderStats.readyOrders
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <StoreIcon className="h-6 w-6 text-blue-500" />
            Панель управления заведением
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Статистика заказов вашего заведения
          </p>
          {user && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {user.role} • ID: {user.id}
              </Badge>
            </div>
          )}
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCwIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {orderStats ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Всего заказов
                </CardTitle>
                <ShoppingCartIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {orderStats.totalOrders}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  Успешность
                </CardTitle>
                <TrendingUpIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {successRate}%
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {orderStats.successfulOrders} из {orderStats.totalOrders}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                  Активные заказы
                </CardTitle>
                <ActivityIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {activeOrders}
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Требуют внимания
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
                  Отменено
                </CardTitle>
                <XCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {orderStats.failedOrders}
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Отмененные заказы
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Order Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrderStatsCard
              title="Детальная статистика заказов"
              totalOrders={orderStats.totalOrders}
              successfulOrders={orderStats.successfulOrders}
              failedOrders={orderStats.failedOrders}
              pendingOrders={orderStats.pendingOrders}
              icon={<BarChart3Icon className="h-4 w-4" />}
            />

            {/* Order Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-blue-500" />
                  Статусы заказов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">В ожидании</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      {orderStats.pendingOrders}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Подтверждены</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {orderStats.confirmedOrders}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Готовятся</span>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {orderStats.preparingOrders}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Готовы</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {orderStats.readyOrders}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Забраны</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {orderStats.pickedUpOrders}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Доставлены</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {orderStats.deliveredOrders}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <ShoppingCartIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Нет данных о заказах
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            В вашем заведении пока нет заказов для отображения статистики
          </p>
        </div>
      )}
    </div>
  );
}
