import { Currency } from './enums';

export function roundMoney(amount: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  exchangeRateUsdToCdf: number = 2850
): number {
  if (from === to) return roundMoney(amount);
  if (from === Currency.USD && to === Currency.CDF) {
    return roundMoney(amount * exchangeRateUsdToCdf, 0); // CDF usually formatted without cents
  }
  if (from === Currency.CDF && to === Currency.USD) {
    if (exchangeRateUsdToCdf <= 0) return 0;
    return roundMoney(amount / exchangeRateUsdToCdf, 2);
  }
  return roundMoney(amount);
}

export interface LineCalculationResult {
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export function calculateLine(
  quantity: number,
  unitPrice: number,
  discountPercent: number = 0,
  taxRatePercent: number = 0
): LineCalculationResult {
  const qty = Math.max(0, quantity);
  const price = Math.max(0, unitPrice);
  const discPercent = Math.min(Math.max(0, discountPercent), 100);
  const taxPercent = Math.max(0, taxRatePercent);

  const grossAmount = roundMoney(qty * price);
  const discountAmount = roundMoney(grossAmount * (discPercent / 100));
  const taxableAmount = roundMoney(grossAmount - discountAmount);
  const taxAmount = roundMoney(taxableAmount * (taxPercent / 100));
  const total = roundMoney(taxableAmount + taxAmount);

  return {
    grossAmount,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
  };
}

export interface InvoiceCalculationResult {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export function calculateInvoiceTotals(
  items: Array<{
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    taxRatePercent?: number;
  }>
): InvoiceCalculationResult {
  let subtotal = 0;
  let discountAmount = 0;
  let taxableAmount = 0;
  let taxAmount = 0;
  let total = 0;

  for (const item of items) {
    const line = calculateLine(
      item.quantity,
      item.unitPrice,
      item.discountPercent || 0,
      item.taxRatePercent || 0
    );
    subtotal += line.grossAmount;
    discountAmount += line.discountAmount;
    taxableAmount += line.taxableAmount;
    taxAmount += line.taxAmount;
    total += line.total;
  }

  return {
    subtotal: roundMoney(subtotal),
    discountAmount: roundMoney(discountAmount),
    taxableAmount: roundMoney(taxableAmount),
    taxAmount: roundMoney(taxAmount),
    total: roundMoney(total),
  };
}

export function formatCurrency(
  amount: number,
  currency: Currency = Currency.CDF,
  locale: string = 'fr-CD'
): string {
  const decimals = currency === Currency.USD ? 2 : 0;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return `${formatted} ${currency}`;
}
