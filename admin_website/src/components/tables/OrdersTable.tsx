import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { Button } from "../ui/button";
import { formatCurrency } from '@/utils/currency';
import { OrderDTO } from '@/types/api';

interface Order extends OrderDTO {
    orderNumber: string;
    qrCode: string;
    createdAt: string;
    updatedAt: string;
}

interface OrdersTableProps {
  orders: Order[];
  onViewQRCode: (order: Order) => void;
  onViewDetails?: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
}

export default function OrdersTable({ orders, onViewQRCode, onViewDetails, onEditOrder }: OrdersTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
      case 'PICKED_UP':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      case 'CONFIRMED':
      case 'PREPARING':
      case 'READY':
        return 'info';
      default:
        return 'primary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'Доставлен';
      case 'PENDING':
        return 'В ожидании';
      case 'CANCELLED':
        return 'Отменен';
      case 'PROCESSING':
        return 'В обработке';
      default:
        return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Наличные';
      case 'CARD':
        return 'Карта';
      case 'KASPI':
        return 'Kaspi';
      default:
        return method;
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 dark:text-gray-400 mb-4">
          Заказы не найдены
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1000px]">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Номер заказа
                </TableHead>
                <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Статус
                </TableHead>
                <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Сумма
                </TableHead>
                <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Способ оплаты
                </TableHead>
                <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Дата создания
                </TableHead>
                <TableHead className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                  Действия
                </TableHead>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {order.orderNumber}
                    </span>
                    {order.userName && (
                      <div className="text-gray-500 text-theme-xs dark:text-gray-400 mt-1">
                        {order.userName}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell className="px-4 py-3 text-start">
                    <Badge
                      size="sm"
                      color={getStatusColor(order.status)}
                    >
                      {getStatusText(order.status)}
                    </Badge>
                  </TableCell>

                  <TableCell className="px-4 py-3 text-start">
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </TableCell>

                  <TableCell className="px-4 py-3 text-start">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {getPaymentMethodText(order.paymentMethod)}
                    </span>
                  </TableCell>

                  <TableCell className="px-4 py-3 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewQRCode(order)}
                        className="h-8 px-3"
                      >
                        QR код
                      </Button>
                      {onViewDetails && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetails(order)}
                          className="h-8 px-3"
                        >
                          Детали
                        </Button>
                      )}
                      {onEditOrder && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEditOrder(order)}
                          className="h-8 px-3"
                        >
                          Редактировать
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
