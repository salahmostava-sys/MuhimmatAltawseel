import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, type MockQueryResult } from '@shared/test/mocks/supabaseClientMock';
import { formatServiceError, resetMockTableResults } from '@shared/test/mocks/serviceLayerTestUtils';

const { tableResults, fromMock } = vi.hoisted(() => {
  const tableResultsLocal: Record<string, MockQueryResult> = {};
  return {
    tableResults: tableResultsLocal,
    fromMock: vi.fn((table: string) => createQueryBuilder(tableResultsLocal[table] ?? { data: null, error: null })),
  };
});

vi.mock('@services/supabase/client', () => ({
  supabase: { from: fromMock },
}));

vi.mock('@services/serviceError', () => ({
  toServiceError: vi.fn(formatServiceError),
}));

import { violationService } from './violationService';

describe('violationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockTableResults(tableResults);
  });

  it('getViolations returns rows on success', async () => {
    tableResults.external_deductions = {
      data: [{ id: 'd1', employee_id: 'e1', amount: 100, incident_date: '2026-03-01', apply_month: '2026-03', approval_status: 'pending', note: null }],
      error: null,
    };

    const rows = await violationService.getViolations();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('d1');
    expect(fromMock).toHaveBeenCalledWith('external_deductions');
  });

  it('getViolations throws on Supabase error', async () => {
    tableResults.external_deductions = {
      data: null,
      error: new Error('rls'),
    };

    await expect(violationService.getViolations()).rejects.toThrow('violationService.getViolations: rls');
  });

  it('findVehiclesByPlateQuery returns matches on success', async () => {
    tableResults.vehicles = {
      data: [{ id: 'v1', plate_number: 'أ ب ج', plate_number_en: null, brand: 'X', type: 'car' }],
      error: null,
    };

    const rows = await violationService.findVehiclesByPlateQuery('أ');
    expect(rows).toHaveLength(1);
    expect(fromMock).toHaveBeenCalledWith('vehicles');
  });

  it('findVehiclesByPlateQuery throws on Supabase error', async () => {
    tableResults.vehicles = { data: null, error: new Error('timeout') };

    await expect(violationService.findVehiclesByPlateQuery('x')).rejects.toThrow(
      'violationService.findVehiclesByPlateQuery: timeout',
    );
  });

  it('deleteViolation resolves when delete succeeds', async () => {
    tableResults.external_deductions = { data: null, error: null };

    await expect(violationService.deleteViolation('d1')).resolves.toBeUndefined();
  });

  it('deleteViolation throws on Supabase error', async () => {
    tableResults.external_deductions = { data: null, error: new Error('fk') };

    await expect(violationService.deleteViolation('d1')).rejects.toThrow('violationService.deleteViolation: fk');
  });
});
