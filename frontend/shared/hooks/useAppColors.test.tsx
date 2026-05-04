import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appService } from '@services/appService';
import { createQueryClientWrapper } from '@shared/test/authedQuerySetup';

vi.mock('@services/appService', () => ({
  appService: {
    getAll: vi.fn(),
  },
}));

const mockAuth = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  session: { access_token: 'tok' } as { access_token: string } | null,
}));

const useQueryErrorToastMock = vi.hoisted(() => vi.fn());

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
  useQueryErrorToast: useQueryErrorToastMock,
}));

import { useAppColors } from './useAppColors';


describe('useAppColors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = { id: 'u1' };
    mockAuth.session = { access_token: 'tok' };
  });

  it('returns normalized app colors and active apps', async () => {
    vi.mocked(appService.getAll).mockResolvedValue([
      {
        id: 'a1',
        name: 'App One',
        brand_color: '',
        text_color: null,
        is_active: true,
        custom_columns: [{ key: 'rating', label: 'Rating' }],
      },
      {
        id: 'a2',
        name: 'App Two',
        brand_color: '#123456',
        text_color: '#eeeeee',
        is_active: false,
        custom_columns: null,
      },
    ] as Awaited<ReturnType<typeof appService.getAll>>);

    const { result } = renderHook(() => useAppColors(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.apps).toHaveLength(2);
    expect(result.current.activeApps).toHaveLength(1);
    expect(result.current.apps[0].brand_color).toBe('#2563eb');
    expect(result.current.apps[0].text_color).toBe('#ffffff');
    expect(result.current.apps[0].custom_columns).toEqual([{ key: 'rating', label: 'Rating' }]);
    expect(result.current.apps[1].custom_columns).toEqual([]);
    expect(useQueryErrorToastMock).toHaveBeenCalledWith(false, null, undefined, undefined);
  });

  it('does not fetch when session is missing', async () => {
    mockAuth.session = null;

    const { result } = renderHook(() => useAppColors(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(appService.getAll).not.toHaveBeenCalled();
    expect(result.current.apps).toEqual([]);
    expect(result.current.activeApps).toEqual([]);
  });
});
