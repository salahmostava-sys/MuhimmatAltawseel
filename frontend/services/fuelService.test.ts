import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, type MockQueryResult } from '@shared/test/mocks/supabaseClientMock';

const { tableResults, fromMock } = vi.hoisted(() => {
  const tableResultsLocal: Record<string, MockQueryResult> = {};
  return {
    tableResults: tableResultsLocal,
    fromMock: vi.fn((table: string) => createQueryBuilder(tableResultsLocal[table] ?? { data: null, error: null })),
  };
});

vi.mock('@services/supabase/client', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('@services/serviceError', () => ({
  handleSupabaseError: vi.fn((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'service error';
    throw new Error(`${context}: ${message}`);
  }),
}));

import { fuelService } from './fuelService';

describe('fuelService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableResults.clear();
  });

  it('getActiveEmployees returns array', async () => {
    tableResults.employees = {
      data: [{ id: 'e1', name: 'أحمد', city: 'makkah' }],
      error: null,
    };

    const result = await fuelService.getActiveEmployees();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('أحمد');
    expect(fromMock).toHaveBeenCalledWith('employees');
  });

  it('getActiveEmployees throws on error', async () => {
    tableResults.employees = {
      data: null,
      error: new Error('connection refused'),
    };

    await expect(fuelService.getActiveEmployees()).rejects.toThrow(
      'fuelService.getActiveEmployees: connection refused',
    );
  });

  it('getActiveApps returns array', async () => {
    tableResults.apps = {
      data: [{ id: 'a1', name: 'هنقرستيشن' }],
      error: null,
    };

    const result = await fuelService.getActiveApps();
    expect(result).toHaveLength(1);
    expect(fromMock).toHaveBeenCalledWith('apps');
  });

  it('getActiveApps throws on error', async () => {
    tableResults.apps = {
      data: null,
      error: new Error('query error'),
    };

    await expect(fuelService.getActiveApps()).rejects.toThrow(
      'fuelService.getActiveApps: query error',
    );
  });

  it('getDailyMileageByMonth returns array', async () => {
    tableResults.vehicle_mileage_daily = {
      data: [{ id: 'vm1', employee_id: 'e1', km_total: 120, fuel_cost: 50 }],
      error: null,
    };

    const result = await fuelService.getDailyMileageByMonth('2026-03-01', '2026-03-31');
    expect(result).toHaveLength(1);
    expect(result[0].km_total).toBe(120);
  });

  it('getDailyMileageByMonth throws on error', async () => {
    tableResults.vehicle_mileage_daily = {
      data: null,
      error: new Error('timeout'),
    };

    await expect(
      fuelService.getDailyMileageByMonth('2026-03-01', '2026-03-31'),
    ).rejects.toThrow('fuelService.getDailyMileageByMonth: timeout');
  });

  it('upsertDailyMileage throws on error', async () => {
    tableResults.vehicle_mileage_daily = {
      data: null,
      error: new Error('upsert conflict'),
    };

    await expect(
      fuelService.upsertDailyMileage({
        employee_id: '11111111-1111-1111-1111-111111111111',
        date: '2026-03-15',
        km_total: 100,
        fuel_cost: 45,
        notes: null,
      }),
    ).rejects.toThrow('fuelService.upsertDailyMileage.upsert: upsert conflict');
  });

  it('deleteDailyMileage throws on error', async () => {
    tableResults.vehicle_mileage_daily = {
      data: null,
      error: new Error('delete failed'),
    };

    await expect(fuelService.deleteDailyMileage('vm1')).rejects.toThrow(
      'fuelService.deleteDailyMileage: delete failed',
    );
  });

  it('getActiveVehicleAssignments returns array', async () => {
    tableResults.vehicle_assignments = {
      data: [{ employee_id: 'e1', vehicles: { plate_number: 'ABC 123' } }],
      error: null,
    };

    const result = await fuelService.getActiveVehicleAssignments();
    expect(result).toHaveLength(1);
  });
});
