import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useApi } from '@/hooks/useApi';
import { OrderDTO } from '@/types/api';
import { QRScanner } from '@/components/ui/QRScanner';

interface OrderDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (qrData: string) => void;
}

interface OrderDetailsProps {
    order: OrderDTO;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({ order, onConfirm, onCancel, loading }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'default';
            case 'CONFIRMED': return 'secondary';
            case 'PREPARING': return 'secondary';
            case 'READY': return 'outline';
            case 'COMPLETED': return 'default';
            case 'CANCELLED': return 'destructive';
            default: return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'PENDING': return 'Ожидает подтверждения';
            case 'CONFIRMED': return 'Подтвержден';
            case 'PREPARING': return 'Готовится';
            case 'READY': return 'Готов к выдаче';
            case 'COMPLETED': return 'Завершен';
            case 'CANCELLED': return 'Отменен';
            default: return status;
        }
    };

    return (
        <div className="space-y-6">
            {/* Информация о заказе */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Заказ #{order.id}</span>
                        <Badge variant={getStatusColor(order.status)}>
                            {getStatusText(order.status)}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Клиент</p>
                            <p className="text-base">{order.userName || 'Неизвестно'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Телефон</p>
                            <p className="text-base">{order.userPhone || order.contactPhone || 'Не указан'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Email</p>
                            <p className="text-base">{order.userEmail || 'Не указан'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Дата создания</p>
                            <p className="text-base">
                                {order.orderDate ? new Date(order.orderDate).toLocaleString('ru-RU') : 'Неизвестно'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Адрес доставки</p>
                            <p className="text-base">{order.deliveryAddress || 'Самовывоз'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Общая сумма</p>
                            <p className="text-lg font-semibold text-green-600">
                                ₸{(order as any).total || order.totalAmount}
                            </p>
                        </div>
                    </div>
                    
                    {/* Заметки */}
                    {order.notes && order.notes.trim() && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium text-gray-500 mb-2">Заметки к заказу</p>
                            <p className="text-base bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                {order.notes}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Товары в заказе */}
            <Card>
                <CardHeader>
                    <CardTitle>Товары в заказе</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {order.items?.map((item, index) => (
                            <div key={index}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium">{item.productName}</p>
                                        <p className="text-sm text-gray-500">
                                            ₸{item.unitPrice} × {item.quantity} шт.
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">
                                            ₸{item.totalPrice}
                                        </p>
                                    </div>
                                </div>
                                {index < (order.items?.length || 0) - 1 && (
                                    <Separator className="mt-3" />
                                )}
                            </div>
                        ))}
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex justify-between items-center text-lg font-semibold">
                        <span>Итого:</span>
                        <span>₸{(order as any).total || order.totalAmount}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Кнопки действий */}
            <div className="flex gap-3">
                <Button 
                    variant="outline" 
                    onClick={onCancel}
                    className="flex-1"
                >
                    Отмена
                </Button>
                {order.status === 'PENDING' && (
                    <Button 
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1"
                    >
                        {loading ? 'Подтверждение...' : 'Подтвердить заказ'}
                    </Button>
                )}
                {order.status === 'CONFIRMED' && (
                    <Button 
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1"
                    >
                        {loading ? 'Обновление...' : 'Заказ готов'}
                    </Button>
                )}
                {order.status === 'READY' && (
                    <Button 
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1"
                    >
                        {loading ? 'Завершение...' : 'Выдать заказ'}
                    </Button>
                )}
            </div>
        </div>
    );
};

export const QROrderScanner: React.FC<OrderDetailModalProps> = ({ isOpen, onClose, onScan }) => {
    const [order, setOrder] = useState<OrderDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { getOrders } = useApi();

    const handleQRScan = async (qrData: string) => {
        setLoading(true);
        setError(null);
        
        try {
            // Пытаемся извлечь ID заказа из QR-кода
            // QR-код может содержать URL или просто ID заказа
            let orderId: number;
            
            if (qrData.includes('order/') || qrData.includes('orders/')) {
                // Извлекаем ID из URL
                const match = qrData.match(/orders?\/(\d+)/);
                orderId = match ? parseInt(match[1]) : parseInt(qrData);
            } else {
                // Предполагаем, что это просто ID заказа
                orderId = parseInt(qrData);
            }

            if (isNaN(orderId)) {
                throw new Error('Неверный формат QR-кода');
            }

            // Здесь должен быть запрос к API для получения конкретного заказа
            // Пока используем заглушку из общего списка заказов
            const orders = await getOrders();
            const foundOrder = orders?.find(o => o.id === orderId);
            
            if (!foundOrder) {
                throw new Error(`Заказ с ID ${orderId} не найден`);
            }

            setOrder(foundOrder);
            onScan(qrData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка при обработке QR-кода');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmOrder = async () => {
        if (!order) return;

        setLoading(true);
        try {
            // Здесь должен быть API-запрос для обновления статуса заказа
            // Пока просто имитируем обновление
            let newStatus = order.status;
            
            switch (order.status) {
                case 'PENDING':
                    newStatus = 'CONFIRMED';
                    break;
                case 'CONFIRMED':
                    newStatus = 'READY';
                    break;
                case 'READY':
                    newStatus = 'PICKED_UP';
                    break;
            }

            // Обновляем локальное состояние
            setOrder({ ...order, status: newStatus });
            
            // Показываем сообщение об успехе
            alert(`Статус заказа обновлен на: ${newStatus}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка при обновлении заказа');
        } finally {
            setLoading(false);
        }
    };

    const resetState = () => {
        setOrder(null);
        setError(null);
        setLoading(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {order ? `Детали заказа #${order.id}` : 'Сканирование QR-кода заказа'}
                    </DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700">{error}</p>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={resetState}
                            className="mt-2"
                        >
                            Попробовать снова
                        </Button>
                    </div>
                )}

                {!order && !error && (
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Наведите камеру на QR-код заказа для получения подробной информации
                        </p>
                        <QRScanner
                            onResult={handleQRScan}
                            onClose={() => setError('Сканирование отменено')}
                        />
                    </div>
                )}

                {order && !error && (
                    <OrderDetails
                        order={order}
                        onConfirm={handleConfirmOrder}
                        onCancel={resetState}
                        loading={loading}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};
