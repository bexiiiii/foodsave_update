"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";

interface ChartDataItem {
    name: string;
    value: number;
}

const StatisticsChart: React.FC = () => {
    const { getAnalytics, loading, error } = useApi();
    const [chartData, setChartData] = React.useState<ChartDataItem[]>([]);

    React.useEffect(() => {
        const fetchData = async () => {
            const response = await getAnalytics();
            if (response) {
                // TODO: Replace with actual data from analytics
                setChartData([
                    { name: 'Jan', value: 65 },
                    { name: 'Feb', value: 59 },
                    { name: 'Mar', value: 80 },
                    { name: 'Apr', value: 81 },
                    { name: 'May', value: 56 },
                    { name: 'Jun', value: 55 },
                ]);
            }
        };
        fetchData();
    }, [getAnalytics]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Статистика</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={cn("h-[300px] w-full bg-gray-200 rounded animate-pulse")} />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Статистика</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-red-500")}>{error}</div>
                </CardContent>
            </Card>
        );
    }

    if (!chartData || chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Статистика</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-gray-500")}>Нет данных</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Статистика</CardTitle>
            </CardHeader>
            <CardContent>
                <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4")}>
                    {chartData.map((item) => (
                        <div key={item.name} className={cn("p-4 bg-gray-50 rounded-lg")}>
                            <div className={cn("text-sm text-gray-500")}>{item.name}</div>
                            <div className={cn("text-2xl font-bold")}>{item.value}%</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default StatisticsChart;
