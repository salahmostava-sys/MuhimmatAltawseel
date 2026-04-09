import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@shared/components/ui/sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toastMocks = (await import('@shared/components/ui/sonner')).toast as any;

vi.mock('@services/orderService', () => ({
  orderService: {
    replaceMonthData: vi.fn(),
  },
}));

const { orderService } = await import('@services/orderService');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const replaceMonthDataMock = orderService.replaceMonthData as any;

vi.mock('@shared/lib/logger', () => ({
  logError: vi.fn(),
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { saveSpreadsheetMonth } from './spreadsheetFileOps';

describe('saveSpreadsheetMonth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.skip('clears the month when the grid is empty instead of blocking save', async () => {
    replaceMonthDataMock.mockResolvedValue({ saved: 0, failed: [] });
    const setSaving = vi.fn();

    const result = await saveSpreadsheetMonth({
      isMonthLocked: false,
      year: 2026,
      month: 4,
      days: 30,
      data: {},
      setSaving,
      employees: [],
      apps: [],
    });

    expect(result).toBe(true);
    expect(replaceMonthDataMock).toHaveBeenCalledWith('2026-04', []);
    expect(toastMocks.success).toHaveBeenCalledTimes(1);
    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(setSaving).toHaveBeenNthCalledWith(1, true);
    expect(setSaving).toHaveBeenLastCalledWith(false);
  });

  it.skip('still blocks saving when the grid only contains invalid rows', async () => {
    const setSaving = vi.fn();

    const result = await saveSpreadsheetMonth({
      isMonthLocked: false,
      year: 2026,
      month: 4,
      days: 30,
      data: {
        'emp-1::app-1::31': 5,
      },
      setSaving,
      employees: [
        {
          id: 'emp-1',
          name: 'Employee One',
          salary_type: 'orders',
          status: 'active',
          sponsorship_status: null,
        },
      ],
      apps: [
        {
          id: 'app-1',
          name: 'App One',
          name_en: 'App One',
        },
      ],
    });

    expect(result).toBe(false);
    expect(replaceMonthDataMock).not.toHaveBeenCalled();
    expect(toastMocks.warning).toHaveBeenCalledTimes(1);
    expect(toastMocks.error).toHaveBeenCalledTimes(1);
    expect(setSaving).toHaveBeenNthCalledWith(1, true);
    expect(setSaving).toHaveBeenLastCalledWith(false);
  });
});
