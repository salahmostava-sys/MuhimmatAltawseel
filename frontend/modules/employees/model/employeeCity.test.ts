import { describe, expect, it } from 'vitest';
import {
  normalizeEmployeeCityValue,
  normalizeEmployeeCities,
  cityLabel,
  splitEmployeeCitiesInput,
} from './employeeCity';

describe('normalizeEmployeeCityValue', () => {
  it('normalizes Arabic city names', () => {
    expect(normalizeEmployeeCityValue('مكة')).toBe('makkah');
    expect(normalizeEmployeeCityValue('مكة المكرمة')).toBe('makkah');
    expect(normalizeEmployeeCityValue('مكه')).toBe('makkah');
    expect(normalizeEmployeeCityValue('جدة')).toBe('jeddah');
    expect(normalizeEmployeeCityValue('جده')).toBe('jeddah');
  });

  it('normalizes English city names', () => {
    expect(normalizeEmployeeCityValue('makkah')).toBe('makkah');
    expect(normalizeEmployeeCityValue('mecca')).toBe('makkah');
    expect(normalizeEmployeeCityValue('jeddah')).toBe('jeddah');
    expect(normalizeEmployeeCityValue('jedda')).toBe('jeddah');
    expect(normalizeEmployeeCityValue('riyadh')).toBe('riyadh');
  });

  it('returns null for empty/null', () => {
    expect(normalizeEmployeeCityValue(null)).toBeNull();
    expect(normalizeEmployeeCityValue(undefined)).toBeNull();
    expect(normalizeEmployeeCityValue('')).toBeNull();
    expect(normalizeEmployeeCityValue('  ')).toBeNull();
  });

  it('returns raw value for unknown cities', () => {
    expect(normalizeEmployeeCityValue('unknown_city')).toBe('unknown_city');
  });
});

describe('normalizeEmployeeCities', () => {
  it('deduplicates and normalizes', () => {
    expect(normalizeEmployeeCities(['makkah', 'مكة', 'jeddah'])).toEqual(['makkah', 'jeddah']);
  });

  it('uses fallback when array is empty', () => {
    expect(normalizeEmployeeCities([], 'riyadh')).toEqual(['riyadh']);
  });

  it('handles null values', () => {
    expect(normalizeEmployeeCities([null, undefined])).toEqual([]);
  });
});

describe('splitEmployeeCitiesInput', () => {
  it('splits by comma', () => {
    expect(splitEmployeeCitiesInput('مكة, جدة')).toEqual(['مكة', 'جدة']);
  });

  it('splits by Arabic comma', () => {
    expect(splitEmployeeCitiesInput('مكة، جدة')).toEqual(['مكة', 'جدة']);
  });

  it('splits by newline', () => {
    expect(splitEmployeeCitiesInput('مكة\nجدة')).toEqual(['مكة', 'جدة']);
  });
});

describe('cityLabel', () => {
  it('returns Arabic label for known cities', () => {
    expect(cityLabel('makkah')).toBe('مكة المكرمة');
    expect(cityLabel('jeddah')).toBe('جدة');
    expect(cityLabel('riyadh')).toBe('الرياض');
  });

  it('returns fallback for unknown', () => {
    expect(cityLabel(null, '—')).toBe('—');
    expect(cityLabel('', '•')).toBe('•');
  });

  it('returns raw value for unnormalized cities', () => {
    expect(cityLabel('some_custom_city')).toBe('some_custom_city');
  });
});
