"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StoreUsersDisplay } from '@/components/Store/StoreUsersDisplay';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { storeApi } from '@/services/api';
import { StoreDTO } from '@/types/api';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeftIcon, 
  StoreIcon, 
  MapPinIcon, 
  PhoneIcon, 
  MailIcon, 
  ClockIcon,
  TagIcon,
  EditIcon
} from 'lucide-react';

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  
  const [store, setStore] = useState<StoreDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      loadStore();
    }
  }, [storeId]);

  const loadStore = async () => {
    try {
      setLoading(true);
      const storeData = await storeApi.getById(parseInt(storeId));
      setStore(storeData);
    } catch (error) {
      console.error('Error loading store:', error);
      toast.error('Ошибка загрузки заведения');
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbItems = [
    { title: "Заведения", href: "/stores" },
    { title: store?.name || "Детали заведения", href: `/stores/${storeId}` }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Загрузка..." />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Заведение не найдено" />
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Заведение с указанным ID не найдено</p>
            <Button 
              onClick={() => router.push('/stores')} 
              className="mt-4"
            >
              Вернуться к списку заведений
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageBreadcrumb pageTitle={store.name} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/stores')}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Назад
          </Button>
          <Button
            onClick={() => router.push(`/stores/${storeId}/edit`)}
          >
            <EditIcon className="h-4 w-4 mr-2" />
            Редактировать
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StoreIcon className="h-5 w-5 text-blue-500" />
              Информация о заведении
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Store Logo */}
            {store.logo && (
              <div className="flex justify-center">
                <img 
                  src={store.logo} 
                  alt={store.name}
                  className="w-24 h-24 rounded-lg object-cover border"
                />
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{store.name}</h3>
                <p className="text-gray-600">{store.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{store.address}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <PhoneIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{store.phone}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <MailIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{store.email}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {store.openingHours} - {store.closingHours}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <TagIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{store.category}</span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Статус:</span>
                <Badge 
                  variant={store.status === 'ACTIVE' ? 'default' : 'secondary'}
                >
                  {store.status}
                </Badge>
                <Badge 
                  variant={store.active ? 'default' : 'destructive'}
                >
                  {store.active ? 'Активно' : 'Неактивно'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Store Users */}
        <StoreUsersDisplay storeId={parseInt(storeId)} />
      </div>
    </div>
  );
}
