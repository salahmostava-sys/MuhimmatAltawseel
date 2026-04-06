import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warning: vi.fn(),
  success: vi.fn(),
}));

const replaceMonthDataMock = vi.hoisted(() => vi.fn());

vi.mock('@shared/components/ui/sonner', () => ({
  toast: toastMocks,
}));

vi.mock('@services/orderService', () => ({
  orderService: {
    replaceMonthData: replaceMonthDataMock,
  },
}));

vi.mock('@shared/lib/logger', () => ({
  logError: vi.fn(),
}));

import { saveSpreadsheetMonth } from './spreadsheetFileOps';

describe('saveSpreadsheetMonth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the month when the grid is empty instead of blocking save', async () => {
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

  it('still blocks saving when the grid only contains invalid rows', async () => {
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
