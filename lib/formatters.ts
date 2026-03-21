/**
 * Habixa format utilities — currency, dates, numbers.
 * All locale-aware. Never hardcodes USD or a single date format.
 *
 * Usage:
 *   import { formatPrice, formatDate, formatRelativeTime } from '@/lib/formatters';
 *   formatPrice(1850, 'USD')   → "$1,850"
 *   formatPrice(150000, 'JMD') → "J$150,000"
 *   formatPrice(1200, 'GBP')   → "£1,200"
 */
import { getLocales } from 'expo-localization';
import { getLocale } from './i18n';

// ── Locale detection ──────────────────────────────────────────────────────────
function getDeviceLocaleString(): string {
  try {
    const locales = getLocales();
    return locales[0]?.languageTag ?? 'en-US';
  } catch {
    return 'en-US';
  }
}

// Map i18n locale to BCP 47 locale tag for Intl APIs
const LOCALE_TAG_MAP: Record<string, string> = {
  en: 'en-US',
  es: 'es-419', // Latin American Spanish
  fr: 'fr-FR',
  pt: 'pt-BR',
};

function getIntlLocale(): string {
  const appLocale = getLocale();
  return LOCALE_TAG_MAP[appLocale] ?? getDeviceLocaleString();
}

// ── Currency formatting ───────────────────────────────────────────────────────

/**
 * Format a price with the correct currency symbol and locale.
 * @param amount  Numeric price
 * @param currency ISO 4217 code e.g. 'USD', 'JMD', 'GBP', 'EUR', 'BSD'
 * @param opts.compact  Show compact notation e.g. "$1.8K"
 */
export function formatPrice(
  amount: number,
  currency = 'USD',
  opts: { compact?: boolean; showDecimals?: boolean } = {}
): string {
  try {
    return new Intl.NumberFormat(getIntlLocale(), {
      style: 'currency',
      currency,
      maximumFractionDigits: opts.showDecimals ? 2 : 0,
      notation: opts.compact ? 'compact' : 'standard',
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies in older JS engines
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/**
 * Format a rental price with "/month" suffix using translated label.
 */
export function formatRentalPrice(amount: number, currency = 'USD'): string {
  const price = formatPrice(amount, currency);
  // Import lazily to avoid circular dep
  const { t } = require('./i18n') as { t: (k: string) => string };
  return `${price}${t('listing.perMonth')}`;
}

/**
 * Format a price range for filter display.
 */
export function formatPriceRange(
  min: number | null,
  max: number | null,
  currency = 'USD'
): string {
  const { t } = require('./i18n') as { t: (k: string) => string };
  if (!min && !max) return t('search.anyPrice');
  if (!max) return `${formatPrice(min!, currency)}+`;
  if (!min) return `Up to ${formatPrice(max, currency)}`;
  return `${formatPrice(min, currency)} – ${formatPrice(max, currency)}`;
}

// ── Date / time formatting ────────────────────────────────────────────────────

/**
 * Format an ISO date string as a localised date.
 * e.g. "March 15, 2025" / "15 mars 2025"
 */
export function formatDate(
  isoString: string | null | undefined,
  style: 'short' | 'medium' | 'long' = 'medium'
): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';

    const options: Intl.DateTimeFormatOptions =
      style === 'short'
        ? { month: 'short', day: 'numeric', year: 'numeric' }
        : style === 'medium'
        ? { month: 'long', day: 'numeric', year: 'numeric' }
        : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

    return new Intl.DateTimeFormat(getIntlLocale(), options).format(date);
  } catch {
    return isoString.split('T')[0] ?? isoString;
  }
}

/**
 * Format an ISO date as a relative time string.
 * e.g. "3 months ago" / "hace 3 meses" / "il y a 3 mois"
 */
export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30.44);
    const diffYears = Math.floor(diffDays / 365.25);

    const rtf = new Intl.RelativeTimeFormat(getIntlLocale(), { numeric: 'auto' });

    if (diffSecs < 60)     return rtf.format(-diffSecs, 'second');
    if (diffMins < 60)     return rtf.format(-diffMins, 'minute');
    if (diffHours < 24)    return rtf.format(-diffHours, 'hour');
    if (diffDays < 30)     return rtf.format(-diffDays, 'day');
    if (diffMonths < 12)   return rtf.format(-diffMonths, 'month');
    return rtf.format(-diffYears, 'year');
  } catch {
    return formatDate(isoString, 'short');
  }
}

/**
 * Format membership duration.
 * e.g. "Member for 2 years" → calls formatRelativeTime
 */
export function formatMemberSince(createdAt: string | null | undefined): string {
  return formatRelativeTime(createdAt);
}

// ── Number formatting ─────────────────────────────────────────────────────────

export function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(getIntlLocale()).format(n);
  } catch {
    return String(n);
  }
}

export function formatCompactNumber(n: number): string {
  try {
    return new Intl.NumberFormat(getIntlLocale(), { notation: 'compact' }).format(n);
  } catch {
    return String(n);
  }
}

// ── Currency detection from country ──────────────────────────────────────────

const COUNTRY_CURRENCY: Record<string, string> = {
  BS: 'BSD', // Bahamas
  US: 'USD',
  GB: 'GBP',
  JM: 'JMD', // Jamaica
  TT: 'TTD', // Trinidad & Tobago
  BB: 'BBD', // Barbados
  GY: 'GYD', // Guyana
  SR: 'SRD', // Suriname
  BZ: 'BZD', // Belize
  AG: 'XCD', // Antigua (Eastern Caribbean Dollar)
  LC: 'XCD', // Saint Lucia
  VC: 'XCD', // Saint Vincent
  GD: 'XCD', // Grenada
  DM: 'XCD', // Dominica
  KN: 'XCD', // Saint Kitts
  HT: 'HTG', // Haiti
  DO: 'DOP', // Dominican Republic
  CU: 'CUP', // Cuba
  PR: 'USD', // Puerto Rico
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  EU: 'EUR',
  FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR',
  NG: 'NGN', // Nigeria
  GH: 'GHS', // Ghana
  KE: 'KES', // Kenya
  ZA: 'ZAR', // South Africa
  AE: 'AED', // UAE
};

export function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? 'USD';
}

// ── Score formatting ──────────────────────────────────────────────────────────

export function formatScore(score: number | null | undefined): string {
  if (score == null) return '—';
  return score.toFixed(1);
}

export function formatReviewCount(count: number): string {
  if (count === 0) return '';
  if (count === 1) return '(1 review)';
  return `(${formatCompactNumber(count)} reviews)`;
}
