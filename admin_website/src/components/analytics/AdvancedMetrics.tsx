"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  DollarSignIcon,
  PercentIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from "lucide-react";

interface MetricItem {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: any;
  color: string;
}

interface AdvancedMetricsProps {
  data: {
    averageOrderValue: number;
    conversionRate: number;
    customerRetention: number;
    monthlyRecurringRevenue: number;
  };
}

export default function AdvancedMetrics({ data }: AdvancedMetricsProps) {
  const metrics: MetricItem[] = [
    {
      title: "Средний чек",
      value: `$${data.averageOrderValue.toFixed(2)}`,
      change: 5.2,
      changeLabel: "по сравнению с прошлым месяцем",
      icon: DollarSignIcon,
      color: "bg-blue-500"
    },
    {
      title: "Коэффициент конверсии",
      value: `${data.conversionRate.toFixed(1)}%`,
      change: -1.3,
      changeLabel: "по сравнению с прошлым месяцем",
      icon: PercentIcon,
      color: "bg-green-500"
    },
    {
      title: "Удержание клиентов",
      value: `${data.customerRetention.toFixed(1)}%`,
      change: 2.8,
      changeLabel: "по сравнению с прошлым месяцем",
      icon: TrendingUpIcon,
      color: "bg-purple-500"
    },
    {
      title: "Ежемесячный регулярный доход",
      value: `$${data.monthlyRecurringRevenue.toLocaleString()}`,
      change: 8.1,
      changeLabel: "по сравнению с прошлым месяцем",
      icon: CalendarIcon,
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card
          key={index}
          className="relative overflow-hidden bg-white dark:bg-gray-800 border-0 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className={`absolute top-0 left-0 w-full h-1 ${metric.color}`} />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {metric.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${metric.color} opacity-10`}>
              <metric.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metric.value}
              </div>
              <div className="flex items-center text-sm">
                {metric.change >= 0 ? (
                  <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={`font-medium ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {Math.abs(metric.change)}%
                </span>
                <span className="text-gray-500 ml-1">{metric.changeLabel}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
