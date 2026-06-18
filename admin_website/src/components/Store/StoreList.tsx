"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { storeApi } from '@/services/api';
import { StoreDTO } from '@/types/api';

const StoreList: React.FC = () => {
    const [stores, setStores] = React.useState<StoreDTO[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchStores = async () => {
            try {
                setLoading(true);
                const response = await storeApi.getAll();
                // Handle PageableResponse by extracting content
                if (response && typeof response === 'object' && 'content' in response) {
                    setStores(response.content);
                } else if (Array.isArray(response)) {
                    setStores(response);
                } else {
                    setStores([]);
                }
            } catch (err: any) {
                console.error('Error fetching stores:', err);
                setError(err.message || 'Не удалось загрузить заведения');
            } finally {
                setLoading(false);
            }
        };
        fetchStores();
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Заведения</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="p-4 border rounded-lg">
                                <Skeleton className="h-48 w-full mb-4" />
                                <Skeleton className="h-4 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Заведения</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-red-500">{error}</div>
                </CardContent>
            </Card>
        );
    }

    if (stores.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Заведения</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-gray-500">Заведения не найдены</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Заведения</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stores.map((store) => (
                        <div key={store.id} className="p-4 border rounded-lg">
                            <div className="relative h-48 w-full mb-4">
                                {store.logo ? (
                                    <Image
                                        src={store.logo}
                                        alt={store.name}
                                        fill
                                        className="object-cover rounded-lg"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                                        <span className="text-gray-400">Нет изображения</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-medium text-lg mb-1">{store.name}</h3>
                                <p className="text-sm text-gray-500 mb-2">{store.description}</p>
                                <div className="flex items-center justify-between mb-2">
                                    <Badge variant={store.active ? 'default' : 'destructive'}>
                                        {store.status}
                                    </Badge>
                                    <div className="flex items-center">
                                        <span className="text-yellow-500 mr-1">★</span>
                                        <span>N/A</span>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                    <p>{store.address}</p>
                                    <p>{store.phone}</p>
                                    <p>{store.email}</p>
                                </div>
                                <div className="mt-2 text-sm">
                                    <p className="font-medium">Часы работы:</p>
                                    <p>{store.openingHours}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default StoreList;