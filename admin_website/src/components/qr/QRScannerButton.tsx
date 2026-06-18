import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QROrderScanner } from './QROrderScanner';
import { Camera } from 'lucide-react';

export const QRScannerButton: React.FC = () => {
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const handleQRScan = (qrData: string) => {
        console.log('QR код отсканирован:', qrData);
    };

    return (
        <>
            <Button
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center gap-2"
            >
                <Camera className="h-4 w-4" />
                Сканировать QR заказа
            </Button>

            <QROrderScanner
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleQRScan}
            />
        </>
    );
};
