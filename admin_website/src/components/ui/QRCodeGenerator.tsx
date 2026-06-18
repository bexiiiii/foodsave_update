'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  className?: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  value, 
  size = 200, 
  level = 'M', 
  className = '' 
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        includeMargin={true}
        className="border border-gray-300 rounded-lg"
      />
    </div>
  );
};

export default QRCodeGenerator;
