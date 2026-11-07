/**
 * Helpers de formatage (français) : montants, nombres, pourcentages et dates.
 *
 * Compatibilité : `formatMoney` reprend les règles de `formatCurrency` de
 * `@smart-pme/shared` (locale fr-CD, CDF sans décimales, USD avec 2 décimales,
 * code devise en suffixe). Seule différence : l'espace entre le montant et la
 * devise est insécable, pour qu'un montant ne soit jamais coupé en fin de ligne.
 */

export type CurrencyCode = 'CDF' | 'USD';

/** Valeur numérique telle que renvoyée par l'API (les Decimal Prisma arrivent en chaîne). */
export type NumericInput = number | string | null | undefined;

/** Date telle que renvoyée par l'API (ISO 8601), timestamp ou objet Date. */
export type DateInput = Date | string | number | null | undefined;

/** Texte affiché à la place d'une valeur absente ou invalide. */
export const EMPTY_VALUE = '—';

const NUMBER_LOCALE = 'fr-CD';
const DATE_LOCALE = 'fr-FR';
const NBSP = ' ';

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(NUMBER_LOCALE, options);
    numberFormats.set(key, format);
  }
  return format;
}

function dateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(DATE_LOCALE, options);
    dateFormats.set(key, format);
  }
  return format;
}

/**
 * Convertit une valeur de l'API en nombre fini, ou `null` si elle est absente/invalide.
 * Accepte les chaînes « 1250.5 », « 1250,5 » et « 1 250,5 ».
 */
export function toNumber(value: NumericInput): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let text = String(value).trim().replace(/[\s  ]/g, '');
  if (!text) return null;
  if (text.includes(',') && !text.includes('.')) text = text.replace(',', '.');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Nombre de décimales d'usage pour une devise (CDF : 0, USD : 2). */
export function currencyDecimals(currency?: string | null): number {
  return currency === 'USD' ? 2 : 0;
}

/** Évite d'afficher « -0 » quand un petit montant négatif est arrondi à zéro. */
function normalizeZero(value: number, decimals: number): number {
  return Math.abs(value) < 0.5 * 10 ** -decimals ? 0 : value;
}

export interface MoneyFormatOptions {
  /** Nombre de décimales (par défaut 0 pour CDF, 2 pour USD). */
  decimals?: number;
  /** Affichage du signe : `exceptZero` pour les variations (« +1 200 CDF »). */
  signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never';
  /** Notation compacte (« 1,2 M CDF »), pour les graphiques et les indicateurs. */
  compact?: boolean;
  /** Texte affiché si le montant est absent ou invalide (« — » par défaut). */
  fallback?: string;
}

/**
 * Formate un montant avec sa devise : `formatMoney(1250000, 'CDF')` → « 1 250 000 CDF »,
 * `formatMoney(12.5, 'USD')` → « 12,50 USD ».
 */
export function formatMoney(
  amount: NumericInput,
  currency: CurrencyCode | string = 'CDF',
  options: MoneyFormatOptions = {},
): string {
  const value = toNumber(amount);
  if (value === null) return options.fallback ?? EMPTY_VALUE;
  const decimals = options.decimals ?? currencyDecimals(currency);
  const signDisplay = options.signDisplay ?? 'auto';
  const formatted = options.compact
    ? numberFormat({ notation: 'compact', maximumFractionDigits: 1, signDisplay }).format(value)
    : numberFormat({ minimumFractionDigits: decimals, maximumFractionDigits: decimals, signDisplay })
      .format(normalizeZero(value, decimals));
  return currency ? `${formatted}${NBSP}${currency}` : formatted;
}

export interface NumberFormatOptions {
  /** Nombre fixe de décimales. Par défaut : jusqu'à 2 décimales, sans zéros inutiles. */
  decimals?: number;
  /** Affichage du signe (`exceptZero` pour les écarts de stock, par exemple). */
  signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never';
  /** Notation compacte (« 12,5 k »). */
  compact?: boolean;
  /** Texte affiché si la valeur est absente ou invalide (« — » par défaut). */
  fallback?: string;
}

/** Formate un nombre à la française : `formatNumber(1234.5)` → « 1 234,5 ». */
export function formatNumber(value: NumericInput, options: NumberFormatOptions = {}): string {
  const number = toNumber(value);
  if (number === null) return options.fallback ?? EMPTY_VALUE;
  const signDisplay = options.signDisplay ?? 'auto';
  if (options.compact) {
    return numberFormat({ notation: 'compact', maximumFractionDigits: 1, signDisplay }).format(number);
  }
  const max = options.decimals ?? 2;
  const min = options.decimals ?? 0;
  return numberFormat({ minimumFractionDigits: min, maximumFractionDigits: max, signDisplay })
    .format(normalizeZero(number, max));
}

