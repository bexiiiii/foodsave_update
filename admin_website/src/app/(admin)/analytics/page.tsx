"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  ActivityIcon,
  CalendarIcon,
  CreditCardIcon,
  DownloadIcon,
  PackageIcon,
  RefreshCwIcon,
  ShoppingCartIcon,
  StoreIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import LineChartOne from "@/components/charts/line/LineChartOne";
import { StoreOrderStatsTable } from "@/components/stats/StoreOrderStatsTable";
import { OrderStatsCard } from "@/components/stats/OrderStatsCard";
import { AdminOnly } from "@/components/auth/RoleGuard";
import { analyticsApi, orderApi, storeApi } from "@/services/api";
import {
  AnalyticsData,
  DailySalesAnalytics,
  DailySalesOrderDetail,
  DailySalesOrderItem,
  OrderStatsDTO,
  StoreDTO,
} from "@/types/api";
import { Permission } from "@/types/permission";
import { useRoleBasedRoutes } from "@/hooks/useRoleBasedRoutes";
import { useAuth } from "@/hooks/useAuth";

const defaultAnalyticsData: AnalyticsData = {
  totalSales: 0,
  totalOrders: 0,
  totalProducts: 0,
  totalUsers: 0,
  totalStores: 0,
  totalRevenue: 0,
  revenue: 0,
  salesByDay: [],
  salesByMonth: [],
  topProducts: [],
  topStores: [],
  topCategories: [],
  orderStatusDistribution: [],
  paymentMethodDistribution: [],
};

const formatInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRangeDates = (range: string) => {
  const end = new Date();
  const start = new Date();

  if (range === "7d") start.setDate(end.getDate() - 6);
  if (range === "30d") start.setDate(end.getDate() - 29);
  if (range === "90d") start.setDate(end.getDate() - 89);
  if (range === "1y") start.setFullYear(end.getFullYear() - 1);

  return {
    startDate: formatInputDate(start),
    endDate: formatInputDate(end),
  };
};

