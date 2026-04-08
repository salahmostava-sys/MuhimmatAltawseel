import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryBuilder, type MockQueryResult } from '@shared/test/mocks/supabaseClientMock';

const { tableResults, fromMock, getMonthRecordsForSalaryContextMock, getSalaryPreviewForMonthMock } = vi.hoisted(() => {
  const tableResultsLocal: Record<string, MockQueryResult> = {};

  return {
    tableResults: tableResultsLocal,
    fromMock: vi.fn((table: string) => createQueryBuilder(tableResultsLocal[table] ?? { data: null, error: null })),
    getMonthRecordsForSalaryContextMock: vi.fn(),
    getSalaryPreviewForMonthMock: vi.fn(),
  };
});

vi.mock('@services/supabase/client', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('@services/serviceError', () => ({
  toServiceError: vi.fn((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'service error';
    return new Error(`${context}: ${message}`);
  }),
}));

vi.mock('@services/salaryService', () => ({
  salaryService: {
    getMonthRecordsForSalaryContext: getMonthRecordsForSalaryContextMock,
    getSalaryPreviewForMonth: getSalaryPreviewForMonthMock,
  },
}));

import { calculateSalary, employeePerformanceService } from './employeePerformanceService';

describe('employeePerformanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(tableResults).forEach((key) => delete tableResults[key]);
    getMonthRecordsForSalaryContextMock.mockResolvedValue([]);
    getSalaryPreviewForMonthMock.mockResolvedValue([]);
  });

  it('calculates hybrid salary from the centralized fallback formula', () => {
    const result = calculateSalary(
      {
        id: 'hybrid-1',
        base_salary: 3000,
        salary_type: 'shift',
        work_type: 'hybrid',
      },
      {
        workType: 'hybrid',
        orderSalaryComponent: 550,
        deductions: 200,
        bonus: 100,
        salary: 0,
      },
    );

    expect(result).toBe(3450);
  });

  it('builds dashboard data by work type and merges hybrid orders + attendance metrics', async () => {
    tableResults.employees = {
      data: [
        {
          id: 'orders-1',
          name: 'طلبات فقط',
          phone: null,
          city: 'makkah',
          join_date: '2025-01-01',
          salary_type: 'orders',
          work_type: 'orders',
          base_salary: 0,
          status: 'active',
        },
        {
          id: 'attendance-1',
          name: 'حضور فقط',
          phone: null,
          city: 'jeddah',
          join_date: '2025-01-01',
          salary_type: 'shift',
          work_type: 'attendance',
          base_salary: 3000,
          status: 'active',
        },
        {
          id: 'hybrid-1',
          name: 'مختلط',
          phone: null,
          city: 'makkah',
          join_date: '2025-01-01',
          salary_type: 'shift',
          work_type: 'hybrid',
          base_salary: 3000,
          status: 'active',
        },
      ],
      error: null,
    };

    tableResults.daily_orders = {
      data: [
        { employee_id: 'orders-1', date: '2026-04-01', app_id: 'app-a', orders_count: 10, apps: { name: 'جاهز', brand_color: '#111111' } },
        { employee_id: 'orders-1', date: '2026-04-02', app_id: 'app-a', orders_count: 5, apps: { name: 'جاهز', brand_color: '#111111' } },
        { employee_id: 'hybrid-1', date: '2026-04-03', app_id: 'app-b', orders_count: 6, apps: { name: 'تويو', brand_color: '#222222' } },
      ],
      error: null,
    };

    tableResults.attendance = {
      data: [
        { employee_id: 'attendance-1', date: '2026-04-01', status: 'present' },
        { employee_id: 'attendance-1', date: '2026-04-02', status: 'present' },
        { employee_id: 'attendance-1', date: '2026-04-03', status: 'present' },
        { employee_id: 'attendance-1', date: '2026-04-04', status: 'absent' },
        { employee_id: 'hybrid-1', date: '2026-04-01', status: 'present' },
        { employee_id: 'hybrid-1', date: '2026-04-02', status: 'present' },
        { employee_id: 'hybrid-1', date: '2026-04-03', status: 'absent' },
      ],
      error: null,
    };

    tableResults.employee_targets = {
      data: [
        { employee_id: 'orders-1', monthly_target_orders: 20, daily_target_orders: 1 },
        { employee_id: 'hybrid-1', monthly_target_orders: 10, daily_target_orders: 1 },
      ],
      error: null,
    };

    getSalaryPreviewForMonthMock.mockResolvedValue([
      {
        employee_id: 'orders-1',
        total_orders: 15,
        total_shift_days: 0,
        base_salary: 750,
        external_deduction: 0,
        advance_deduction: 0,
        net_salary: 750,
        platform_breakdown: [
          {
            app_id: 'app-a',
            app_name: 'جاهز',
            work_type: 'orders',
            calculation_method: 'orders',
            orders_count: 15,
            shift_days: 0,
            earnings: 750,
          },
        ],
      },
      {
        employee_id: 'hybrid-1',
        total_orders: 6,
        total_shift_days: 2,
        base_salary: 3500,
        external_deduction: 0,
        advance_deduction: 0,
        net_salary: 3400,
        platform_breakdown: [
          {
            app_id: 'app-b',
            app_name: 'تويو',
            work_type: 'orders',
            calculation_method: 'orders',
            orders_count: 6,
            shift_days: 0,
            earnings: 500,
          },
        ],
      },
    ]);

    const allRows = await employeePerformanceService.getDashboardData('all', '2026-04');
    const hybridRow = allRows.find((row) => row.employeeId === 'hybrid-1');
    const attendanceRows = await employeePerformanceService.getDashboardData('attendance', '2026-04');

    expect(allRows).toHaveLength(3);
    expect(hybridRow).toMatchObject({
      workType: 'hybrid',
      totalOrders: 6,
      daysPresent: 2,
      daysAbsent: 1,
      salary: 3400,
    });
    expect(attendanceRows).toHaveLength(1);
    expect(attendanceRows[0]).toMatchObject({
      employeeId: 'attendance-1',
      workType: 'attendance',
      daysPresent: 3,
      daysAbsent: 1,
    });
  });
});