export interface PercentFormatOptions {
  /** Nombre maximal de décimales (1 par défaut). */
  decimals?: number;
  /** `true` si la valeur est un ratio (0,16) plutôt qu'un pourcentage (16). */
  ratio?: boolean;
  /** Affichage du signe (`exceptZero` pour une variation : « +4,2 % »). */
  signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never';
  /** Texte affiché si la valeur est absente ou invalide (« — » par défaut). */
  fallback?: string;
}

/**
 * Formate un pourcentage exprimé en points : `formatPercent(16)` → « 16 % »,
 * `formatPercent(0.164, { ratio: true })` → « 16,4 % ».
 */
export function formatPercent(value: NumericInput, options: PercentFormatOptions = {}): string {
  const number = toNumber(value);
  if (number === null) return options.fallback ?? EMPTY_VALUE;
  const ratio = options.ratio ? number : number / 100;
  const decimals = options.decimals ?? 1;
  return numberFormat({
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
    signDisplay: options.signDisplay ?? 'auto',
  }).format(normalizeZero(ratio, decimals + 2));
}

/**
 * Formate un effectif avec accord du nom (règle française : 0 et 1 au singulier).
 * `formatCount(3, 'opération')` → « 3 opérations » ; `formatCount(1, 'article')` → « 1 article ».
 */
export function formatCount(count: NumericInput, singular: string, plural?: string): string {
  const number = toNumber(count) ?? 0;
  const noun = Math.abs(number) < 2 ? singular : plural ?? `${singular}s`;
  return `${formatNumber(number, { decimals: 0 })}${NBSP}${noun}`;
}

/** Convertit une valeur de l'API en Date valide, ou `null`. */
export function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type DateStyle = 'short' | 'medium' | 'long';

const DATE_STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: '2-digit', month: '2-digit', year: 'numeric' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
};

/**
 * Formate une date : `short` → « 06/11/2026 » (par défaut), `medium` → « 6 nov. 2026 »,
 * `long` → « 6 novembre 2026 ».
 */
export function formatDate(value: DateInput, style: DateStyle = 'short'): string {
  const date = toDate(value);
  return date ? dateFormat(DATE_STYLES[style]).format(date) : EMPTY_VALUE;
}

/** Formate une date et une heure : « 06/11/2026 14:32 » (« 14:32:05 » avec `seconds`). */
export function formatDateTime(value: DateInput, options: { seconds?: boolean } = {}): string {
  const date = toDate(value);
  if (!date) return EMPTY_VALUE;
  return dateFormat({
    ...DATE_STYLES.short,
    hour: '2-digit',
    minute: '2-digit',
    ...(options.seconds ? { second: '2-digit' } : {}),
  }).format(date).replace(',', '');
}

/** Formate une heure : « 14:32 ». */
export function formatTime(value: DateInput, options: { seconds?: boolean } = {}): string {
  const date = toDate(value);
  if (!date) return EMPTY_VALUE;
  return dateFormat({ hour: '2-digit', minute: '2-digit', ...(options.seconds ? { second: '2-digit' } : {}) })
    .format(date);
}

export interface RelativeTimeOptions {
  /** Instant de référence (maintenant par défaut) — utile pour les tests et les rafraîchissements. */
  now?: Date | number;
  /** Met une majuscule initiale (« Il y a 5 min ») pour un affichage en début de cellule. */
  capitalize?: boolean;
}

/**
 * Durée écoulée en français : « à l'instant », « il y a 5 min », « il y a 3 h »,
 * « il y a 6 jours », puis la date (« 30/10/2026 ») au-delà de 7 jours.
 */
export function formatRelativeTime(value: DateInput, options: RelativeTimeOptions = {}): string {
  const date = toDate(value);
  if (!date) return EMPTY_VALUE;
  const now = options.now instanceof Date ? options.now.getTime() : options.now ?? Date.now();
  const seconds = Math.round((now - date.getTime()) / 1000);

  let text: string;
  if (seconds < -60) {
    text = formatDateTime(date);
  } else if (seconds < 60) {
    text = 'à l’instant';
  } else if (seconds < 3600) {
    text = `il y a ${Math.floor(seconds / 60)}${NBSP}min`;
  } else if (seconds < 86_400) {
    text = `il y a ${Math.floor(seconds / 3600)}${NBSP}h`;
  } else if (seconds < 7 * 86_400) {
    const days = Math.floor(seconds / 86_400);
    text = `il y a ${days}${NBSP}${days > 1 ? 'jours' : 'jour'}`;
  } else {
    text = formatDate(date);
  }
  return options.capitalize ? capitalize(text) : text;
}

/** Met la première lettre en majuscule (« à l'instant » → « À l'instant »). */
export function capitalize(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1) : text;
}

/** Initiales d'une personne ou d'une entreprise (« Jean Mukendi » → « JM »). */
export function getInitials(...parts: Array<string | null | undefined>): string {
  const words = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .flatMap((part) => part.trim().split(/\s+/));
  if (words.length === 0) return '?';
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] ?? '' : words[0][1] ?? '';
  return `${first}${last}`.toLocaleUpperCase('fr-FR');
}
