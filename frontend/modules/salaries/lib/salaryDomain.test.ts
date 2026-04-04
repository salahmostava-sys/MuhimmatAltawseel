import { describe, expect, it } from 'vitest';
import { buildPlatformSetupWarnings, shouldIncludeEmployeeInSalaryMonth } from './salaryDomain';
import type { AppWithSchemeRow, SalaryRow } from '@modules/salaries/types/salary.types';
import type { PricingRule } from '@services/salaryService';

const buildRow = (registeredApps: string[]): SalaryRow => ({
  id: `row-${registeredApps.join('-') || 'none'}`,
  employeeId: 'emp-1',
  employeeName: 'Employee One',
  jobTitle: 'Driver',
  nationalId: '1234567890',
  city: 'Makkah',
  cityKey: 'makkah',
  bankAccount: '123456',
  hasIban: true,
  paymentMethod: 'bank',
  registeredApps,
  platformOrders: {},
  platformSalaries: {},
  platformMetrics: {},
  incentives: 0,
  sickAllowance: 0,
  violations: 0,
  customDeductions: {},
  transfer: 0,
  advanceDeduction: 0,
  advanceInstallmentIds: [],
  advanceRemaining: 0,
  externalDeduction: 0,
  status: 'pending',
  preferredLanguage: 'ar',
  phone: null,
  workDays: 0,
  fuelCost: 0,
  platformIncome: 0,
});

describe('buildPlatformSetupWarnings', () => {
  it('limits warnings to platforms that affect current salary rows', () => {
    const apps: AppWithSchemeRow[] = [
      { id: 'jahiz-id', name: 'Jahiz', salary_schemes: null },
      {
        id: 'keeta-id',
        name: 'Keeta',
        salary_schemes: {
          id: 'scheme-1',
          name: 'Scheme 1',
          name_en: null,
          status: 'active',
          target_orders: null,
          target_bonus: null,
        },
      },
      { id: 'unused-id', name: 'Unused', salary_schemes: null },
    ];

    const rulesMap: Record<string, PricingRule[]> = {
      'jahiz-id': [],
      'keeta-id': [],
      'unused-id': [],
    };

    const result = buildPlatformSetupWarnings({
      apps,
      rulesMap,
      rows: [buildRow(['Jahiz']), buildRow(['Keeta'])],
    });

    expect(result.appsWithoutScheme).toEqual(['Jahiz']);
    expect(result.appsWithoutPricingRules).toEqual(['Jahiz', 'Keeta']);
  });

  it('returns no warnings when there is no platform activity this month', () => {
    const result = buildPlatformSetupWarnings({
      apps: [{ id: 'app-1', name: 'Keeta', salary_schemes: null }],
      rulesMap: { 'app-1': [] },
      rows: [buildRow([])],
    });

    expect(result.appsWithoutScheme).toEqual([]);
    expect(result.appsWithoutPricingRules).toEqual([]);
  });
});
describe('shouldIncludeEmployeeInSalaryMonth', () => {
  it('excludes absconded or terminated employees when they have no monthly activity', () => {
    expect(
      shouldIncludeEmployeeInSalaryMonth(
        { id: 'emp-1', sponsorship_status: 'terminated' },
        {},
        {},
        {},
      ),
    ).toBe(false);
  });
  it('keeps excluded employees when they still have monthly orders or attendance', () => {
    expect(
      shouldIncludeEmployeeInSalaryMonth(
        { id: 'emp-1', sponsorship_status: 'absconded' },
        { 'emp-1': { Keeta: 2 } },
        {},
        {},
      ),
    ).toBe(true);
    expect(
      shouldIncludeEmployeeInSalaryMonth(
        { id: 'emp-2', sponsorship_status: 'terminated' },
        {},
        { 'emp-2': 1 },
        {},
      ),
    ).toBe(true);
  });
  it('keeps excluded employees when preview data still shows platform activity', () => {
    expect(
      shouldIncludeEmployeeInSalaryMonth(
        { id: 'emp-3', sponsorship_status: 'terminated' },
        {},
        {},
        {
          'emp-3': {
            base_salary: 0,
            advance_deduction: 0,
            external_deduction: 0,
            total_shift_days: 0,
            platform_breakdown: {
              Keeta: {
                appName: 'Keeta',
                workType: 'shift',
                calculationMethod: null,
                ordersCount: 0,
                shiftDays: 2,
                salary: 250,
              },
            },
          },
        },
      ),
    ).toBe(true);
  });
});
