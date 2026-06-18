"use client";

import React, { useRef } from 'react';
import { Modal } from "@/components/ui/modal";
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { OrderDTO } from '@/types/api';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';
import { DownloadIcon } from 'lucide-react';
import html2canvas from 'html2canvas';

interface OrderQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: OrderDTO;
}

export function OrderQRModal({ isOpen, onClose, order }: OrderQRModalProps) {
    const receiptRef = useRef<HTMLDivElement>(null);

    const qrData = JSON.stringify({
        orderId: order.id,
        customerName: order.userName,
        customerEmail: order.userEmail,
        items: order.items.map(item => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.unitPrice
        })),
        totalAmount: order.totalAmount,
        status: order.status,
        orderDate: order.orderDate
    });

    const handleDownload = async () => {
        if (!receiptRef.current) return;

        try {
            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
            });

            const link = document.createElement('a');
            link.download = `receipt-${order.id}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Failed to download receipt:', error);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="max-w-[400px] p-0"
        >
            <div className="bg-white p-4 space-y-3" ref={receiptRef}>
                {/* Header */}
                <div className="text-center border-b pb-2">
                    <h2 className="text-lg font-bold">FoodSave</h2>
                    <p className="text-xs text-gray-500">Чек заказа</p>
                </div>

                {/* Order Info */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-gray-500">Заказ #:</span>
                    <span className="font-medium">{order.id}</span>
                    <span className="text-gray-500">Дата:</span>
                    <span>{order.orderDate ? format(new Date(order.orderDate), 'MMM dd, yyyy HH:mm') : 'N/A'}</span>
                    <span className="text-gray-500">Статус:</span>
                    <span className="font-medium">{order.status}</span>
                </div>

                {/* Customer Info */}
                <div className="border-t border-b py-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-gray-500">Клиент:</span>
                    <span className="font-medium">{order.userName}</span>
                    <span className="text-gray-500">Телефон:</span>
                    <span>{order.userPhone || order.contactPhone || 'Не указан'}</span>
                    <span className="text-gray-500">Адрес:</span>
                    <span className="text-right">{order.deliveryAddress}</span>
                </div>

                {/* Items */}
                <div className="space-y-1">
                    <div className="text-xs font-medium border-b pb-1">Позиции</div>
                    {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs">
                            <div>
                                <span className="font-medium">{item.productName}</span>
                                <span className="text-gray-500 ml-1">x{item.quantity}</span>
                            </div>
                            <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                        </div>
                    ))}
                </div>

                {/* Total */}
                <div className="border-t pt-1">
                    <div className="flex justify-between font-bold text-sm">
                        <span>Итого:</span>
                        <span>{formatCurrency(order.totalAmount)}</span>
                    </div>
                </div>

                {/* QR Code */}
                <div className="border-t pt-2">
                    <div className="flex flex-col items-center">
                        <div className="bg-white p-1 rounded-lg border">
                            <QRCodeSVG
                                value={qrData}
                                size={120}
                                level="H"
                                includeMargin={true}
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Сканируйте для просмотра деталей заказа</p>
                    </div>
                </div>

                {/* Notes */}
                {order.notes && order.notes.trim() && (
                    <div className="border-t pt-2 pb-2">
                        <div className="text-xs text-gray-500 mb-1">Примечания:</div>
                        <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
                            {order.notes}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="border-t pt-2 text-center text-xs text-gray-500">
                    <p>Спасибо за ваш заказ!</p>
                    <p className="mt-0.5">Метод оплаты: {order.paymentMethod}</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        className="flex items-center gap-1"
                    >
                        <DownloadIcon className="h-4 w-4" />
                        Скачать
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                    >
                        Закрыть
                    </Button>
                </div>
            </div>
        </Modal>
    );
}