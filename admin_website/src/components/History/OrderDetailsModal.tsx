"use client";

import React from 'react';
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { OrderDTO } from "@/types/api";

interface OrderDetailsModalProps {
    order: OrderDTO | null;
    isOpen: boolean;
    onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
    order,
    isOpen,
    onClose,
}) => {
    if (!order) return null;

    const getPaymentStatusColor = (status: OrderDTO['paymentStatus']) => {
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="max-w-3xl p-6"
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">
                        Детали заказа - {order.orderNumber ? `#${order.orderNumber}` : `#${order.id}`}
                    </h2>
                    <Badge variant={getPaymentStatusColor(order.paymentStatus)}>
                        {order.paymentStatus}
                    </Badge>
                </div>

                {/* Order Status and Date */}
                <div>
                    <p className="text-sm text-muted-foreground">
                        Дата заказа: {order.orderDate ? format(new Date(order.orderDate), 'PPpp') : 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Статус: <Badge variant={getPaymentStatusColor(order.paymentStatus)}>{order.status}</Badge>
                    </p>
                </div>

                {/* Customer Information */}
                <div className="space-y-2">
                    <h3 className="font-semibold">Информация о клиенте</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Имя</p>
                            <p>{order.userName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Телефон</p>
                            <p>{order.userPhone || order.contactPhone || 'Не указан'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p>{order.userEmail}</p>
                        </div>
                    </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                    <h3 className="font-semibold">Позиции заказа</h3>
                    <div className="border rounded-lg">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-3">Товар</th>
                                    <th className="text-right p-3">Количество</th>
                                    <th className="text-right p-3">Цена</th>
                                    <th className="text-right p-3">Сумма</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item) => (
                                    <tr key={item.id} className="border-b last:border-0">
                                        <td className="p-3">{item.productName}</td>
                                        <td className="text-right p-3">{item.quantity}</td>
                                        <td className="text-right p-3">
                                            ₸{item.unitPrice.toFixed(0)}
                                        </td>
                                        <td className="text-right p-3">
                                            ₸{(item.unitPrice * item.quantity).toFixed(0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t">
                                    <td colSpan={3} className="text-right p-3 font-semibold">
                                        Итого:
                                    </td>
                                    <td className="text-right p-3 font-semibold">
                                        ₸{((order as any).total || order.totalAmount)?.toFixed(0) || '0'}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Payment Information */}
                <div className="space-y-2">
                    <h3 className="font-semibold">Информация об оплате</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Метод оплаты</p>
                            <p>{order.paymentMethod}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Номер заказа</p>
                            <p>{order.orderNumber || order.id}</p>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {order.notes && (
                    <div className="space-y-2">
                        <h3 className="font-semibold">Примечания</h3>
                        <p className="text-sm">{order.notes}</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default OrderDetailsModal;