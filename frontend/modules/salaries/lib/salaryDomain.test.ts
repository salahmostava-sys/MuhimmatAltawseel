import { describe, expect, it } from 'vitest';
import { buildPlatformSetupWarnings, buildSalaryRows, shouldIncludeEmployeeInSalaryMonth } from './salaryDomain';
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
  it('includes administrative titles even without monthly activity', () => {
    expect(
      shouldIncludeEmployeeInSalaryMonth(
        { id: 'emp-4', job_title: 'مدير عمليات', sponsorship_status: 'not_sponsored' },
        {},
        {},
        {},
      ),
    ).toBe(true);
  });
  it('excludes non-administrative titles when they have no monthly activity', () => {
    expect(
      shouldIncludeEmployeeInSalaryMonth(
        { id: 'emp-5', job_title: 'مندوب توصيل', sponsorship_status: 'not_sponsored' },
        {},
        {},
        {},
      ),
    ).toBe(false);
  });
  it('keeps saved salary rows visible even when monthly activity is missing', () => {
    expect(
      shouldIncludeEmployeeInSalaryMonth(
        { id: 'emp-6', job_title: 'مندوب توصيل', sponsorship_status: 'not_sponsored' },
        {},
        {},
        {},
        new Set(['emp-6']),
      ),
    ).toBe(true);
  });
});

