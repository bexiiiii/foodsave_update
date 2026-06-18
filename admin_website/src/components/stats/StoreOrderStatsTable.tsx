import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StoreOrderStatsDTO } from '@/types/api';
import { orderApi } from '@/services/api';
import { toast } from 'react-hot-toast';

export const StoreOrderStatsTable: React.FC = () => {
  const [storeStats, setStoreStats] = useState<StoreOrderStatsDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoreStats();
  }, []);

  const fetchStoreStats = async () => {
    try {
      setLoading(true);
      const data = await orderApi.getStatsByStore();
      setStoreStats(data);
    } catch (error) {
      console.error('Error fetching store stats:', error);
      toast.error('Ошибка загрузки статистики заведений');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Статистика заказов по заведениям</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Статистика заказов по заведениям</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {storeStats.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              Нет данных для отображения
            </div>
          ) : (
            storeStats.map((store) => {
              const successRate = store.totalOrders > 0 
                ? ((store.successfulOrders / store.totalOrders) * 100).toFixed(1) 
                : '0';
              
              return (
                <div key={store.storeId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {store.storeLogo && (
                        <img 
                          src={store.storeLogo} 
                          alt={store.storeName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold">{store.storeName}</h3>
                        <p className="text-sm text-muted-foreground">ID: {store.storeId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{store.totalOrders}</div>
                      <div className="text-xs text-muted-foreground">Всего заказов</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        ✓ {store.successfulOrders}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        Успешные ({successRate}%)
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        ✗ {store.failedOrders}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        Отменённые
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        ⏳ {store.pendingOrders}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        В обработке
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-medium">{store.confirmedOrders}</div>
                      <div className="text-muted-foreground">Подтверждены</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{store.preparingOrders}</div>
                      <div className="text-muted-foreground">Готовятся</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{store.readyOrders}</div>
                      <div className="text-muted-foreground">Готовы</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{store.pickedUpOrders + store.deliveredOrders}</div>
                      <div className="text-muted-foreground">Выданы</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
