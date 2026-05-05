// formatters.ts - Utility functions for formatting dates, currency, and numbers

/**
 * Normalize Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to ASCII (0123456789).
 * Handles input from date pickers on Arabic-locale devices.
 */
export function normalizeArabicDigits(value: string): string {
  return value.replaceAll(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/**
 * Format a date to YYYY-MM-DD format.
 * @param date - The date object to format.
 * @returns Formatted date string.
 */
export function formatDate(date: Date | null | undefined): string {
    if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format a number as currency.
 * @param amount - The amount to format.
 * @param currencySymbol - The symbol of the currency (default is '$').
 * @returns Formatted currency string.
 */
export function formatCurrency(amount: number | null | undefined, currencySymbol: string = '$'): string {
    if (amount === null || amount === undefined || Number.isNaN(amount)) {
        return `${currencySymbol}0.00`;
    }
    return `${currencySymbol}${amount.toFixed(2)}`;
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone).
 * Drop-in replacement for the common `format(new Date(), 'yyyy-MM-dd')` pattern
 * that avoids importing date-fns just for this.
 */
export function todayISO(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format a number with commas as thousands separators.
 * @param num - The number to format.
 * @returns Formatted number string.
 */
export function formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined || Number.isNaN(num)) {
        return '0';
    }
    return new Intl.NumberFormat('en-US').format(num);
}