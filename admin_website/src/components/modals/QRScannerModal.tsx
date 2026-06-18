"use client";

import React, { useState } from 'react';
import { Modal } from "@/components/ui/modal";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QrReader } from 'react-qr-reader';
import { toast } from 'react-hot-toast';
import { orderApi } from '@/services/api';
import { OrderDTO } from '@/types/api';

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOrderUpdated: () => void;
}

export function QRScannerModal({ isOpen, onClose, onOrderUpdated }: QRScannerModalProps) {
    const [scanning, setScanning] = useState(true);

    const handleScan = async (result: string | null) => {
        if (!result) return;

        try {
            const orderData = JSON.parse(result);
            if (!orderData.orderId) {
                toast.error('Неверный QR-код');
                return;
            }

            // Update order status to the next one
            const currentStatus = orderData.status;
            const statusFlow = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED'];
            const currentIndex = statusFlow.indexOf(currentStatus);

            if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
                toast.error('Заказ уже в конечном статусе');
                return;
            }

            const nextStatus = statusFlow[currentIndex + 1];
            await orderApi.updateStatus(orderData.orderId, nextStatus);

            toast.success(`Статус заказа обновлен на ${nextStatus}`);
            onOrderUpdated();
            setScanning(false);
            onClose();
        } catch (error) {
            console.error('Failed to process QR code:', error);
            toast.error('Не удалось обработать QR-код');
        }
    };

    const handleError = (error: Error) => {
        console.error('QR Scanner error:', error);
        toast.error('Не удалось получить доступ к камере');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="max-w-[600px] p-6"
        >
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Сканировать QR-код заказа</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Отсканируйте QR-код, чтобы обновить статус заказа</p>
                </div>

                <Card>
                    <CardContent className="p-4">
                        <div className="aspect-square w-full max-w-[400px] mx-auto bg-black rounded-lg overflow-hidden">
                            {scanning && (
                                <QrReader
                                    constraints={{ facingMode: 'environment' }}
                                    onResult={(result, error) => {
                                        if (result) {
                                            handleScan(result.getText());
                                        }
                                        if (error) {
                                            handleError(error);
                                        }
                                    }}
                                    className="w-full h-full"
                                />
                            )}
                        </div>
                        <p className="mt-4 text-center text-sm text-gray-500">
                            Расположите QR-код в рамке для сканирования
                        </p>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setScanning(!scanning)}
                    >
                        {scanning ? 'Остановить сканирование' : 'Начать сканирование'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}