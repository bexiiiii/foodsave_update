"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MyStoreInfo } from '@/components/Store/MyStoreInfo';
import { OrderStatsCard } from '@/components/stats/OrderStatsCard';
import { MyStoreOrders } from '@/components/orders/MyStoreOrders';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { useRoleBasedRoutes } from '@/hooks/useRoleBasedRoutes';
import { Permission } from '@/types/permission';
import { OrderStatsDTO, OrderDTO, StoreDTO } from '@/types/api';
import { orderApi, storeApi } from '@/services/api';
import { toast } from 'react-hot-toast';
import { 
  RefreshCwIcon,
  TrendingUpIcon,
  ShoppingCartIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  BarChart3Icon
} from 'lucide-react';

export default function MyStoreDashboard() {
  const [orderStats, setOrderStats] = useState<OrderStatsDTO | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderDTO[]>([]);
  const [myStore, setMyStore] = useState<StoreDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { hasPermission, user } = useRoleBasedRoutes();

  useEffect(() => {
    if (hasPermission(Permission.ORDER_READ)) {
      fetchDashboardData();
    }
  }, [hasPermission]);

  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const [statsResponse, storeResponse] = await Promise.all([
        orderApi.getMyStoreStats(),
        storeApi.getMyStore()
      ]);
      
      setOrderStats(statsResponse);
      setMyStore(storeResponse);
      
      // TODO: Добавить загрузку последних заказов заведения
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Ошибка загрузки данных дашборда');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
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
            У вас нет прав для просмотра данных заведения
          </p>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { title: "Мое заведение", href: "/my-store-dashboard" }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Мое заведение
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const successRate = orderStats && orderStats.totalOrders > 0 
    ? ((orderStats.successfulOrders / orderStats.totalOrders) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Мое заведение
          </h1>
        </div>
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

      {/* Приветствие */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Добро пожаловать, {user?.firstName}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Управляйте своим заведением {myStore?.name && `"${myStore.name}"`} эффективно
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Информация о заведении */}
        <div className="lg:col-span-1">
          <MyStoreInfo />
        </div>

        {/* Статистика */}
        <div className="lg:col-span-2 space-y-6">
          {/* Краткие метрики */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <ShoppingCartIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {orderStats?.totalOrders || 0}
                  </div>
                  <p className="text-xs text-gray-500">Всего заказов</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {orderStats?.successfulOrders || 0}
                  </div>
                  <p className="text-xs text-gray-500">Успешных</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <ClockIcon className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {orderStats?.pendingOrders || 0}
                  </div>
                  <p className="text-xs text-gray-500">В ожидании</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingUpIcon className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {successRate}%
                  </div>
                  <p className="text-xs text-gray-500">Успешность</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Детальная статистика */}
          {orderStats && (
            <OrderStatsCard
              title="Детальная статистика заказов"
              totalOrders={orderStats.totalOrders}
              successfulOrders={orderStats.successfulOrders}
              failedOrders={orderStats.failedOrders}
              pendingOrders={orderStats.pendingOrders}
              icon={<BarChart3Icon className="h-4 w-4" />}
            />
          )}
        </div>
      </div>

      {/* Статусы заказов */}
      {orderStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircleIcon className="h-5 w-5 text-blue-500" />
              Разбивка по статусам заказов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold">{orderStats.pendingOrders}</div>
                <Badge variant="outline" className="text-xs">В ожидании</Badge>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{orderStats.confirmedOrders}</div>
                <Badge variant="outline" className="text-xs">Подтверждены</Badge>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{orderStats.preparingOrders}</div>
                <Badge variant="outline" className="text-xs">Готовятся</Badge>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{orderStats.readyOrders}</div>
                <Badge variant="outline" className="text-xs">Готовы</Badge>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{orderStats.deliveredOrders}</div>
                <Badge variant="outline" className="text-xs">Доставлены</Badge>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{orderStats.cancelledOrders}</div>
                <Badge variant="outline" className="text-xs">Отменены</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Последние заказы */}
      <MyStoreOrders />
    </div>
  );
}
