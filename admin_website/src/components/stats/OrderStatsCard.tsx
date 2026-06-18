import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OrderStatsCardProps {
  title: string;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  pendingOrders: number;
  icon?: React.ReactNode;
  className?: string;
}

export const OrderStatsCard: React.FC<OrderStatsCardProps> = ({
  title,
  totalOrders,
  successfulOrders,
  failedOrders,
  pendingOrders,
  icon,
  className = ""
}) => {
  const successRate = totalOrders > 0 ? ((successfulOrders / totalOrders) * 100).toFixed(1) : '0';
  const failureRate = totalOrders > 0 ? ((failedOrders / totalOrders) * 100).toFixed(1) : '0';

  return (
    <Card className={`${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-2xl font-bold">{totalOrders}</div>
          <div className="text-xs text-muted-foreground">Всего заказов</div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                ✓ {successfulOrders}
              </Badge>
              <span className="text-xs text-muted-foreground">({successRate}%)</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                ✗ {failedOrders}
              </Badge>
              <span className="text-xs text-muted-foreground">({failureRate}%)</span>
            </div>
          </div>
          
          {pendingOrders > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  ⏳ {pendingOrders}
                </Badge>
                <span className="text-xs text-muted-foreground">В ожидании</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
