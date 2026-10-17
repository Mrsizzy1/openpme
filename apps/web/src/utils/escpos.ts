/**
 * Smart PME Finance - Pilote d'Impression Thermique ESC/POS Direct (58mm & 80mm)
 * Supporte le découpage papier, l'éjection de tiroir-caisse et le rendu thermique haute densité.
 */

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptData {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyNif?: string;
  receiptNumber: string;
  date: string;
  cashierName?: string;
  customerName?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  currency: string;
  paymentMethod: string;
  cashReceived?: number;
  changeGiven?: number;
  qrCodeUrl?: string;
}

/**
 * Génère le flux d'instructions brutes ESC/POS (pour imprimantes USB/Série/Réseau)
 */
export function generateEscPosBinary(data: ReceiptData, options: { width: '80mm' | '58mm'; kickDrawer?: boolean }): Uint8Array {
  const bytes: number[] = [];

  // ESC @ : Initialisation imprimante
  bytes.push(0x1B, 0x40);

  // Éjection tiroir caisse si demandée : ESC p 0 25 250
  if (options.kickDrawer) {
    bytes.push(0x1B, 0x70, 0x00, 0x19, 0xFA);
  }

  // Centrage : ESC a 1
  bytes.push(0x1B, 0x61, 0x01);

  // Gras ON : ESC E 1
  bytes.push(0x1B, 0x45, 0x01);

  // Double hauteur/largeur pour le titre
  bytes.push(0x1D, 0x21, 0x11);
  appendString(bytes, `${data.companyName}\n`);

  // Taille normale : GS ! 0
  bytes.push(0x1D, 0x21, 0x00);
  bytes.push(0x1B, 0x45, 0x00); // Gras OFF

  if (data.companyAddress) appendString(bytes, `${data.companyAddress}\n`);
  if (data.companyPhone) appendString(bytes, `Tél: ${data.companyPhone}\n`);
  if (data.companyNif) appendString(bytes, `NIF / RCCM: ${data.companyNif}\n`);

  appendString(bytes, '--------------------------------\n');
  appendString(bytes, `TICKET N°: ${data.receiptNumber}\n`);
  appendString(bytes, `Date: ${data.date}\n`);
  if (data.cashierName) appendString(bytes, `Caissier: ${data.cashierName}\n`);
  if (data.customerName) appendString(bytes, `Client: ${data.customerName}\n`);
  appendString(bytes, '--------------------------------\n');

  // Alignement Gauche : ESC a 0
  bytes.push(0x1B, 0x61, 0x00);

  // Lignes d'articles
  for (const item of data.items) {
    const qtyPrice = `${item.quantity} x ${item.unitPrice.toLocaleString('fr-FR')} ${data.currency}`;
    const tot = `${item.total.toLocaleString('fr-FR')} ${data.currency}`;
    appendString(bytes, `${item.name}\n`);
    appendString(bytes, `  ${qtyPrice.padEnd(20)} ${tot.padStart(10)}\n`);
  }

  appendString(bytes, '--------------------------------\n');

  // Totaux
  bytes.push(0x1B, 0x61, 0x02); // Alignement Droite
  appendString(bytes, `Sous-total: ${data.subtotal.toLocaleString('fr-FR')} ${data.currency}\n`);
  if (data.discount && data.discount > 0) {
    appendString(bytes, `Remise: -${data.discount.toLocaleString('fr-FR')} ${data.currency}\n`);
  }
  if (data.taxAmount && data.taxAmount > 0) {
    appendString(bytes, `TVA: ${data.taxAmount.toLocaleString('fr-FR')} ${data.currency}\n`);
  }

  // TOTAL en gras et grand
  bytes.push(0x1B, 0x45, 0x01); // Bold ON
  bytes.push(0x1D, 0x21, 0x01); // Double height
  appendString(bytes, `TOTAL: ${data.total.toLocaleString('fr-FR')} ${data.currency}\n`);
  bytes.push(0x1D, 0x21, 0x00);
  bytes.push(0x1B, 0x45, 0x00);

  appendString(bytes, `Mode de paiement: ${data.paymentMethod}\n`);
  if (data.cashReceived) {
    appendString(bytes, `Reçu: ${data.cashReceived.toLocaleString('fr-FR')} ${data.currency}\n`);
  }
  if (data.changeGiven) {
    appendString(bytes, `Rendu: ${data.changeGiven.toLocaleString('fr-FR')} ${data.currency}\n`);
  }

  // Centrage pour pied de ticket : ESC a 1
  bytes.push(0x1B, 0x61, 0x01);
  appendString(bytes, '\n*** MERCI DE VOTRE VISITE ***\n');
  appendString(bytes, 'Logiciel certifié Smart PME Finance\n\n\n');

  // Coupure papier : GS V 66 0
  bytes.push(0x1D, 0x56, 0x42, 0x00);

  return new Uint8Array(bytes);
}

