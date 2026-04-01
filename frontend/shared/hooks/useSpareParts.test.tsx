import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as maintenanceService from '@services/maintenanceService';

vi.mock('@services/maintenanceService', () => ({
  getSpareparts: vi.fn(),
  getMaintenanceLogs: vi.fn(),
}));

const mockGate = vi.hoisted(() => ({
  enabled: true,
  userId: 'test-user-id' as string | null,
}));

vi.mock('@shared/hooks/useAuthQueryGate', () => ({
  authQueryUserId: (uid: string | null | undefined) => uid ?? '__none__',
  useAuthQueryGate: () => ({
    enabled: mockGate.enabled,
    authReady: mockGate.enabled,
    userId: mockGate.userId,
    authLoading: false,
  }),
}));

import { useSpareParts, useMaintenanceLogs } from './useMaintenanceData';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSpareParts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGate.enabled = true;
    mockGate.userId = 'test-user-id';
  });

  it('does not fetch when not authenticated', async () => {
    mockGate.enabled = false;
    mockGate.userId = null;

    const { result } = renderHook(() => useSpareParts(), { wrapper: createWrapper() });

    await new Promise((r) => setTimeout(r, 100));
    expect(result.current.data).toBeUndefined();
    expect(maintenanceService.getSpareparts).not.toHaveBeenCalled();
  });

  it('fetches spare parts when authenticated', async () => {
    vi.mocked(maintenanceService.getSpareparts).mockResolvedValue([
      { id: 'sp1', name_ar: 'فلتر زيت', stock_quantity: 10, min_stock_alert: 5, unit: 'قطعة', unit_cost: 25 },
    ]);

    const { result } = renderHook(() => useSpareParts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name_ar).toBe('فلتر زيت');
  });

  it('returns error on failure', async () => {
    vi.mocked(maintenanceService.getSpareparts).mockRejectedValue(new Error('spare_parts missing'));

    const { result } = renderHook(() => useSpareParts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.error?.message).toContain('spare_parts missing');
  });
});

describe('useMaintenanceLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGate.enabled = true;
    mockGate.userId = 'test-user-id';
  });

  it('does not fetch when not authenticated', async () => {
    mockGate.enabled = false;
    mockGate.userId = null;

    const { result } = renderHook(() => useMaintenanceLogs(), { wrapper: createWrapper() });

    await new Promise((r) => setTimeout(r, 100));
    expect(maintenanceService.getMaintenanceLogs).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('fetches logs when authenticated', async () => {
    vi.mocked(maintenanceService.getMaintenanceLogs).mockResolvedValue([
      {
        id: 'ml1', vehicle_id: 'v1', maintenance_date: '2026-03-01', type: 'غيار زيت',
        total_cost: 200, status: 'مكتملة', notes: null, vehicles: { plate_number: 'ABC', type: 'car' },
        maintenance_parts: [],
      },
    ] as Awaited<ReturnType<typeof maintenanceService.getMaintenanceLogs>>);

    const { result } = renderHook(() => useMaintenanceLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('returns error on failure', async () => {
    vi.mocked(maintenanceService.getMaintenanceLogs).mockRejectedValue(new Error('logs query failed'));

    const { result } = renderHook(() => useMaintenanceLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.error?.message).toContain('logs query failed');
  });
});
