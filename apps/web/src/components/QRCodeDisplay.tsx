import React, { useMemo } from 'react';
import qrcode from 'qrcode-generator';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
}

/**
 * QR code generated locally (no external service): the invoice data never
 * leaves the machine and the code also prints when the shop is offline.
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 100, label }) => {
  const qr = useMemo(() => {
    const code = qrcode(0, 'M');
    code.addData(value);
    code.make();
    const count = code.getModuleCount();
    let path = '';
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (code.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { count, path };
  }, [value]);

  return (
    <figure className="qr-code">
      <svg
        className="qr-code-image"
        width={size}
        height={size}
        viewBox={`-2 -2 ${qr.count + 4} ${qr.count + 4}`}
        role="img"
        aria-label={label ? `QR code : ${label}` : 'QR code'}
        shapeRendering="crispEdges"
      >
        <rect x={-2} y={-2} width={qr.count + 4} height={qr.count + 4} fill="#fff" />
        <path d={qr.path} fill="#000" />
      </svg>
      {label && <figcaption className="qr-code-label">{label}</figcaption>}
    </figure>
  );
};
