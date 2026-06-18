'use client';

import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from './button';
import { X } from 'lucide-react';
import { Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerProps {
    onResult: (result: string) => void;
    onClose: () => void;
}

export function QRScanner({ onResult, onClose }: QRScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize scanner with better settings
        scannerRef.current = new Html5QrcodeScanner(
            'qr-reader',
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
                defaultZoomValueIfSupported: 2,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                rememberLastUsedCamera: true,
            },
            false
        );

        // Start scanning
        scannerRef.current.render(
            (decodedText) => {
                console.log('QR Code detected:', decodedText);
                onResult(decodedText);
            },
            (error) => {
                // Only log errors that are not user-initiated
                if (!error.includes('QR code not found')) {
                    console.error('QR Scanner error:', error);
                }
            }
        );

        // Cleanup
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, [onResult]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Scan QR Code</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="absolute right-4 top-4"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="relative">
                    <div 
                        ref={containerRef}
                        id="qr-reader" 
                        className="w-full rounded-lg overflow-hidden"
                    />
                    <div className="absolute inset-0 pointer-events-none border-2 border-primary/50 rounded-lg" />
                </div>

                <div className="mt-4 text-center text-sm text-gray-500">
                    Position the QR code within the frame to scan
                </div>
            </div>
        </div>
    );
}
