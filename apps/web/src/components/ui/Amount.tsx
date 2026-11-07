import React from 'react';
import { cx } from '../../lib/cx';
import { formatMoney, toNumber, type CurrencyCode, type MoneyFormatOptions, type NumericInput } from '../../lib/format';

export interface AmountProps extends MoneyFormatOptions {
  /** Montant (nombre ou Decimal sérialisé en chaîne). */
  value: NumericInput;
  /** Devise. Défaut : `CDF`. */
  currency?: CurrencyCode | string;
  /**
   * Colore selon le signe : `signed` = négatif en rouge, positif en vert ;
   * `negative` = seulement les négatifs en rouge. Défaut : aucune couleur.
   */
  colorize?: 'signed' | 'negative';
  /** Graisse renforcée (totaux). */
  strong?: boolean;
  className?: string;
}

/** Montant formaté avec chiffres tabulaires, pour les tableaux, totaux et récapitulatifs. */
export const Amount: React.FC<AmountProps> = ({
  value,
  currency = 'CDF',
  colorize,
  strong = false,
  className,
  ...options
}) => {
  const number = toNumber(value);
  const tone = number === null || number === 0 || !colorize
    ? undefined
    : number < 0
      ? 'text-danger'
      : colorize === 'signed'
        ? 'text-success'
        : undefined;
  return (
    <span className={cx('amount', strong && 'amount-strong', tone, className)}>
      {formatMoney(value, currency, options)}
    </span>
  );
};
