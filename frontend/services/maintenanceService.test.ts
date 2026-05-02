import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, type MockQueryResult } from '@shared/test/mocks/supabaseClientMock';

const { tableResults, fromMock, authMock } = vi.hoisted(() => {
  const tableResultsLocal: Record<string, MockQueryResult> = {};
  return {
    tableResults: tableResultsLocal,
    fromMock: vi.fn((table: string) => createQueryBuilder(tableResultsLocal[table] ?? { data: null, error: null })),
    authMock: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
  };
});

vi.mock('@services/supabase/client', () => ({
  supabase: {
    from: fromMock,
    auth: authMock,
  },
}));

vi.mock('@services/serviceError', () => ({
  handleSupabaseError: vi.fn((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'service error';
    throw new Error(`${context}: ${message}`);
  }),
}));

import * as maintenanceService from './maintenanceService';

describe('maintenanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableResults.clear();
    fromMock.mockImplementation((table: string) =>
      createQueryBuilder(tableResults[table] ?? { data: null, error: null }),
    );
  });

  it('getMaintenanceLogs returns array', async () => {
    tableResults.maintenance_logs = {
      data: [
        { id: 'ml1', vehicle_id: 'v1', type: 'غيار زيت', total_cost: 200, status: 'مكتملة', maintenance_parts: [] },
      ],
      error: null,
    };

    const result = await maintenanceService.getMaintenanceLogs();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ml1');
    expect(fromMock).toHaveBeenCalledWith('maintenance_logs');
  });

  it('getMaintenanceLogs throws on Supabase error', async () => {
    tableResults.maintenance_logs = {
      data: null,
      error: new Error('table missing'),
    };

    await expect(maintenanceService.getMaintenanceLogs()).rejects.toThrow(
      'maintenanceService.getMaintenanceLogs: table missing',
    );
  });

  it('getSpareparts returns array', async () => {
    tableResults.spare_parts = {
      data: [{ id: 'sp1', name_ar: 'فلتر زيت', stock_quantity: 10, min_stock_alert: 5 }],
      error: null,
    };

    const result = await maintenanceService.getSpareparts();
    expect(result).toHaveLength(1);
    expect(result[0].name_ar).toBe('فلتر زيت');
  });

  it('getSpareparts throws on Supabase error', async () => {
    tableResults.spare_parts = {
      data: null,
      error: new Error('rls denied'),
    };

    await expect(maintenanceService.getSpareparts()).rejects.toThrow(
      'maintenanceService.getSpareparts: rls denied',
    );
  });

  it('createMaintenanceLog throws on Supabase error', async () => {
    tableResults.maintenance_logs = {
      data: null,
      error: new Error('insert failed'),
    };

    await expect(
      maintenanceService.createMaintenanceLog(
        { vehicle_id: 'v1', maintenance_date: '2026-03-01', type: 'غيار زيت' },
        [],
      ),
    ).rejects.toThrow('maintenanceService.createMaintenanceLog.insert: insert failed');
  });

  it('createMaintenanceLog throws when vehicle_id missing', async () => {
    tableResults.maintenance_logs = {
      data: null,
      error: new Error('null value in column "vehicle_id"'),
    };

    await expect(
      maintenanceService.createMaintenanceLog(
        { vehicle_id: '', maintenance_date: '2026-03-01', type: 'غيار زيت' },
        [],
      ),
    ).rejects.toThrow('maintenanceService.createMaintenanceLog.insert:');
  });

  it('deleteSparePart throws on error from delete', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'maintenance_parts') {
        return createQueryBuilder({ data: null, error: null, count: 0 });
      }
      if (table === 'spare_parts') {
        return createQueryBuilder({ data: null, error: new Error('delete blocked') });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    await expect(maintenanceService.deleteSparePart('sp1')).rejects.toThrow(
      'maintenanceService.deleteSparePart: delete blocked',
    );
  });

  it('never swallows errors — always throws', async () => {
    tableResults.spare_parts = {
      data: null,
      error: new Error('opaque failure'),
    };
    await expect(maintenanceService.getSpareparts()).rejects.toThrow(/opaque failure/);
  });

  it('deleteSparePart throws when part is referenced in maintenance', async () => {
    tableResults.maintenance_parts = {
      data: null,
      error: null,
      count: 3,
    };

    await expect(maintenanceService.deleteSparePart('sp1')).rejects.toThrow(
      'لا يمكن حذف القطعة لأنها مستخدمة في سجلات صيانة.',
    );
  });

  it('deleteSparePart throws on Supabase error during count check', async () => {
    tableResults.maintenance_parts = {
      data: null,
      error: new Error('count failed'),
    };

    await expect(maintenanceService.deleteSparePart('sp1')).rejects.toThrow(
      'maintenanceService.deleteSparePart.count: count failed',
    );
  });

  it('getLowStockSpareParts filters client-side', async () => {
    tableResults.spare_parts = {
      data: [
        { id: 'sp1', name_ar: 'فلتر', stock_quantity: 2, min_stock_alert: 5, unit: 'قطعة' },
        { id: 'sp2', name_ar: 'زيت', stock_quantity: 10, min_stock_alert: 5, unit: 'لتر' },
      ],
      error: null,
    };

    const result = await maintenanceService.getLowStockSpareParts();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sp1');
  });
});
