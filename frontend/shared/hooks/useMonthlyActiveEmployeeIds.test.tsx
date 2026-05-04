import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, type MockQueryResult } from '@shared/test/mocks/supabaseClientMock';
import { createQueryClientWrapper } from '@shared/test/authedQuerySetup';

const { tableResults, fromMock } = vi.hoisted(() => {
  const tableResultsLocal: Record<string, MockQueryResult> = {};
  return {
    tableResults: tableResultsLocal,
    fromMock: vi.fn((table: string) => createQueryBuilder(tableResultsLocal[table] ?? { data: [], error: null })),
  };
});

vi.mock('@services/supabase/client', () => ({
  supabase: { from: fromMock },
}));

const mockAuth = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  session: { access_token: 'tok' } as { access_token: string } | null,
}));

vi.mock('@app/providers/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@shared/hooks/useAuthQueryGate', () => ({
  authQueryUserId: (uid: string | null | undefined) => uid ?? '__none__',
  useAuthQueryGate: () => ({
    enabled: true,
    authReady: true,
    userId: 'u1',
    authLoading: false,
  }),
}));

vi.mock('@shared/hooks/useQueryErrorToast', () => ({
  useQueryErrorToast: vi.fn(),
}));

import { useMonthlyActiveEmployeeIds } from './useMonthlyActiveEmployeeIds';

describe('useMonthlyActiveEmployeeIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(tableResults)) delete tableResults[k];
    mockAuth.session = { access_token: 'tok' };
    mockAuth.user = { id: 'u1' };
    fromMock.mockImplementation((table: string) =>
      createQueryBuilder(tableResults[table] ?? { data: [], error: null }),
    );
  });

  it('merges employee ids from orders, attendance, and salaries when Supabase succeeds', async () => {
    tableResults.daily_orders = {
      data: [{ employee_id: 'e1' }, { employee_id: 'e2' }],
      error: null,
    };
    tableResults.attendance = {
      data: [{ employee_id: 'e2' }, { employee_id: 'e3' }],
      error: null,
    };
    tableResults.salary_records = {
      data: [{ employee_id: 'e3' }],
      error: null,
    };

    const { result } = renderHook(() => useMonthlyActiveEmployeeIds('2026-03'), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
    const ids = result.current.data?.employeeIds ?? new Set<string>();
    expect(ids.has('e1')).toBe(true);
    expect(ids.has('e2')).toBe(true);
    expect(ids.has('e3')).toBe(true);
    expect(fromMock).toHaveBeenCalledWith('daily_orders');
    expect(fromMock).toHaveBeenCalledWith('attendance');
    expect(fromMock).toHaveBeenCalledWith('salary_records');
  });

  it('surfaces error when daily_orders query fails', async () => {
    tableResults.daily_orders = { data: null, error: new Error('orders query failed') };
    tableResults.attendance = { data: [], error: null };
    tableResults.salary_records = { data: [], error: null };

    const { result } = renderHook(() => useMonthlyActiveEmployeeIds('2026-03'), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('orders query failed');
  });

  it('does not run query when session is null', async () => {
    mockAuth.session = null;

    const { result } = renderHook(() => useMonthlyActiveEmployeeIds('2026-03'), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fromMock).not.toHaveBeenCalled();
  });
});
