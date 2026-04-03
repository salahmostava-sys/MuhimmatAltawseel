// formatters.ts - Utility functions for formatting dates, currency, and numbers

/**
 * Format a date to YYYY-MM-DD format.
 * @param date - The date object to format.
 * @returns Formatted date string.
 */
export function formatDate(date: Date | null | undefined): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
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
    if (amount == null || isNaN(amount)) {
        return `${currencySymbol}0.00`;
    }
    return `${currencySymbol}${amount.toFixed(2)}`;
}

/**
 * Format a number with commas as thousands separators.
 * @param num - The number to format.
 * @returns Formatted number string.
 */
export function formatNumber(num: number | null | undefined): string {
    if (num == null || isNaN(num)) {
        return '0';
    }
    return new Intl.NumberFormat('en-US').format(num);
}