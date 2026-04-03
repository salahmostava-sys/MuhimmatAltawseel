import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, upsertMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock('@services/supabase/client', () => ({
  supabase: {
    from: fromMock,
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
});
