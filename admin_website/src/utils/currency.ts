// Currency formatting utility for Kazakhstan Tenge (KZT)

/**
 * Formats a number as Kazakhstan Tenge currency
 * @param amount - The amount to format
 * @param locale - The locale to use (default: 'kk-KZ' for Kazakh)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, locale: string = 'kk-KZ'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'KZT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Formats a number as Kazakhstan Tenge currency with Russian locale
 * @param amount - The amount to format
 * @returns Formatted currency string in Russian locale
 */
export const formatCurrencyRu = (amount: number): string => {
  return formatCurrency(amount, 'ru-KZ');
};

/**
 * Formats a number as Kazakhstan Tenge currency with English locale
 * @param amount - The amount to format
 * @returns Formatted currency string in English locale
 */
export const formatCurrencyEn = (amount: number): string => {
  return formatCurrency(amount, 'en-KZ');
};

/**
 * Parses a currency string back to a number
 * @param currencyString - The currency string to parse
 * @returns Parsed number or 0 if parsing fails
 */
export const parseCurrency = (currencyString: string): number => {
  // Remove currency symbols and spaces, replace comma with dot for decimal
  const cleanString = currencyString
    .replace(/[₸\s]/g, '') // Remove tenge symbol and spaces
    .replace(',', '.'); // Replace comma with dot for decimal separator
  
  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formats a number as a compact currency (K, M, B suffixes)
 * @param amount - The amount to format
 * @param locale - The locale to use (default: 'kk-KZ')
 * @returns Compact formatted currency string
 */
export const formatCurrencyCompact = (amount: number, locale: string = 'kk-KZ'): string => {
  if (amount >= 1_000_000_000) {
    return formatCurrency(amount / 1_000_000_000, locale) + 'B';
  } else if (amount >= 1_000_000) {
    return formatCurrency(amount / 1_000_000, locale) + 'M';
  } else if (amount >= 1_000) {
    return formatCurrency(amount / 1_000, locale) + 'K';
  }
  return formatCurrency(amount, locale);
};

// Currency constants
export const CURRENCY_CODE = 'KZT';
export const CURRENCY_SYMBOL = '₸';
export const DEFAULT_LOCALE = 'kk-KZ';
export const RUSSIAN_LOCALE = 'ru-KZ';
export const ENGLISH_LOCALE = 'en-KZ';
