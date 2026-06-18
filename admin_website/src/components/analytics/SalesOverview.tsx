"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUpIcon,
  EyeIcon,
  MoreHorizontalIcon,
  FilterIcon,
  SearchIcon
} from "lucide-react";

interface SalesOverviewProps {
  salesData: Array<{
    date: string;
    amount: number;
    orders: number;
  }>;
  topStores: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
  }>;
}

export default function SalesOverview({ salesData, topStores }: SalesOverviewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [sortBy, setSortBy] = useState('revenue');

  const periods = [
    { value: 'today', label: 'Сегодня' },
    { value: 'yesterday', label: 'Вчера' },
    { value: 'week', label: 'Эта неделя' },
    { value: 'month', label: 'Этот месяц' }
  ];

  const totalRevenue = salesData.reduce((sum, item) => sum + item.amount, 0);
  const totalOrders = salesData.reduce((sum, item) => sum + item.orders, 0);

  const sortedStores = [...topStores].sort((a, b) => {
    if (sortBy === 'revenue') return b.revenue - a.revenue;
    if (sortBy === 'sales') return b.sales - a.sales;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Sales Summary */}
      <Card className="lg:col-span-2 bg-white dark:bg-gray-800 border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5 text-blue-500" />
              Обзор продаж
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Отслеживайте ежедневные показатели продаж
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {periods.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Общий доход</div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                ${totalRevenue.toLocaleString()}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                +12.5% с прошлого периода
              </div>
            </div>
            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">Всего заказов</div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {totalOrders.toLocaleString()}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                +8.2% с прошлого периода
              </div>
            </div>
            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
              <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Сред. стоимость заказа</div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                +3.8% с прошлого периода
              </div>
            </div>
          </div>

          {/* Recent Sales Activity */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Недавняя активность</h4>
            {salesData.slice(0, 5).map((sale, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {sale.orders} заказов размещено
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {sale.date}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${sale.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Stores */}
      <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <EyeIcon className="h-5 w-5 text-orange-500" />
              Лучшие магазины
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Самые эффективные магазины
            </p>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="revenue">Доход</option>
            <option value="sales">Продажи</option>
            <option value="name">Название</option>
          </select>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedStores.slice(0, 8).map((store, index) => (
              <div key={store.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {store.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {store.sales} продаж
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    ${store.revenue.toLocaleString()}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Топ {index < 3 ? (index + 1) : ''}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