describe('buildSalaryRows', () => {
  it('recomputes order-based preview salaries from the current scheme when preview earnings drift', () => {
    const rows = buildSalaryRows({
      employees: [
        {
          id: 'emp-1',
          name: 'Employee One',
          job_title: 'Driver',
          national_id: '1234567890',
          city: 'makkah',
          iban: 'SA123456',
          preferred_language: 'ar',
          phone: '0550000000',
        },
      ],
      selectedMonth: '2026-04',
      platformNames: ['Keeta'],
      appNameToId: { Keeta: 'keeta-id' },
      appWorkTypeMap: { Keeta: 'orders' },
      rulesMap: { 'keeta-id': [] },
      appSchemeMap: {
        Keeta: {
          id: 'scheme-1',
          name: 'Keeta Scheme',
          name_en: null,
          status: 'active',
          scheme_type: 'order_based',
          target_orders: null,
          target_bonus: null,
          salary_scheme_tiers: [
            {
              from_orders: 450,
              to_orders: null,
              price_per_order: 2500,
              tier_order: 1,
              tier_type: 'base_plus_incremental',
              incremental_threshold: 450,
              incremental_price: 5,
            },
          ],
        },
      },
      ordMap: { 'emp-1': { Keeta: 542 } },
      attendanceDaysMap: {},
      savedMap: {},
      previewMap: {
        'emp-1': {
          base_salary: 2910,
          advance_deduction: 0,
          external_deduction: 0,
          total_shift_days: 0,
          platform_breakdown: {
            Keeta: {
              appName: 'Keeta',
              workType: 'orders',
              calculationMethod: 'orders',
              ordersCount: 542,
              shiftDays: 0,
              salary: 2910,
            },
          },
        },
      },
      advInstIds: {},
      deductedInstIds: {},
      advRemainingMap: {},
      fuelCostMap: {},
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].platformSalaries.Keeta).toBe(2960);
    expect(rows[0].platformMetrics.Keeta.salary).toBe(2960);
  });

  it('restores approved salary rows from the saved sheet snapshot', () => {
    const rows = buildSalaryRows({
      employees: [
        {
          id: 'emp-1',
          name: 'Employee One',
          job_title: 'Driver',
          national_id: '1234567890',
          city: 'makkah',
          iban: 'SA123456',
          preferred_language: 'ar',
          phone: '0550000000',
        },
      ],
      selectedMonth: '2026-04',
      platformNames: ['Keeta'],
      appNameToId: { Keeta: 'keeta-id' },
      appWorkTypeMap: { Keeta: 'orders' },
      rulesMap: { 'keeta-id': [] },
      appSchemeMap: {
        Keeta: {
          id: 'scheme-1',
          name: 'Keeta Scheme',
          name_en: null,
          status: 'active',
          scheme_type: 'order_based',
          target_orders: null,
          target_bonus: null,
          salary_scheme_tiers: [],
        },
      },
      ordMap: { 'emp-1': { Keeta: 300 } },
      attendanceDaysMap: {},
      savedMap: {
        'emp-1': {
          is_approved: true,
          net_salary: 3320,
          base_salary: 3100,
          allowances: 220,
          attendance_deduction: 30,
          advance_deduction: 50,
          external_deduction: 20,
          manual_deduction: 0,
          payment_method: 'cash',
          sheet_snapshot: {
            bankAccount: '654321',
            hasIban: true,
            paymentMethod: 'cash',
            platformOrders: { Keeta: 410 },
            platformSalaries: { Keeta: 3100 },
            platformMetrics: {
              Keeta: {
                appName: 'Keeta',
                workType: 'orders',
                calculationMethod: 'orders',
                ordersCount: 410,
                shiftDays: 0,
                salary: 3100,
              },
            },
            incentives: 180,
            sickAllowance: 40,
            violations: 30,
            customDeductions: { 'manual___خصم يدوي': 25 },
            transfer: 500,
            advanceDeduction: 50,
            externalDeduction: 20,
            platformIncome: 7200,
            engineBaseSalary: 3100,
          },
        },
      },
      previewMap: {
        'emp-1': {
          base_salary: 2500,
          advance_deduction: 10,
          external_deduction: 5,
          total_shift_days: 0,
          platform_breakdown: {
            Keeta: {
              appName: 'Keeta',
              workType: 'orders',
              calculationMethod: 'orders',
              ordersCount: 300,
              shiftDays: 0,
              salary: 2500,
            },
          },
        },
      },
      advInstIds: {},
      deductedInstIds: {},
      advRemainingMap: {},
      fuelCostMap: {},
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].paymentMethod).toBe('cash');
    expect(rows[0].platformOrders.Keeta).toBe(410);
    expect(rows[0].platformSalaries.Keeta).toBe(3100);
    expect(rows[0].incentives).toBe(180);
    expect(rows[0].sickAllowance).toBe(40);
    expect(rows[0].customDeductions).toEqual({ 'manual___خصم يدوي': 25 });
    expect(rows[0].transfer).toBe(500);
    expect(rows[0].preferEngineBaseSalary).toBe(false);
  });

  it('falls back to saved aggregate fields when older records do not have a sheet snapshot', () => {
    const rows = buildSalaryRows({
      employees: [
        {
          id: 'emp-1',
          name: 'Employee One',
          job_title: 'Driver',
          national_id: '1234567890',
          city: 'makkah',
          iban: 'SA123456',
          preferred_language: 'ar',
          phone: '0550000000',
        },
      ],
      selectedMonth: '2026-04',
      platformNames: ['Keeta'],
      appNameToId: { Keeta: 'keeta-id' },
      appWorkTypeMap: { Keeta: 'orders' },
      rulesMap: { 'keeta-id': [] },
      appSchemeMap: {
        Keeta: {
          id: 'scheme-1',
          name: 'Keeta Scheme',
          name_en: null,
          status: 'active',
          scheme_type: 'order_based',
          target_orders: null,
          target_bonus: null,
          salary_scheme_tiers: [],
        },
      },
      ordMap: { 'emp-1': { Keeta: 120 } },
      attendanceDaysMap: {},
      savedMap: {
        'emp-1': {
          is_approved: true,
          net_salary: 1885,
          base_salary: 1800,
          allowances: 200,
          attendance_deduction: 30,
          advance_deduction: 50,
          external_deduction: 10,
          manual_deduction: 25,
          payment_method: 'cash',
          sheet_snapshot: null,
        },
      },
      previewMap: {
        'emp-1': {
          base_salary: 900,
          advance_deduction: 5,
          external_deduction: 2,
          total_shift_days: 0,
          platform_breakdown: {
            Keeta: {
              appName: 'Keeta',
              workType: 'orders',
              calculationMethod: 'orders',
              ordersCount: 120,
              shiftDays: 0,
              salary: 900,
            },
          },
        },
      },
      advInstIds: {},
      deductedInstIds: {},
      advRemainingMap: {},
      fuelCostMap: {},
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].paymentMethod).toBe('cash');
    expect(rows[0].incentives).toBe(200);
    expect(rows[0].violations).toBe(30);
    expect(rows[0].customDeductions).toEqual({ 'saved___خصم يدوي محفوظ': 25 });
    expect(rows[0].advanceDeduction).toBe(50);
    expect(rows[0].externalDeduction).toBe(10);
    expect(rows[0].engineBaseSalary).toBe(1800);
    expect(rows[0].preferEngineBaseSalary).toBe(true);
  });
});
