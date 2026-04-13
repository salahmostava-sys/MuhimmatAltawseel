import { describe, expect, it } from 'vitest';
import { buildDailyDataMap } from './gridHelpers';

describe('buildDailyDataMap', () => {
  it('takes the latest value for duplicate employee-app-day rows (no summing)', () => {
    expect(
      buildDailyDataMap([
        { employee_id: 'emp-1', app_id: 'app-1', date: '2026-04-01', orders_count: 7 },
        { employee_id: 'emp-1', app_id: 'app-1', date: '2026-04-01', orders_count: 5 },
      ]),
    ).toEqual({
      'emp-1::app-1::1': 5,
    });
  });

  it('maps distinct rows correctly', () => {
    expect(
      buildDailyDataMap([
        { employee_id: 'emp-1', app_id: 'app-1', date: '2026-04-01', orders_count: 10 },
        { employee_id: 'emp-1', app_id: 'app-2', date: '2026-04-01', orders_count: 3 },
        { employee_id: 'emp-2', app_id: 'app-1', date: '2026-04-02', orders_count: 8 },
      ]),
    ).toEqual({
      'emp-1::app-1::1': 10,
      'emp-1::app-2::1': 3,
      'emp-2::app-1::2': 8,
    });
  });
});
