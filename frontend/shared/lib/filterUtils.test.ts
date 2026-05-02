import { describe, expect, it } from 'vitest';
import { applyFilters } from './filterUtils';

const sortIds = (ids: string[]) => ids.sort((a, b) => a.localeCompare(b));

type Employee = {
  id: string;
  name: string;
  status: string;
  branch: string;
  date: string;
  salary: number;
  sponsorship_status: string | null;
};

const SAMPLE_DATA: Employee[] = [
  { id: '1', name: 'أحمد', status: 'active', branch: 'makkah', date: '2026-03-01', salary: 3000, sponsorship_status: 'on_kafala' },
  { id: '2', name: 'خالد', status: 'inactive', branch: 'jeddah', date: '2026-03-15', salary: 4500, sponsorship_status: 'not_on_kafala' },
  { id: '3', name: 'سعيد', status: 'active', branch: 'jeddah', date: '2026-02-10', salary: 2000, sponsorship_status: null },
  { id: '4', name: 'محمد', status: 'pending', branch: 'makkah', date: '2026-04-01', salary: 5000, sponsorship_status: 'on_kafala' },
];

describe('applyFilters', () => {
  it('returns all data when filters empty', () => {
    const result = applyFilters(SAMPLE_DATA, {}, { status: 'status' });
    expect(result).toHaveLength(4);
  });

  it('filters by multi_select — matching values', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { status: ['active'] },
      { status: 'status' },
    );
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.status === 'active')).toBe(true);
  });

  it('returns all when multi_select values = []', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { status: [] },
      { status: 'status' },
    );
    expect(result).toHaveLength(4);
  });

  it('filters by date_range from/to', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { date_range: ['2026-03-01', '2026-03-31'] },
      { date_range: 'date' },
    );
    expect(result).toHaveLength(2);
    expect(sortIds(result.map((r) => r.id))).toEqual(['1', '2']);
  });

  it('filters by number_range', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { salary_range: ['3000', '4500'] },
      { salary_range: 'salary' },
    );
    expect(result).toHaveLength(2);
    expect(sortIds(result.map((r) => r.id))).toEqual(['1', '2']);
  });

  it('multiple filters use AND logic', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { status: ['active'], branch: ['jeddah'] },
      { status: 'status', branch: 'branch' },
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('unknown fieldMap key → no filtering', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { unknown_key: ['something'] },
      { status: 'status' },
    );
    expect(result).toHaveLength(4);
  });

  it('handles null item values safely', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { kafala: ['on_kafala'] },
      { kafala: 'sponsorship_status' },
    );
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.sponsorship_status === 'on_kafala')).toBe(true);
  });

  it('date_range with only from (no upper bound)', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { date_range: ['2026-03-15', ''] },
      { date_range: 'date' },
    );
    expect(result).toHaveLength(2);
    expect(sortIds(result.map((r) => r.id))).toEqual(['2', '4']);
  });

  it('date_range with only to (no lower bound)', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { date_range: ['', '2026-03-01'] },
      { date_range: 'date' },
    );
    expect(result).toHaveLength(2);
    expect(sortIds(result.map((r) => r.id))).toEqual(['1', '3']);
  });

  it('filters correctly when multiple values selected', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { status: ['active', 'pending'] },
      { status: 'status' },
    );
    expect(result).toHaveLength(3);
    expect(sortIds(result.map((r) => r.id))).toEqual(['1', '3', '4']);
  });

  it('handles item with undefined field gracefully', () => {
    const rows: Employee[] = [
      ...SAMPLE_DATA,
      { id: '5', name: 'بدون حالة', status: undefined as unknown as string, branch: 'makkah', date: '2026-03-01', salary: 1000, sponsorship_status: null },
    ];
    const result = applyFilters(rows, { status: ['active'] }, { status: 'status' });
    expect(result.every((r) => r.status === 'active')).toBe(true);
  });

  it('date_range: excludes items before "from" date', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { date_range: ['2026-03-10', '2026-04-30'] },
      { date_range: 'date' },
    );
    expect(sortIds(result.map((r) => r.id))).toEqual(['2', '4']);
  });

  it('date_range: excludes items after "to" date', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { date_range: ['2026-01-01', '2026-02-28'] },
      { date_range: 'date' },
    );
    expect(sortIds(result.map((r) => r.id))).toEqual(['3']);
  });

  it('date_range: includes items within range', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { date_range: ['2026-03-01', '2026-03-31'] },
      { date_range: 'date' },
    );
    expect(sortIds(result.map((r) => r.id))).toEqual(['1', '2']);
  });

  it('number_range: excludes items below min', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { salary_range: ['3000', '5000'] },
      { salary_range: 'salary' },
    );
    expect(result.find((r) => r.id === '3')).toBeUndefined();
  });

  it('number_range: excludes items above max', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { salary_range: ['2000', '4500'] },
      { salary_range: 'salary' },
    );
    expect(result.find((r) => r.id === '4')).toBeUndefined();
  });

  it('returns empty array when no items match filter', () => {
    const result = applyFilters(
      SAMPLE_DATA,
      { status: ['nonexistent_status'] },
      { status: 'status' },
    );
    expect(result).toHaveLength(0);
  });
});
