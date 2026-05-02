import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  toServiceError: vi.fn((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'service error';
    return new Error(`${context}: ${message}`);
  }),
}));

import { performanceService } from './performanceService';

describe('performanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableResults.clear();
  });

  it('returns dashboard payload from the backend rpc', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        monthYear: '2026-04',
        summary: { totalOrders: 520 },
      },
      error: null,
    });

    const result = await performanceService.getDashboard('2026-04');

    expect(rpcMock).toHaveBeenCalledWith('performance_dashboard_rpc', {
      p_month_year: '2026-04',
    });
    expect(result.summary.totalOrders).toBe(520);
  });

  it('throws when import history query fails', async () => {
    tableResults.order_import_batches = {
      data: null,
      error: new Error('history down'),
    };

    await expect(performanceService.getImportHistory('2026-04')).rejects.toThrow(
      'performanceService.getImportHistory: history down',
    );
  });

  it('forwards salary snapshot capture to the backend rpc', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { month_year: '2026-04', records_count: 3 },
      error: null,
    });

    const result = await performanceService.captureSalaryMonthSnapshot('2026-04');

    expect(rpcMock).toHaveBeenCalledWith('capture_salary_month_snapshot', {
      p_month_year: '2026-04',
    });
    expect(result).toEqual({ month_year: '2026-04', records_count: 3 });
  });
});
