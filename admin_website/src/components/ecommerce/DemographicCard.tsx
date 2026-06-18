"use client";
import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useApi } from "@/hooks/useApi";

interface DemographicData {
    category: string;
    value: number;
    color: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function DemographicCard() {
    const [data, setData] = useState<DemographicData[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { getAnalytics } = useApi();

    useEffect(() => {
        const fetchDemographics = async () => {
            try {
                const response = await getAnalytics();
                if (response && response.orderStatusDistribution && Array.isArray(response.orderStatusDistribution)) {
                    // Transform the data to match the DemographicData interface
                    const transformedData = response.orderStatusDistribution.map((item, index) => ({
                        category: item.status,
                        value: item.count,
                        color: COLORS[index % COLORS.length]
                    }));
                    setData(transformedData);
                } else {
                    // Set default data if no order status distribution is available
                    setData([
                        { category: 'Завершено', value: 45, color: COLORS[0] },
                        { category: 'В ожидании', value: 25, color: COLORS[1] },
                        { category: 'Отменено', value: 15, color: COLORS[2] },
                        { category: 'В обработке', value: 15, color: COLORS[3] }
                    ]);
                }
            } catch (err) {
                console.error('Ошибка при загрузке демографических данных:', err);
                // Set default data on error
                setData([
                    { category: 'Завершено', value: 45, color: COLORS[0] },
                    { category: 'В ожидании', value: 25, color: COLORS[1] },
                    { category: 'Отменено', value: 15, color: COLORS[2] },
                    { category: 'В обработке', value: 15, color: COLORS[3] }
                ]);
                toast({
                    title: 'Ошибка',
                    description: 'Не удалось загрузить демографические данные',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDemographics();
    }, [getAnalytics]); // toast не нужен в dependencies

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                <div className="h-6 bg-gray-100 rounded w-1/3 animate-pulse mb-4" />
                <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Распределение статусов заказов
            </h3>
            <div className="h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
