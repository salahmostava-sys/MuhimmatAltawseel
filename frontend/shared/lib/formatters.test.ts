import { describe, expect, it } from 'vitest';
import { formatDate, formatCurrency, formatNumber } from './formatters';

describe('formatters', () => {
  it('formatDate uses UTC', () => {
    const d = new Date(Date.UTC(2026, 2, 5));
    expect(formatDate(d)).toBe('2026-03-05');
  });

  it('formatCurrency', () => {
    expect(formatCurrency(12.3)).toBe('$12.30');
    expect(formatCurrency(1, 'ر.س')).toBe('ر.س1.00');
  });

  it('formatNumber adds thousands separators', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats SAR currency correctly', () => {
    expect(formatCurrency(1500, 'ر.س')).toBe('ر.س1500.00');
  });

  it('formatDate handles end of month', () => {
    const d = new Date(Date.UTC(2026, 0, 31));
    expect(formatDate(d)).toBe('2026-01-31');
  });

  it('formatCurrency handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formatCurrency handles negative amounts', () => {
    expect(formatCurrency(-500)).toBe('$-500.00');
  });

  it('formatNumber handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formatNumber handles negative', () => {
    expect(formatNumber(-1234)).toBe('-1,234');
  });

  it('formatDate formats single-digit month/day with leading zeros', () => {
    const d = new Date(Date.UTC(2026, 0, 5));
    expect(formatDate(d)).toBe('2026-01-05');
  });
});
