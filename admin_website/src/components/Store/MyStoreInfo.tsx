"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StoreDTO } from '@/types/api';
import { storeApi } from '@/services/api';
import { toast } from 'react-hot-toast';
import { 
  StoreIcon, 
  MapPinIcon, 
  PhoneIcon, 
  MailIcon, 
  ClockIcon,
  TagIcon,
  TrendingUpIcon,
  UsersIcon
} from 'lucide-react';

export const MyStoreInfo: React.FC = () => {
  const [store, setStore] = useState<StoreDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyStore();
  }, []);

  const loadMyStore = async () => {
    try {
      setLoading(true);
      const storeData = await storeApi.getMyStore();
      setStore(storeData);
    } catch (error) {
      console.error('Error loading my store:', error);
      toast.error('Ошибка загрузки данных заведения');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Информация о заведении</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-20 rounded-lg mx-auto" />
            <Skeleton className="h-6 w-3/4 mx-auto" />
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!store) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StoreIcon className="h-5 w-5 text-orange-500" />
            Мое заведение
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <StoreIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">Заведение не найдено</p>
            <p className="text-sm text-gray-400">
              Обратитесь к администратору для привязки к заведению
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StoreIcon className="h-5 w-5 text-orange-500" />
          Мое заведение
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Store Logo and Name */}
        <div className="text-center">
          {store.logo ? (
            <img 
              src={store.logo} 
              alt={store.name}
              className="w-20 h-20 rounded-lg object-cover border mx-auto mb-3"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gray-100 border mx-auto mb-3 flex items-center justify-center">
              <StoreIcon className="h-10 w-10 text-gray-400" />
            </div>
          )}
          <h3 className="text-xl font-semibold">{store.name}</h3>
          {store.description && (
            <p className="text-gray-600 text-sm mt-1">{store.description}</p>
          )}
        </div>

        {/* Store Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm">{store.address}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <PhoneIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm">{store.phone}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <MailIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm">{store.email}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <ClockIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm">
              {store.openingHours} - {store.closingHours}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <TagIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm">{store.category}</span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={store.status === 'ACTIVE' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {store.status}
          </Badge>
          <Badge 
            variant={store.active ? 'default' : 'destructive'}
            className="text-xs"
          >
            {store.active ? 'Активно' : 'Неактивно'}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUpIcon className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Продажи</span>
            </div>
            <p className="text-xs text-gray-500">Сегодня</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <UsersIcon className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Заказы</span>
            </div>
            <p className="text-xs text-gray-500">Активные</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
