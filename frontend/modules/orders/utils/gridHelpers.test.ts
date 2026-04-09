import { describe, expect, it } from 'vitest';
import { buildDailyDataMap } from './gridHelpers';

describe('buildDailyDataMap', () => {
  it('sums duplicate employee-app-day rows instead of overwriting them', () => {
    expect(
      buildDailyDataMap([
        { employee_id: 'emp-1', app_id: 'app-1', date: '2026-04-01', orders_count: 7 },
        { employee_id: 'emp-1', app_id: 'app-1', date: '2026-04-01', orders_count: 5 },
      ]),
    ).toEqual({
      'emp-1::app-1::1': 12,
    });
  });
});
