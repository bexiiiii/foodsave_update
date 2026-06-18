'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/components/ui/use-toast';

interface Product {
    id: number;
    name: string;
    price: number;
    imageUrl: string;
    description: string;
}

interface FavoritesListProps {
    userId: number;
}

export function FavoritesList({ userId }: FavoritesListProps) {
    const [favorites, setFavorites] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchFavorites = async () => {
        try {
            const response = await fetch(`/api/favorites?userId=${userId}`);
            if (!response.ok) throw new Error('Не удалось загрузить избранное');
            const data = await response.json();
            setFavorites(data);
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить избранные товары',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const removeFromFavorites = async (productId: number) => {
        try {
            const response = await fetch(`/api/favorites?userId=${userId}&productId=${productId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Не удалось удалить из избранного');

            setFavorites(favorites.filter(product => product.id !== productId));
            toast({
                title: 'Успех',
                description: 'Продукт удален из избранного',
            });
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: 'Не удалось удалить продукт из избранного',
                variant: 'destructive',
            });
        }
    };

    useEffect(() => {
        fetchFavorites();
    }, [userId]);

    if (loading) {
        return <div>Загрузка избранного...</div>;
    }

    if (favorites.length === 0) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">Нет избранных товаров</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((product) => (
                <Card key={product.id}>
                    <CardHeader className="relative">
                        <div className="aspect-square relative">
                            <Image
                                src={product.imageUrl || '/placeholder.png'}
                                alt={product.name}
                                fill
                                className="object-cover rounded-t-lg"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => removeFromFavorites(product.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">
                            {product.description}
                        </p>
                        <p className="text-lg font-semibold mt-2">
                            ${product.price.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}