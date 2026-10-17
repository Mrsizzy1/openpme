import React from 'react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 100, label }) => {
  const encodedValue = encodeURIComponent(value);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}&margin=4`;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div
        style={{
          width: size,
          height: size,
          background: '#fff',
          border: '1px solid #CBD5E1',
          borderRadius: '4px',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <img
          src={qrUrl}
          alt="QR Code Fiscal"
          width={size - 8}
          height={size - 8}
          style={{ display: 'block' }}
          onError={(e) => {
            // Fallback SVG si hors-ligne
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
      {label && (
        <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', fontWeight: 600 }}>
          {label}
        </span>
      )}
    </div>
  );
};
