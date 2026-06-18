"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api';
import { format } from 'date-fns';
import { API_ENDPOINTS } from '@/config/api';

interface HealthStatus {
    status: string;
    timestamp: string;
    service: string;
    version: string;
}

interface SystemInfo {
    application: string;
    description: string;
    version: string;
}

export default function SystemHealthPage() {
    const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSystemHealth();
    }, []);

    const fetchSystemHealth = async () => {
        try {
            setLoading(true);
            setError(null);

            const [healthResponse, infoResponse] = await Promise.all([
                api.get(API_ENDPOINTS.HEALTH.BASE),
                api.get('/api/info')
            ]);

            if (healthResponse.data && infoResponse.data) {
                setHealthStatus(healthResponse.data);
                setSystemInfo(infoResponse.data);
            } else {
                throw new Error('Invalid response data');
            }
        } catch (error: any) {
            console.error('Failed to fetch system health:', error);
            setError(error.response?.data?.message || 'Failed to load system health information');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="bg-white dark:bg-gray-800">
                        <CardContent className="p-6">
                            <Skeleton className="h-4 w-1/4 mb-2" />
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-gray-800">
                        <CardContent className="p-6">
                            <Skeleton className="h-4 w-1/4 mb-2" />
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">System Health</h1>
                    <p className="text-red-500">{error}</p>
                    <button 
                        onClick={fetchSystemHealth}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!healthStatus || !systemInfo) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">System Health</h1>
                    <p className="text-gray-500 dark:text-gray-400">No system metrics available</p>
                    <button 
                        onClick={fetchSystemHealth}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">System Health</h1>
                <p className="text-gray-600 dark:text-gray-400">Monitor the health and status of the system</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-white dark:bg-gray-800">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Status</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                <span className={`font-medium ${
                                    healthStatus?.status === 'UP' 
                                        ? 'text-green-600 dark:text-green-500' 
                                        : 'text-red-600 dark:text-red-500'
                                }`}>
                                    {healthStatus?.status}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Service:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {healthStatus?.service}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Version:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {healthStatus?.version}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Last Check:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {healthStatus?.timestamp ? format(new Date(healthStatus.timestamp), 'MMM dd, yyyy HH:mm:ss') : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-800">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Information</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Application:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {systemInfo?.application}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Description:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {systemInfo?.description}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Version:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {systemInfo?.version}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 