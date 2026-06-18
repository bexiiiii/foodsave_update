"use client";

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/useApi';
import { OrderDTO } from '@/types/api';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { EyeIcon } from '@/components/icons';
import { DateRange } from 'react-day-picker';
import OrderDetailsModal from './OrderDetailsModal';

interface Order extends OrderDTO {
    orderNumber: string;
    qrCode: string;
    createdAt: string;
    updatedAt: string;
}

interface HistoryListProps {
    searchQuery: string;
    statusFilter: string;
    dateRange?: DateRange;
}

const HistoryList: React.FC<HistoryListProps> = ({
    searchQuery,
    statusFilter,
    dateRange,
}) => {
    const { getOrders, loading, error } = useApi();
    const [orders, setOrders] = React.useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    React.useEffect(() => {
        const fetchOrders = async () => {
            const response = await getOrders();
            if (response) {
                const transformedOrders = response.map(order => ({
                    ...order,
                    orderNumber: `ORD-${order.id}`,
                    qrCode: `ORD-${order.id}`,
                    createdAt: order.orderDate || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }));
                setOrders(transformedOrders);
            }
        };
        fetchOrders();
    }, [getOrders]);

    const handleViewOrder = (order: Order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
    };

    const filteredOrders = React.useMemo(() => {
        return orders.filter(order => {
            const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || order.paymentStatus === statusFilter;
            const matchesDate = !dateRange?.from || !dateRange?.to || (
                new Date(order.createdAt) >= dateRange.from &&
                new Date(order.createdAt) <= dateRange.to
            );
            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [orders, searchQuery, statusFilter, dateRange]);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                {error}
            </div>
        );
    }

    const getPaymentStatusColor = (status: Order['paymentStatus']) => {
        switch (status) {
            case 'PAID':
                return 'default';
            case 'PENDING':
                return 'secondary';
            case 'FAILED':
            case 'REFUNDED':
                return 'destructive';
            default:
                return 'default';
        }
    };

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Номер заказа</TableHead>
                            <TableHead>Дата</TableHead>
                            <TableHead>Статус</TableHead>
                            <TableHead>Сумма</TableHead>
                            <TableHead>Метод оплаты</TableHead>
                            <TableHead>Позиции</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">
                                    {order.orderNumber}
                                </TableCell>
                                <TableCell>
                                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getPaymentStatusColor(order.paymentStatus)}>
                                        {order.paymentStatus}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    ₸{order.totalAmount?.toFixed(2) || '0.00'}
                                </TableCell>
                                <TableCell>
                                    {order.paymentMethod}
                                </TableCell>
                                <TableCell>
                                    {order.items.length} поз.
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleViewOrder(order)}
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <OrderDetailsModal
                order={selectedOrder}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </>
    );
};

export default HistoryList;