import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { storeApi } from '@/services/api';
import { StoreDTO } from '@/types/api';
import { Store, Package, Clock, MapPin } from 'lucide-react';

interface StoreStatsProps {
  className?: string;
}

export function StoreStats({ className }: StoreStatsProps) {
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await storeApi.getActive();
      setStores(response);
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError('Не удалось загрузить данные магазинов');
    } finally {
      setLoading(false);
    }
  };

  const totalStores = stores.length;
  const totalProducts = stores.reduce((sum, store) => sum + (store.productCount || 0), 0);
  const averageProducts = totalStores > 0 ? Math.round(totalProducts / totalStores) : 0;
  const categoriesCount = new Set(stores.map(store => store.category)).size;

  if (loading) {
    return (
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Всего магазинов</CardTitle>
          <Store className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStores}</div>
          <p className="text-xs text-muted-foreground">
            Активных магазинов
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Всего продуктов</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalProducts}</div>
          <p className="text-xs text-muted-foreground">
            Боксов в системе
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Средние боксы</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageProducts}</div>
          <p className="text-xs text-muted-foreground">
            На магазин
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Категории</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categoriesCount}</div>
          <p className="text-xs text-muted-foreground">
            Типов магазинов
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function StoresList({ className }: StoreStatsProps) {
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await storeApi.getActive();
      setStores(response.slice(0, 6)); // Показываем только первые 6
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError('Не удалось загрузить данные магазинов');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Популярные Боксы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Популярные Боксы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Активные Боксы</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stores.map((store) => (
            <div key={store.id} className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {store.name}
                </p>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {store.category}
                  </Badge>
                  <span>•</span>
                  <span>{store.productCount || 0} боксов</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{store.openingHours} - {store.closingHours}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
