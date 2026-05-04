import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appService } from '@services/appService';
import { createQueryClientWrapper } from '@shared/test/authedQuerySetup';

vi.mock('@services/appService', () => ({
  appService: {
    getAll: vi.fn(),
    countActiveEmployeeApps: vi.fn(),
  },
}));

const mockAuth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  session: null as { access_token: string } | null,
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

import { useAppsData } from './useAppsData';

describe('useAppsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = { id: 'u1' };
    mockAuth.session = { access_token: 'tok' };
  });

  it('returns apps with counts when service succeeds', async () => {
    vi.mocked(appService.getAll).mockResolvedValue([
      {
        id: 'a1',
        name: 'App',
        name_en: null,
        brand_color: '#111',
        text_color: '#fff',
        is_active: true,
        custom_columns: [],
      },
    ] as Awaited<ReturnType<typeof appService.getAll>>);
    vi.mocked(appService.countActiveEmployeeApps).mockResolvedValue(3);

    const { result } = renderHook(() => useAppsData(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].employeeCount).toBe(3);
    expect(appService.getAll).toHaveBeenCalledTimes(1);
    expect(appService.countActiveEmployeeApps).toHaveBeenCalledWith('a1');
  });

  it('surfaces error when getAll fails', async () => {
    vi.mocked(appService.getAll).mockRejectedValue(new Error('supabase down'));

    const { result } = renderHook(() => useAppsData(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('supabase down');
  });

  it('does not fetch when session is missing', async () => {
    mockAuth.session = null;

    const { result } = renderHook(() => useAppsData(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(appService.getAll).not.toHaveBeenCalled();
  });
});
