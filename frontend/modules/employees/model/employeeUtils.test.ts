import { describe, expect, it } from 'vitest';
import { applyEmployeeFilters, type Employee } from './employeeUtils';

const baseEmployee = (overrides: Partial<Employee>): Employee => ({
  id: overrides.id || 'emp-1',
  name: overrides.name || 'Ahmed',
  status: overrides.status || 'active',
  salary_type: overrides.salary_type || 'shift',
  base_salary: overrides.base_salary || 0,
  ...overrides,
});

describe('applyEmployeeFilters', () => {
  it('filters by English name text', () => {
    const result = applyEmployeeFilters(
      [
        baseEmployee({ id: 'emp-1', name_en: 'Ahmed Ali' }),
        baseEmployee({ id: 'emp-2', name_en: 'Mohamed Hassan' }),
      ],
      { name_en: 'ahmed' },
    );

    expect(result.map((employee) => employee.id)).toEqual(['emp-1']);
  });

  it('filters by assigned platform app ids', () => {
    const result = applyEmployeeFilters(
      [
        baseEmployee({
          id: 'emp-1',
          platform_apps: [{ id: 'app-orders', name: 'Orders' }],
        }),
        baseEmployee({
          id: 'emp-2',
          platform_apps: [{ id: 'app-shifts', name: 'Shifts' }],
        }),
      ],
      { platform_apps: 'app-shifts' },
    );

    expect(result.map((employee) => employee.id)).toEqual(['emp-2']);
  });

  it('filters date columns using YYYY-MM-DD values', () => {
    const result = applyEmployeeFilters(
      [
        baseEmployee({
          id: 'emp-1',
          join_date: '2026-04-01',
          residency_expiry: '2026-12-31',
          health_insurance_expiry: '2026-11-15',
          license_expiry: '2026-10-20',
        }),
        baseEmployee({
          id: 'emp-2',
          join_date: '2026-03-01',
          residency_expiry: '2026-08-30',
          health_insurance_expiry: '2026-09-01',
          license_expiry: '2026-07-07',
        }),
      ],
      {
        join_date: '2026-04-01',
        residency_combined: '2026-12-31',
        health_insurance_expiry: '2026-11-15',
        license_expiry: '2026-10-20',
      },
    );

    expect(result.map((employee) => employee.id)).toEqual(['emp-1']);
  });

  it('filters by status exactly', () => {
    const result = applyEmployeeFilters(
      [
        baseEmployee({ id: 'emp-1', status: 'active' }),
        baseEmployee({ id: 'emp-2', status: 'inactive' }),
      ],
      { status: 'inactive' },
    );

    expect(result.map((employee) => employee.id)).toEqual(['emp-2']);
  });
});
