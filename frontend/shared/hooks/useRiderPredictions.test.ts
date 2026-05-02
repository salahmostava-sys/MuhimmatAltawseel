import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, type MockQueryResult } from '@shared/test/mocks/supabaseClientMock';

const mockGate = vi.hoisted(() => ({
  enabled: true,
  userId: 'u1' as string | null,
  authLoading: false,
}));

vi.mock('@shared/hooks/useAuthQueryGate', () => ({
  authQueryUserId: (uid: string | null | undefined) => uid ?? '__none__',
  useAuthQueryGate: () => ({
    enabled: mockGate.enabled,
    authReady: mockGate.enabled,
    userId: mockGate.userId,
    authLoading: mockGate.authLoading,
  }),
}));

const { tableResults, fromMock } = vi.hoisted(() => {
  const tableResultsLocal: Record<string, MockQueryResult> = {};
  return {
    tableResults: tableResultsLocal,
    fromMock: vi.fn((table: string) =>
      createQueryBuilder(tableResultsLocal[table] ?? { data: [], error: null }),
    ),
  };
});

vi.mock('@services/supabase/client', () => ({
  supabase: { from: fromMock },
}));

import { useRiderPredictions } from './useRiderPredictions';

describe('useRiderPredictions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    for (const k of Object.keys(tableResults)) delete tableResults[k];
    mockGate.enabled = true;
    mockGate.userId = 'u1';
    mockGate.authLoading = false;
    fromMock.mockImplementation((table: string) =>
      createQueryBuilder(tableResults[table] ?? { data: [], error: null }),
    );
    tableResults.employees = {
      data: [{ id: 'e1', name: 'راكب' }],
      error: null,
    };
    tableResults.daily_orders = {
      data: [] as { employee_id: string; date: string; orders_count: number }[],
      error: null,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createWrapper = () => {
    const client = queryClient;
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client }, children);
    };
  };

  it('does not fetch when session is null', async () => {
    mockGate.enabled = false;
    mockGate.userId = null;

    const { result } = renderHook(() => useRiderPredictions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('does not fetch when authLoading is true', async () => {
    mockGate.enabled = false;
    mockGate.authLoading = true;

    const { result } = renderHook(() => useRiderPredictions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('returns empty array when no employees found', async () => {
    tableResults.employees = { data: [], error: null };

    const { result } = renderHook(() => useRiderPredictions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('query key includes current month', async () => {
    const { result } = renderHook(() => useRiderPredictions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryCache().findAll({ queryKey: ['rider-predictions'] });
    const entry = cached[0];
    expect(entry).toBeDefined();
    const key = entry?.queryKey ?? [];
    expect(key[0]).toBe('rider-predictions');
    expect(key[2]).toBe('2026-03');
  });
});
