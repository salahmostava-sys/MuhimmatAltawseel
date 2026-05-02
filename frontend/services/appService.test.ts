import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, type MockQueryResult } from '@shared/test/mocks/supabaseClientMock';

const { tableResults, fromMock } = vi.hoisted(() => {
  const tableResultsLocal: Record<string, MockQueryResult> = {};
  return {
    tableResults: tableResultsLocal,
    fromMock: vi.fn((table: string) =>
      createQueryBuilder(tableResultsLocal[table] ?? { data: null, error: null }),
    ),
  };
});

vi.mock('@services/supabase/client', () => ({
  supabase: { from: fromMock },
}));

vi.mock('@services/serviceError', () => ({
  handleSupabaseError: vi.fn((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'service error';
    throw new Error(`${context}: ${message}`);
  }),
  toServiceError: vi.fn((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'service error';
    return new Error(`${context}: ${message}`);
  }),
}));

import { appService } from './appService';

describe('appService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(tableResults)) delete tableResults[k];
  });

  it('getAll returns apps on success', async () => {
    tableResults.apps = {
      data: [
        {
          id: 'a1',
          name: 'تطبيق',
          name_en: null,
          brand_color: '#000',
          text_color: '#fff',
          is_active: true,
          custom_columns: [],
        },
      ],
      error: null,
    };

    const rows = await appService.getAll();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('a1');
    expect(fromMock).toHaveBeenCalledWith('apps');
  });

  it('getAll throws on Supabase error', async () => {
    tableResults.apps = { data: null, error: new Error('db') };

    await expect(appService.getAll()).rejects.toThrow('appService.getAll: db');
  });

  it('countActiveEmployeeApps returns count on success', async () => {
    tableResults.employee_apps = {
      data: null,
      error: null,
      count: 7,
    };

    const count = await appService.countActiveEmployeeApps('a1');
    expect(count).toBe(7);
    expect(fromMock).toHaveBeenCalledWith('employee_apps');
  });

  it('countActiveEmployeeApps throws on Supabase error', async () => {
    tableResults.employee_apps = {
      data: null,
      error: new Error('count failed'),
      count: null,
    };

    await expect(appService.countActiveEmployeeApps('a1')).rejects.toThrow(
      'appService.countActiveEmployeeApps: count failed',
    );
  });
});
