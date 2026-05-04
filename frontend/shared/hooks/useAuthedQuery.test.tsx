import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClientWrapper } from '@shared/test/authedQuerySetup';

const mockAuthState = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  session: { access_token: 'tok' } as { access_token: string } | null,
}));

const mockGateState = vi.hoisted(() => ({
  userId: 'u1',
  authReady: true,
}));

const useQueryErrorToastMock = vi.hoisted(() => vi.fn());

vi.mock('@app/providers/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('@shared/hooks/useAuthQueryGate', () => ({
  authQueryUserId: (uid: string | null | undefined) => uid ?? '__none__',
  useAuthQueryGate: () => mockGateState,
}));

vi.mock('@shared/hooks/useQueryErrorToast', () => ({
  useQueryErrorToast: useQueryErrorToastMock,
}));

import { useAuthedQuery } from './useAuthedQuery';

describe('useAuthedQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.user = { id: 'u1' };
    mockAuthState.session = { access_token: 'tok' };
    mockGateState.userId = 'u1';
    mockGateState.authReady = true;
  });

  it('runs the query with the authenticated user key and forwards toast wiring', async () => {
    const buildQueryKey = vi.fn((uid: string) => ['resource', uid, 'list'] as const);
    const queryFn = vi.fn().mockResolvedValue([{ id: '1' }]);

    const { result } = renderHook(
      () =>
        useAuthedQuery({
          buildQueryKey,
          queryFn,
          errorTitle: 'تعذر تحميل البيانات',
          staleTime: 60_000,
        }),
      { wrapper: createQueryClientWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(buildQueryKey).toHaveBeenCalledWith('u1');
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(useQueryErrorToastMock).toHaveBeenCalledWith(
      false,
      null,
      'تعذر تحميل البيانات',
      expect.any(Function),
    );
  });

  it('stays idle when session is missing', async () => {
    const buildQueryKey = vi.fn((uid: string) => ['resource', uid, 'list'] as const);
    const queryFn = vi.fn().mockResolvedValue([{ id: '1' }]);
    mockAuthState.session = null;

    const { result } = renderHook(
      () =>
        useAuthedQuery({
          buildQueryKey,
          queryFn,
        }),
      { wrapper: createQueryClientWrapper() },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(buildQueryKey).toHaveBeenCalledWith('u1');
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('can disable error toast wiring', async () => {
    const buildQueryKey = vi.fn((uid: string) => ['resource', uid, 'list'] as const);
    const queryFn = vi.fn().mockResolvedValue([{ id: '1' }]);

    const { result } = renderHook(
      () =>
        useAuthedQuery({
          buildQueryKey,
          queryFn,
          notifyOnError: false,
        }),
      { wrapper: createQueryClientWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useQueryErrorToastMock).toHaveBeenCalledWith(false, null, undefined, undefined);
  });
});
