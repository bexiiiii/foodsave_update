import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from './button';
import { Modal } from './modal';
import { useModal } from '@/hooks/useModal';

interface QRCodeProps {
    value: string;
    size?: number;
    showDownload?: boolean;
    className?: string;
}

export default function QRCode({ value, size = 200, showDownload = true, className = '' }: QRCodeProps) {
    const modal = useModal();

    const handleDownload = () => {
        const canvas = document.createElement('canvas');
        const svg = document.querySelector('.qr-code svg');
        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const pngFile = canvas.toDataURL('image/png');
                    const downloadLink = document.createElement('a');
                    downloadLink.download = `qr-code-${value}.png`;
                    downloadLink.href = pngFile;
                    downloadLink.click();
                }
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        }
    };

    return (
        <div className={`qr-code ${className}`}>
            <QRCodeSVG
                value={value}
                size={size}
                level="H"
                includeMargin={true}
                className="mx-auto"
            />
            {showDownload && (
                <div className="mt-4 flex justify-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        className="flex items-center gap-2"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download QR Code
                    </Button>
                </div>
            )}
        </div>
    );
} 