function appendString(bytes: number[], str: string) {
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
}

/**
 * Imprime un ticket thermique ultra-net format 58mm ou 80mm via fenêtre d'impression native silencieuse
 */
export function printThermalReceiptWeb(data: ReceiptData, options: { width?: '80mm' | '58mm'; autoClose?: boolean } = {}) {
  const width = options.width || '80mm';
  const widthPx = width === '58mm' ? '220px' : '300px';

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    alert("Veuillez autoriser l'ouverture des popups pour imprimer le ticket.");
    return;
  }

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 2px 0;">
          <div style="font-weight: 600;">${item.name}</div>
          <div style="font-size: 10px; color: #555;">${item.quantity} x ${item.unitPrice.toLocaleString('fr-FR')} ${data.currency}</div>
        </td>
        <td style="text-align: right; vertical-align: top; font-weight: 600; padding: 2px 0;">
          ${item.total.toLocaleString('fr-FR')} ${data.currency}
        </td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ticket_${data.receiptNumber}</title>
      <style>
        @page {
          size: ${width} auto;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 8px;
          width: ${widthPx};
          font-family: 'Courier New', Courier, monospace, sans-serif;
          font-size: 11px;
          line-height: 1.3;
          color: #000;
          background: #FFF;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .title { font-size: 14px; font-weight: 900; margin-bottom: 2px; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .double-divider { border-top: 2px solid #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        .total-box { font-size: 14px; font-weight: 900; }
        @media print {
          body { width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="center">
        <div class="title">${data.companyName}</div>
        ${data.companyAddress ? `<div>${data.companyAddress}</div>` : ''}
        ${data.companyPhone ? `<div>Tél: ${data.companyPhone}</div>` : ''}
        ${data.companyNif ? `<div>NIF: ${data.companyNif}</div>` : ''}
      </div>

      <div class="divider"></div>
      <div style="font-size: 10px;">
        <div><b>TICKET N°:</b> ${data.receiptNumber}</div>
        <div><b>Date:</b> ${data.date}</div>
        ${data.cashierName ? `<div><b>Caissier:</b> ${data.cashierName}</div>` : ''}
        ${data.customerName ? `<div><b>Client:</b> ${data.customerName}</div>` : ''}
      </div>
      <div class="divider"></div>

      <table>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider"></div>

      <table>
        <tr>
          <td>Sous-total :</td>
          <td class="right">${data.subtotal.toLocaleString('fr-FR')} ${data.currency}</td>
        </tr>
        ${data.discount && data.discount > 0 ? `
          <tr>
            <td>Remise :</td>
            <td class="right">-${data.discount.toLocaleString('fr-FR')} ${data.currency}</td>
          </tr>` : ''
        }
        ${data.taxAmount && data.taxAmount > 0 ? `
          <tr>
            <td>TVA (16%) :</td>
            <td class="right">${data.taxAmount.toLocaleString('fr-FR')} ${data.currency}</td>
          </tr>` : ''
        }
      </table>

      <div class="double-divider"></div>

      <table>
        <tr class="total-box">
          <td>TOTAL NET :</td>
          <td class="right">${data.total.toLocaleString('fr-FR')} ${data.currency}</td>
        </tr>
      </table>

      <div class="divider"></div>

      <div style="font-size: 10px;">
        <div><b>Paiement :</b> ${data.paymentMethod}</div>
        ${data.cashReceived ? `<div><b>Reçu :</b> ${data.cashReceived.toLocaleString('fr-FR')} ${data.currency}</div>` : ''}
        ${data.changeGiven ? `<div><b>Rendu :</b> ${data.changeGiven.toLocaleString('fr-FR')} ${data.currency}</div>` : ''}
      </div>

      <div class="divider"></div>

      <div class="center" style="font-size: 10px; margin-top: 8px;">
        <div class="bold">MERCI DE VOTRE VISITE !</div>
        <div style="font-size: 9px; color: #555; margin-top: 2px;">Smart PME Finance - Conforme DGI/OHADA</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
          ${options.autoClose !== false ? 'setTimeout(function() { window.close(); }, 800);' : ''}
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
