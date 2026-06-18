"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import LineChartOne from '@/components/charts/line/LineChartOne';
import BarChartOne from '@/components/charts/bar/BarChartOne';
import { systemApi } from '@/services/api';

interface SystemMetrics {
  cpu: {
    current: number;
    history: { time: string; usage: number }[];
  };
  memory: {
    current: number;
    total: number;
    used: number;
    history: { time: string; usage: number }[];
  };
  disk: {
    current: number;
    total: number;
    used: number;
    categories: { name: string; usage: number }[];
  };
  network: {
    in: number;
    out: number;
    history: { time: string; in: number; out: number }[];
  };
}

export default function HealthPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await systemApi.getMetrics();
        setMetrics(response.data);
      } catch (error) {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить метрики системы',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 300000); // Обновляем каждые 5 минут

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Нет доступных метрик системы
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">Состояние системы</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Использование ЦП</CardTitle>
            <Badge variant={metrics.cpu.current > 80 ? "destructive" : "default"}>
              {metrics.cpu.current}%
            </Badge>
          </CardHeader>
          <CardContent>
            <Progress value={metrics.cpu.current} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">Среднее: {metrics.cpu.current}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Использование памяти</CardTitle>
            <Badge variant={metrics.memory.current > 80 ? "destructive" : "default"}>
              {metrics.memory.current}%
            </Badge>
          </CardHeader>
          <CardContent>
            <Progress value={metrics.memory.current} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">
              {metrics.memory.used}ГБ / {metrics.memory.total}ГБ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Использование диска</CardTitle>
            <Badge variant={metrics.disk.current > 80 ? "destructive" : "default"}>
              {metrics.disk.current}%
            </Badge>
          </CardHeader>
          <CardContent>
            <Progress value={metrics.disk.current} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">
              {metrics.disk.used}ГБ / {metrics.disk.total}ГБ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сетевой трафик</CardTitle>
            <Badge variant="default">Активен</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <p>Вх: {metrics.network.in} МБ/с</p>
              <p>Исх: {metrics.network.out} МБ/с</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Использование ЦП со временем</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartOne
              data={metrics.cpu.history.map(item => ({
                month: item.time,
                amount: item.usage,
                orders: 0
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Использование памяти со временем</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartOne
              data={metrics.memory.history.map(item => ({
                month: item.time,
                amount: item.usage,
                orders: 0
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Использование диска по категориям</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartOne
              data={metrics.disk.categories.map(item => ({
                name: item.name,
                value: item.usage
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сетевой трафик</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartOne
              data={metrics.network.history.map(item => ({
                month: item.time,
                amount: item.in,
                orders: item.out
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}