import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, upsertMock, rpcMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  upsertMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('@services/supabase/client', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

vi.mock('@services/authService', () => ({
  authService: {
    getCurrentUser: vi.fn(),
  },
}));

import { orderService, type DailyOrderUpsertRow } from './orderService';

describe('orderService.bulkUpsert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({ data: null, error: { message: 'Could not find the function public.replace_daily_orders_month_rpc' } });
    fromMock.mockImplementation(() => ({
      upsert: upsertMock,
    }));
  });

  it('falls back to row-by-row saves when a chunk fails so valid rows are not lost', async () => {
    const rows: DailyOrderUpsertRow[] = [
      { employee_id: 'emp-1', app_id: 'app-1', date: '2026-04-01', orders_count: 12 },
      { employee_id: 'emp-2', app_id: 'app-1', date: '2026-04-01', orders_count: 8 },
    ];

    upsertMock
      .mockResolvedValueOnce({
        error: {
          message: 'chunk failed',
          code: '23503',
          details: 'foreign key violation',
          hint: null,
        },
      })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'employee not found' } });

    const result = await orderService.bulkUpsert(rows, 2);

    expect(result.saved).toBe(1);
    expect(result.failed).toEqual([
      {
        row: rows[1],
        error: 'employee not found',
      },
    ]);
    expect(fromMock).toHaveBeenCalledTimes(3);
    expect(upsertMock).toHaveBeenNthCalledWith(1, rows, { onConflict: 'employee_id,app_id,date' });
    expect(upsertMock).toHaveBeenNthCalledWith(2, [rows[0]], { onConflict: 'employee_id,app_id,date' });
    expect(upsertMock).toHaveBeenNthCalledWith(3, [rows[1]], { onConflict: 'employee_id,app_id,date' });
  });

  it('uses the transactional month replacement rpc when available', async () => {
    const rows: DailyOrderUpsertRow[] = [
      { employee_id: 'emp-1', app_id: 'app-1', date: '2026-04-01', orders_count: 12 },
    ];

    rpcMock.mockResolvedValueOnce({
      data: [{ batch_id: 'batch-1', saved_rows: 1, failed_rows: 0 }],
      error: null,
    });

    const result = await orderService.replaceMonthData('2026-04', rows, 200, {
      sourceType: 'excel',
      fileName: 'orders.xlsx',
      targetAppId: 'app-1',
    });

    expect(rpcMock).toHaveBeenCalledWith('replace_daily_orders_month_rpc', {
      p_month_year: '2026-04',
      p_rows: rows,
      p_source_type: 'excel',
      p_file_name: 'orders.xlsx',
      p_target_app_id: 'app-1',
    });
    expect(result).toEqual({
      saved: 1,
      failed: [],
      batchId: 'batch-1',
    });
  });
});
