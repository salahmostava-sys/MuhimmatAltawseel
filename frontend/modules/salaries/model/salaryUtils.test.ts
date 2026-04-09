import { describe, expect, it } from 'vitest';
import { getDisplayedBaseSalary, getSalaryRowActivityTotals, isAdministrativeJobTitle } from './salaryUtils';

describe('isAdministrativeJobTitle', () => {
  it('matches common Arabic and English administration titles', () => {
    expect(isAdministrativeJobTitle('مدير عمليات')).toBe(true);
    expect(isAdministrativeJobTitle('HR Coordinator')).toBe(true);
    expect(isAdministrativeJobTitle('محاسب')).toBe(true);
  });

  it('does not classify delivery roles as administration', () => {
    expect(isAdministrativeJobTitle('مندوب توصيل')).toBe(false);
    expect(isAdministrativeJobTitle('Driver')).toBe(false);
  });
});

describe('getDisplayedBaseSalary', () => {
  it('uses platform salaries when they are present', () => {
    expect(
      getDisplayedBaseSalary({
        platformSalaries: { Keeta: 1200, Talabat: 1710 },
        engineBaseSalary: 0,
      }),
    ).toBe(2910);
  });

  it('falls back to the editable manual base salary when platform salaries are zero', () => {
    expect(
      getDisplayedBaseSalary({
        platformSalaries: { Keeta: 0, Talabat: 0 },
        engineBaseSalary: 1800,
      }),
    ).toBe(1800);
  });
});

describe('getSalaryRowActivityTotals', () => {
  it('keeps order totals separate from shift days', () => {
    expect(
      getSalaryRowActivityTotals({
        platformMetrics: {
          Keeta: {
            appName: 'Keeta',
            workType: 'orders',
            ordersCount: 7211,
            shiftDays: 0,
            salary: 0,
          },
          Hunger: {
            appName: 'Hunger',
            workType: 'hybrid',
            ordersCount: 9572,
            shiftDays: 1794,
            salary: 0,
          },
        },
      }),
    ).toEqual({
      orders: 16783,
      shiftDays: 1794,
    });
  });
});