const formatCurrency = (amount?: number) =>
  new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ru-KZ");
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("ru-KZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const textValue = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

type MetricCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

const MetricCard = ({ title, value, subtitle, icon: Icon, color }: MetricCardProps) => (
  <Card className="border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
      <CardTitle className="text-sm font-medium leading-5 text-gray-600 dark:text-gray-400">
        {title}
      </CardTitle>
      <div className={`shrink-0 rounded-md p-2 ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-semibold text-gray-950 dark:text-white">{value}</div>
      {subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
    </CardContent>
  </Card>
);

type ItemRow = {
  order: DailySalesOrderDetail;
  item: DailySalesOrderItem | null;
  itemIndex: number;
};

type CategoryRow = {
  name: string;
  sales: number;
  revenue: number;
  share: number;
};

export default function AnalyticsPage() {
  const initialRange = getRangeDates("30d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  const [storesLoading, setStoresLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("30d");
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [selectedStoreId, setSelectedStoreId] = useState("all");
  const [availableStores, setAvailableStores] = useState<{ id: number; name: string }[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(defaultAnalyticsData);
  const [orderStats, setOrderStats] = useState<OrderStatsDTO | null>(null);
  const [dailySalesAnalytics, setDailySalesAnalytics] = useState<DailySalesAnalytics[]>([]);
  const [dailySalesOrderDetails, setDailySalesOrderDetails] = useState<DailySalesOrderDetail[]>([]);

  const { toast } = useToast();
  const { hasPermission } = useRoleBasedRoutes();
  const { user } = useAuth();

  const normalizeStores = (payload: StoreDTO[] | { content?: StoreDTO[] }) => {
    const stores = Array.isArray(payload) ? payload : payload?.content || [];
    return stores.map((store) => ({ id: store.id, name: store.name }));
  };

  const resolveStoreParam = useCallback(
    (storeId = selectedStoreId) => {
      if (storeId === "all") return undefined;
      const parsed = Number(storeId);
      return Number.isFinite(parsed) ? parsed : undefined;
    },
    [selectedStoreId]
  );

  const fetchStores = useCallback(async () => {
    setStoresLoading(true);
    try {
      const stores = normalizeStores(await storeApi.getAll());
      setAvailableStores(stores);
      if (user?.role === "STORE_MANAGER" && stores.length > 0) {
        setSelectedStoreId(String(stores[0].id));
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список заведений",
        variant: "destructive",
      });
    } finally {
      setStoresLoading(false);
    }
  }, [toast, user?.role]);

  const fetchAnalytics = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const response = await analyticsApi.getGeneral();
      setAnalyticsData({
        ...defaultAnalyticsData,
        ...response,
        salesByDay: response.salesByDay || [],
        salesByMonth: response.salesByMonth || [],
        topProducts: response.topProducts || [],
        topStores: response.topStores || [],
        topCategories: response.topCategories || [],
        orderStatusDistribution: response.orderStatusDistribution || [],
        paymentMethodDistribution: response.paymentMethodDistribution || [],
      });

      if (hasPermission(Permission.ANALYTICS_READ)) {
        setOrderStats(await orderApi.getStats());
      } else if (hasPermission(Permission.ORDER_READ)) {
        setOrderStats(await orderApi.getMyStoreStats());
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить аналитику",
        variant: "destructive",
      });
      setAnalyticsData(defaultAnalyticsData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasPermission, toast]);

  const fetchDailySalesAnalytics = useCallback(async (override?: {
    nextStartDate?: string;
    nextEndDate?: string;
    nextStoreId?: string;
  }) => {
    const params = {
      startDate: override?.nextStartDate || startDate,
      endDate: override?.nextEndDate || endDate,
      storeId: resolveStoreParam(override?.nextStoreId || selectedStoreId),
    };

    setSalesLoading(true);
    try {
      const [summary, details] = await Promise.all([
        analyticsApi.getDailySales(params),
        analyticsApi.getDailySalesOrderDetails(params),
      ]);
      setDailySalesAnalytics(summary);
      setDailySalesOrderDetails(details);
    } catch (error) {
      console.error("Error fetching daily sales analytics:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить ежедневные продажи",
        variant: "destructive",
      });
    } finally {
      setSalesLoading(false);
    }
  }, [endDate, resolveStoreParam, selectedStoreId, startDate, toast]);

  useEffect(() => {
    fetchAnalytics();
    fetchStores();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!storesLoading) {
      fetchDailySalesAnalytics();
    }
  }, [storesLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSalesStats = useMemo(() => {
    return dailySalesAnalytics.reduce(
      (acc, item) => {
        acc.totalOrders += numberValue(item.totalOrders);
        acc.completedOrders += numberValue(item.completedOrders);
        acc.canceledOrders += numberValue(item.canceledOrders);
        acc.totalRevenue += numberValue(item.totalRevenue);
        acc.completedRevenue += numberValue(item.completedRevenue);
        acc.canceledRevenue += numberValue(item.canceledRevenue);
        return acc;
      },
      {
        totalOrders: 0,
        completedOrders: 0,
        canceledOrders: 0,
        totalRevenue: 0,
        completedRevenue: 0,
        canceledRevenue: 0,
      }
    );
  }, [dailySalesAnalytics]);

  const itemRows = useMemo<ItemRow[]>(() => {
    return dailySalesOrderDetails.flatMap<ItemRow>((order) => {
      if (!order.items || order.items.length === 0) {
        return [{ order, item: null, itemIndex: 1 }];
      }
      return order.items.map((item, index) => ({ order, item, itemIndex: index + 1 }));
    });
  }, [dailySalesOrderDetails]);

  const categoryRows = useMemo<CategoryRow[]>(() => {
    const categories = analyticsData.topCategories || [];
    const totalRevenue = categories.reduce((sum, item) => sum + numberValue(item.revenue), 0);

    return categories.slice(0, 6).map((item) => ({
      name: item.name || "Без категории",
      sales: numberValue(item.sales),
      revenue: numberValue(item.revenue),
      share: totalRevenue > 0 ? (numberValue(item.revenue) / totalRevenue) * 100 : 0,
    }));
  }, [analyticsData.topCategories]);

  const successRate = orderStats && orderStats.totalOrders > 0
    ? (orderStats.successfulOrders / orderStats.totalOrders) * 100
    : 0;
  const cancelledRate = orderStats && orderStats.totalOrders > 0
    ? (orderStats.cancelledOrders / orderStats.totalOrders) * 100
    : 0;
  const averageOrderValue = totalSalesStats.totalOrders > 0
    ? totalSalesStats.totalRevenue / totalSalesStats.totalOrders
    : numberValue(analyticsData.totalRevenue || analyticsData.revenue) / Math.max(numberValue(analyticsData.totalOrders), 1);

  const handleRangeChange = (range: string) => {
    const next = getRangeDates(range);
    setTimeRange(range);
    setStartDate(next.startDate);
    setEndDate(next.endDate);
    fetchDailySalesAnalytics({ nextStartDate: next.startDate, nextEndDate: next.endDate });
  };

  const handleRefresh = () => {
    fetchAnalytics(true);
    fetchDailySalesAnalytics();
  };

  const exportToExcel = () => {
    if (dailySalesAnalytics.length === 0 && itemRows.length === 0) {
      toast({
        title: "Нет данных",
        description: "Сначала загрузите отчет по продажам.",
        variant: "destructive",
      });
      return;
    }

    const workbook = XLSX.utils.book_new();
    const selectedStoreName = selectedStoreId === "all"
      ? "Все заведения"
      : availableStores.find((store) => String(store.id) === selectedStoreId)?.name || "Заведение";

    const detailRows = [
      [
        "Дата и время",
        "Дата",
        "ID покупателя",
        "Имя покупателя",
        "Телефон пользователя",
        "Контактный телефон заказа",
        "Telegram ID",
        "Telegram username",
        "Код заказа",
        "Сводка заказа",
        "Статус заказа",
        "ID заведения",
        "Название заведения",
        "Адрес заведения",
        "Адрес заказа",
        "Сводка адреса",
        "Номер позиции",
        "ID бокса/позиции",
        "Название бокса/позиции",
        "Описание бокса/позиции",
        "Сводка позиции",
        "Количество",
        "Цена за единицу",
        "Сумма позиции",
        "Сумма заказа",
      ],
      ...itemRows.map(({ order, item, itemIndex }) => [
        formatDateTime(order.orderCreatedAt),
        formatDate(order.orderDate),
        textValue(order.buyerId),
        textValue(order.buyerName),
        textValue(order.buyerPhone),
        textValue(order.contactPhone),
        textValue(order.buyerTelegramUserId),
        order.buyerTelegramUsername ? `@${order.buyerTelegramUsername.replace(/^@/, "")}` : "-",
        textValue(order.orderNumber),
        textValue(order.orderSummary),
        textValue(order.orderStatus),
        textValue(order.storeId),
        textValue(order.storeName),
        textValue(order.storeAddress),
        textValue(order.deliveryAddress),
        textValue(order.addressSummary),
        itemIndex,
        textValue(item?.productId),
        textValue(item?.productName),
        textValue(item?.productDescription),
        textValue(item?.itemSummary),
        numberValue(item?.quantity),
        numberValue(item?.unitPrice),
        numberValue(item?.totalPrice),
        numberValue(order.orderTotal),
      ]),
    ];

    const summaryRows = [
      ["Дата", "Заведение", "Всего заказов", "Завершенные", "Отмененные", "Общий доход", "Доход завершенных", "Убыток отмененных"],
      ...dailySalesAnalytics.map((item) => [
        formatDate(item.date),
        item.storeName,
        item.totalOrders,
        item.completedOrders,
        item.canceledOrders,
        item.totalRevenue,
        item.completedRevenue,
        item.canceledRevenue,
      ]),
      [],
      ["Сводка"],
      ["Период", `${startDate} — ${endDate}`],
      ["Фильтр заведений", selectedStoreName],
      ["Всего заказов", totalSalesStats.totalOrders],
      ["Завершенные", totalSalesStats.completedOrders],
      ["Отмененные", totalSalesStats.canceledOrders],
      ["Общий доход", totalSalesStats.totalRevenue],
      ["Дата экспорта", new Date().toLocaleString("ru-KZ")],
    ];

    const detailsSheet = XLSX.utils.aoa_to_sheet(detailRows);
    detailsSheet["!cols"] = [
      { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 20 },
      { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 24 },
      { wch: 34 }, { wch: 34 }, { wch: 34 }, { wch: 12 }, { wch: 16 }, { wch: 28 },
      { wch: 44 }, { wch: 52 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(workbook, detailsSheet, "Grant order details");

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet["!cols"] = [
      { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 16 }, { wch: 18 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Daily summary");

    const safeStoreName = selectedStoreName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]+/g, "_");
    const fileName = `FoodSave_grant_sales_${safeStoreName}_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast({
      title: "Экспорт готов",
      description: `Файл ${fileName} сформирован.`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950 sm:p-6">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-32 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "STORE_MANAGER", "STORE_OWNER"]}>
      <div className="min-w-0 bg-gray-50 dark:bg-gray-950">
        <div className="w-full min-w-0 space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">
                Аналитика
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Реальные продажи, заказы, заведения и грантовый отчет по каждой позиции бокса.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRefresh} disabled={refreshing || salesLoading} className="gap-2">
                <RefreshCwIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Обновить
              </Button>
              <Button onClick={exportToExcel} variant="outline" className="gap-2">
                <DownloadIcon className="h-4 w-4" />
                Экспорт Excel
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Период:</span>
            {[
              { value: "7d", label: "7 дней" },
              { value: "30d", label: "30 дней" },
              { value: "90d", label: "90 дней" },
              { value: "1y", label: "1 год" },
            ].map((option) => (
              <Button
                key={option.value}
                variant={timeRange === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleRangeChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="Общий доход"
              value={formatCurrency(numberValue(analyticsData.totalRevenue || analyticsData.revenue))}
              subtitle="По доступным заведениям"
              icon={TrendingUpIcon}
              color="bg-green-600"
            />
            <MetricCard
              title="Всего заказов"
              value={numberValue(analyticsData.totalOrders).toLocaleString("ru-KZ")}
              icon={ShoppingCartIcon}
              color="bg-blue-600"
            />
            <MetricCard
              title="Средний чек"
              value={formatCurrency(averageOrderValue)}
              subtitle="По текущему отчету"
              icon={CreditCardIcon}
              color="bg-indigo-600"
            />
            <MetricCard
              title="Пользователи"
              value={numberValue(analyticsData.totalUsers).toLocaleString("ru-KZ")}
              icon={UsersIcon}
              color="bg-violet-600"
            />
            <MetricCard
              title="Заведения"
              value={numberValue(analyticsData.totalStores).toLocaleString("ru-KZ")}
              icon={StoreIcon}
              color="bg-orange-600"
            />
          </div>

          {orderStats && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <OrderStatsCard
                title="Статистика заказов"
                totalOrders={orderStats.totalOrders}
                successfulOrders={orderStats.successfulOrders}
                failedOrders={orderStats.failedOrders}
                pendingOrders={orderStats.pendingOrders}
                icon={<ShoppingCartIcon className="h-4 w-4" />}
              />
              <MetricCard
                title="Успешность"
                value={`${successRate.toFixed(1)}%`}
                subtitle={`${orderStats.successfulOrders} успешных из ${orderStats.totalOrders}`}
                icon={ActivityIcon}
                color="bg-emerald-600"
              />
              <MetricCard
                title="Отмены"
                value={`${cancelledRate.toFixed(1)}%`}
                subtitle={`${orderStats.cancelledOrders} отмененных заказов`}
                icon={ActivityIcon}
                color="bg-red-600"
              />
            </div>
          )}

          {hasPermission(Permission.ANALYTICS_READ) && (
            <AdminOnly>
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-950 dark:text-white">
                  Эффективность заведений
                </h2>
                <StoreOrderStatsTable />
              </section>
            </AdminOnly>
          )}

          <div className="grid gap-4 xl:grid-cols-7">
            <Card className="border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 xl:col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUpIcon className="h-5 w-5 text-blue-600" />
                  Динамика продаж
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <LineChartOne
                    data={(analyticsData.salesByMonth || []).map((item) => ({
                      month: item.month,
                      amount: numberValue(item.amount),
                      orders: numberValue(item.orders),
                    }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 xl:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ActivityIcon className="h-5 w-5 text-violet-600" />
                  Топ категории
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryRows.length > 0 ? (
                  categoryRows.map((category, index) => (
                    <div
                      key={category.name}
                      className="space-y-2 rounded-md border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
                            #{index + 1}
                          </div>
                          <div className="break-words text-sm font-semibold leading-5 text-gray-950 dark:text-white">
                            {category.name}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {category.sales.toLocaleString("ru-KZ")} продаж
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold text-gray-950 dark:text-white">
                            {formatCurrency(category.revenue)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {category.share.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-violet-600"
                          style={{ width: `${Math.max(4, Math.min(100, category.share))}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-gray-200 text-sm text-gray-500 dark:border-gray-800">
                    Нет данных по категориям
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PackageIcon className="h-5 w-5 text-green-600" />
                  Топ боксы
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(analyticsData.topProducts || []).slice(0, 6).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 p-3 dark:bg-gray-800">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-950 dark:text-white">
                        {index + 1}. {product.name}
                      </div>
                      <div className="text-xs text-gray-500">{product.sales} продаж</div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-green-700 dark:text-green-400">
                      {formatCurrency(numberValue(product.revenue))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ActivityIcon className="h-5 w-5 text-orange-600" />
                  Статусы заказов
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(analyticsData.orderStatusDistribution || []).map((status) => (
                  <div key={status.status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{status.status}</span>
                      <span className="font-medium">{status.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800">
                      <div
                        className="h-2 rounded-full bg-orange-500"
                        style={{ width: `${Math.min(100, numberValue(status.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCardIcon className="h-5 w-5 text-indigo-600" />
                  Способы оплаты
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(analyticsData.paymentMethodDistribution || []).map((method) => (
                  <div key={method.method} className="flex items-center justify-between rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-800">
                    <span>{method.method}</span>
                    <span className="font-semibold">
                      {method.count} · {numberValue(method.percentage).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <section className="space-y-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950 dark:text-white">
                  Ежедневные продажи по магазинам
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Для гранта: дата, покупатель, Telegram, телефон, код заказа, заведение, адрес и каждая позиция бокса отдельно.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1">
                  <Label htmlFor="startDate">Дата начала</Label>
                  <Input id="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endDate">Дата окончания</Label>
                  <Input id="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="storeSelect">Заведение</Label>
                  <select
                    id="storeSelect"
                    value={selectedStoreId}
                    onChange={(event) => setSelectedStoreId(event.target.value)}
                    disabled={storesLoading || user?.role === "STORE_MANAGER"}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    {user?.role !== "STORE_MANAGER" && <option value="all">Все заведения</option>}
                    {availableStores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={() => fetchDailySalesAnalytics()} disabled={salesLoading || storesLoading} className="gap-2 lg:mt-6">
                  <RefreshCwIcon className={`h-4 w-4 ${salesLoading ? "animate-spin" : ""}`} />
                  Загрузить
                </Button>
                <Button onClick={exportToExcel} variant="outline" disabled={salesLoading} className="gap-2 lg:mt-6">
                  <DownloadIcon className="h-4 w-4" />
                  Excel
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard
                title="Заказов в отчете"
                value={totalSalesStats.totalOrders.toLocaleString("ru-KZ")}
                subtitle={`Завершенные: ${totalSalesStats.completedOrders}, отмененные: ${totalSalesStats.canceledOrders}`}
                icon={ShoppingCartIcon}
                color="bg-blue-600"
              />
              <MetricCard
                title="Доход в отчете"
                value={formatCurrency(totalSalesStats.totalRevenue)}
                icon={TrendingUpIcon}
                color="bg-green-600"
              />
              <MetricCard
                title="Позиции в отчете"
                value={itemRows.length.toLocaleString("ru-KZ")}
                subtitle="Каждая позиция бокса отдельной строкой"
                icon={PackageIcon}
                color="bg-violet-600"
              />
            </div>

            <Card className="min-w-0 border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <CardHeader>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                    Детализация заказов и позиций
                  </CardTitle>
                  <Badge variant="outline">{itemRows.length.toLocaleString("ru-KZ")} строк</Badge>
                </div>
              </CardHeader>
              <CardContent className="min-w-0">
                <div className="max-w-full overflow-x-auto rounded-md border border-gray-100 dark:border-gray-800">
                  <Table className="min-w-[1080px] table-fixed">
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800/60">
                        <TableHead className="w-[190px]">Заказ</TableHead>
                        <TableHead className="w-[260px]">Покупатель</TableHead>
                        <TableHead className="w-[260px]">Заведение и адрес</TableHead>
                        <TableHead className="w-[300px]">Позиция бокса</TableHead>
                        <TableHead className="w-[120px] text-right">Финансы</TableHead>
                        <TableHead className="w-[110px]">Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                            Загрузка продаж...
                          </TableCell>
                        </TableRow>
                      ) : itemRows.length > 0 ? (
                        itemRows.map(({ order, item, itemIndex }) => (
                          <TableRow key={`${order.orderId}-${item?.productId || "empty"}-${itemIndex}`}>
                            <TableCell className="align-top">
                              <div className="space-y-1">
                                <div className="font-semibold text-gray-950 dark:text-white">{textValue(order.orderNumber)}</div>
                                <div className="text-xs text-gray-500">{formatDateTime(order.orderCreatedAt)}</div>
                                <div className="text-xs text-gray-500">ID заказа: {textValue(order.orderId)}</div>
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              <div className="space-y-1 text-sm">
                                <div className="font-medium text-gray-950 dark:text-white">{textValue(order.buyerName)}</div>
                                <div className="break-words text-xs text-gray-500">{textValue(order.buyerSummary)}</div>
                                <div className="break-words text-xs text-blue-600 dark:text-blue-400">{textValue(order.telegramSummary)}</div>
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              <div className="space-y-1 text-sm">
                                <div className="font-medium text-gray-950 dark:text-white">{textValue(order.storeSummary || order.storeName)}</div>
                                <div className="break-words text-xs text-gray-500">{textValue(order.addressSummary || order.storeAddress || order.deliveryAddress)}</div>
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              <div className="space-y-1 text-sm">
                                <div className="font-medium text-gray-950 dark:text-white">
                                  {itemIndex}. {textValue(item?.productName)}
                                </div>
                                <div className="break-words text-xs text-gray-500">{textValue(item?.itemSummary || item?.productDescription)}</div>
                              </div>
                            </TableCell>
                            <TableCell className="align-top text-right">
                              <div className="space-y-1 text-sm">
                                <div className="font-semibold text-gray-950 dark:text-white">{formatCurrency(numberValue(item?.totalPrice))}</div>
                                <div className="text-xs text-gray-500">
                                  {numberValue(item?.quantity)} x {formatCurrency(numberValue(item?.unitPrice))}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              <Badge variant="outline">{textValue(order.orderStatus)}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                            За выбранный период данных нет.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
