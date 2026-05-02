import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, type MockQueryResult } from '@shared/test/mocks/supabaseClientMock';
import { resetMockTableResults, throwFormattedServiceError } from '@shared/test/mocks/serviceLayerTestUtils';

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
  handleSupabaseError: vi.fn(throwFormattedServiceError),
}));

import attendanceService from './attendanceService';

describe('attendanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockTableResults(tableResults);
  });

  it('returns attendance rows on success', async () => {
    tableResults.attendance = {
      data: [
        { date: '2026-03-01', status: 'present' },
        { date: '2026-03-02', status: 'absent' },
      ],
      error: null,
    };

    const rows = await attendanceService.getAttendanceStatusRange('2026-03-01', '2026-03-31');
    expect(rows).toHaveLength(2);
    expect(rows[0].status).toBe('present');
    expect(fromMock).toHaveBeenCalledWith('attendance');
  });

  it('throws when attendance query fails', async () => {
    tableResults.attendance = {
      data: null,
      error: new Error('query failed'),
    };

    await expect(
      attendanceService.getAttendanceStatusRange('2026-03-01', '2026-03-31'),
    ).rejects.toThrow('attendanceService.getAttendanceStatusRange: query failed');
  });
});
