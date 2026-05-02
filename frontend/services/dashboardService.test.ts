import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, type MockQueryResult } from '@shared/test/mocks/supabaseClientMock';

const { tableResults, fromMock, rpcMock } = vi.hoisted(() => {
  const tableResultsLocal: Record<string, MockQueryResult> = {};
  return {
    tableResults: tableResultsLocal,
    fromMock: vi.fn((table: string) => createQueryBuilder(tableResultsLocal[table] ?? { data: null, error: null })),
    rpcMock: vi.fn(),
  };
});

vi.mock('@services/supabase/client', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

vi.mock('@services/serviceError', () => ({
  handleSupabaseError: vi.fn((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'service error';
    throw new Error(`${context}: ${message}`);
  }),
}));

import { dashboardService } from './dashboardService';

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(tableResults).forEach((key) => tableResults.delete(key));
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws when additional metrics fuel query fails', async () => {
    tableResults.fuel_records = {
      data: null,
      error: new Error('fuel down'),
    };

    await expect(dashboardService.getAdditionalMetrics('2026-04')).rejects.toThrow(
      'dashboardService.getAdditionalMetrics.fuelRes: fuel down',
    );
  });

  it('throws when operational stats employee query fails', async () => {
    tableResults.employees = {
      data: null,
      error: new Error('employees query failed'),
    };

    await expect(dashboardService.getOperationalStats('2026-04')).rejects.toThrow(
      'dashboardService.getOperationalStats.employeesRes: employees query failed',
    );
  });

  it('filters operationally hidden employees from operational stats', async () => {
    tableResults.employees = {
      data: [
        {
          id: 'emp-visible',
          status: 'active',
          sponsorship_status: 'sponsored',
          probation_end_date: null,
          city: 'makkah',
          license_status: 'has_license',
          tier_id: null,
        },
        {
          id: 'emp-hidden',
          status: 'active',
          sponsorship_status: 'terminated',
          probation_end_date: '2026-03-01',
          city: 'jeddah',
          license_status: 'applied',
          tier_id: null,
        },
      ],
      error: null,
    };
    tableResults.attendance = { data: [], error: null };
    tableResults.daily_orders = { data: [], error: null };
    tableResults.fuel_records = { data: [], error: null };
    tableResults.maintenance_records = { data: [], error: null };
    tableResults.vehicles = { data: [], error: null };
    tableResults.alerts = { data: [], error: null };

    const result = await dashboardService.getOperationalStats('2026-04');

    expect(result.employees.total).toBe(1);
    expect(result.employees.byCity.makkah).toBe(1);
    expect(result.employees.byCity.jeddah).toBe(0);
    expect(result.employees.withLicense).toBe(1);
    expect(result.employees.appliedLicense).toBe(0);
  });
});
