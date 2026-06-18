import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET() {
    try {
        // Получаем все необходимые данные параллельно
        const [
            metricsResponse,
            salesResponse,
            ordersResponse,
            targetResponse,
            statisticsResponse,
            demographicResponse
        ] = await Promise.all([
            fetch(`${API_URL}/analytics/metrics`),
            fetch(`${API_URL}/analytics/sales`),
            fetch(`${API_URL}/analytics/recent-orders`),
            fetch(`${API_URL}/analytics/targets`),
            fetch(`${API_URL}/analytics/statistics`),
            fetch(`${API_URL}/analytics/demographics`)
        ]);

        if (!metricsResponse.ok || !salesResponse.ok || !ordersResponse.ok ||
            !targetResponse.ok || !statisticsResponse.ok || !demographicResponse.ok) {
            throw new Error('Failed to fetch dashboard data');
        }

        const [
            metrics,
            sales,
            orders,
            targets,
            statistics,
            demographics
        ] = await Promise.all([
            metricsResponse.json(),
            salesResponse.json(),
            ordersResponse.json(),
            targetResponse.json(),
            statisticsResponse.json(),
            demographicResponse.json()
        ]);

        return NextResponse.json({
            metrics,
            sales,
            orders,
            targets,
            statistics,
            demographics
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
} 