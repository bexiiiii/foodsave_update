'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { BASE_URL } from '@/config/api';

interface AddToFavoritesProps {
    userId: number;
    productId: number;
    onSuccess?: () => void;
}

export function AddToFavorites({ userId, productId, onSuccess }: AddToFavoritesProps) {
    const { toast } = useToast();

    const addToFavorites = async () => {
        try {
            const response = await fetch(`${BASE_URL}/favorites`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, productId }),
            });

            if (!response.ok) throw new Error('Не удалось добавить в избранное');

            toast({
                title: 'Успех',
                description: 'Продукт добавлен в избранное',
            });

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: 'Не удалось добавить в избранное',
                variant: 'destructive',
            });
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={addToFavorites}
            className="hover:text-red-500"
        >
            <Heart className="h-4 w-4" />
        </Button>
    );
}