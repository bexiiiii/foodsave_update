"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import Link from 'next/link';
import {
  PieChartIcon,
  BoxIcon,
  BoxCubeIcon,
  DollarLineIcon,
  CalenderIcon
} from '@/icons/index';
import {
  DollarSign as DollarSignIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Calendar as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Clock as ClockIcon
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TodayStats {
  todayOrders: number;
  todayCompletedOrders: number;
  todayCancelledOrders: number;
  todayRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { getAnalytics } = useApi();
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await getAnalytics();
        if (response.data?.data) {
          setStats(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'STORE_MANAGER') {
      fetchStats();
    }
  }, [user, getAnalytics]);

  if (user?.role !== 'STORE_MANAGER') {
    return null;
  }

  const StatCard = ({ title, value, icon: Icon, color, isLoading = false, subtitle }: {
    title: string;
    value: number | string;
    icon: any;
    color: string;
    isLoading?: boolean;
    subtitle?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20 mb-1" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          Панель управления менеджера
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Добро пожаловать, {user.name}! Управляйте операциями вашего магазина отсюда.
        </p>
      </div>

      {/* Today's Statistics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Сегодняшняя производительность
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Заказы сегодня"
            value={stats?.todayOrders || 0}
            icon={CalenderIcon}
            color="text-blue-600"
            isLoading={loading}
            subtitle="Заказы, полученные сегодня"
          />
          <StatCard
            title="Завершенные заказы"
            value={stats?.todayCompletedOrders || 0}
            icon={CheckCircleIcon}
            color="text-green-600"
            isLoading={loading}
            subtitle="Успешно доставленные"
          />
          <StatCard
            title="Отмененные заказы"
            value={stats?.todayCancelledOrders || 0}
            icon={XCircleIcon}
            color="text-red-600"
            isLoading={loading}
            subtitle="Отмененные сегодня"
          />
          <StatCard
            title="Выручка сегодня"
            value={loading ? "..." : `$${(stats?.todayRevenue || 0).toLocaleString()}`}
            icon={DollarSignIcon}
            color="text-green-600"
            isLoading={loading}
            subtitle="Выручка от завершенных заказов"
          />
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Обзор магазина
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Всего заказов"
            value={stats?.totalOrders || 0}
            icon={BoxIcon}
            color="text-blue-600"
            isLoading={loading}
            subtitle="Заказы за все время"
          />
          <StatCard
            title="Всего продуктов"
            value={stats?.totalProducts || 0}
            icon={BoxCubeIcon}
            color="text-purple-600"
            isLoading={loading}
            subtitle="Продукты в каталоге"
          />
          <StatCard
            title="Всего выручки"
            value={loading ? "..." : `$${(stats?.totalRevenue || 0).toLocaleString()}`}
            icon={TrendingUpIcon}
            color="text-green-600"
            isLoading={loading}
            subtitle="Выручка за все время"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Быстрые действия
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/analytics">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Аналитика</CardTitle>
                <PieChartIcon className="h-6 w-6 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">Просмотр аналитики</div>
                <p className="text-xs text-muted-foreground">
                  Отслеживайте продажи и показатели эффективности
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/orders">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Заказы</CardTitle>
                <BoxIcon className="h-6 w-6 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Управление заказами</div>
                <p className="text-xs text-muted-foreground">
                  Просмотр и обработка заказов клиентов
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/products">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Продукты</CardTitle>
                <BoxCubeIcon className="h-6 w-6 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">Управление продуктами</div>
                <p className="text-xs text-muted-foreground">
                  Добавление, редактирование и организация продуктов
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          Доступ менеджера магазина
        </h3>
        <p className="text-yellow-700 dark:text-yellow-300">
          В качестве менеджера магазина вы можете просматривать аналитику и статистику только для вашего магазина.
          Данные, показанные выше, включают в себя сегодняшнюю производительность и общие метрики магазина.
        </p>
      </div>
    </div>
  );
}
