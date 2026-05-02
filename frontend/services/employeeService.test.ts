import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, type MockQueryResult } from '@shared/test/mocks/supabaseClientMock';

const { tableResults, fromMock } = vi.hoisted(() => {
  const tableResultsLocal: Record<string, MockQueryResult> = {};
  return {
    tableResults: tableResultsLocal,
    fromMock: vi.fn((table: string) => createQueryBuilder(tableResultsLocal[table] ?? { data: null, error: null })),
  };
});

vi.mock('@services/supabase/client', () => ({
  supabase: {
    from: fromMock,
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'mock' }, error: null }),
      })),
    },
  },
}));

vi.mock('@services/serviceError', () => ({
  toServiceError: vi.fn((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'service error';
    return new Error(`${context}: ${message}`);
  }),
}));

import { employeeService } from './employeeService';

describe('employeeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableResults.clear();
  });

  it('fetchEmployees returns data', async () => {
    tableResults.employees = {
      data: [{ id: 'e1', name: 'Ahmed' }],
      error: null,
    };

    const rows = await employeeService.getAll();
    expect(rows).toEqual([{ id: 'e1', name: 'Ahmed', platform_apps: [] }]);
    expect(fromMock).toHaveBeenCalledWith('employees');
  });

  it('throws when fetchEmployees query fails', async () => {
    tableResults.employees = {
      data: null,
      error: new Error('db down'),
    };

    await expect(employeeService.getAll()).rejects.toThrow('employeeService.getAll: db down');
  });

  it('fetches more than the first 1000 employees page', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, idx) => ({
      id: `e-${idx}`,
      name: `Employee ${idx}`,
    }));
    const secondPage = [{ id: 'e-1000', name: 'Employee 1000' }];

    fromMock
      .mockImplementationOnce(() => createQueryBuilder({ data: firstPage, error: null }))
      .mockImplementationOnce(() => createQueryBuilder({ data: secondPage, error: null }));

    const rows = await employeeService.getAll();

    expect(rows).toHaveLength(1001);
    expect(rows.at(-1)).toMatchObject({ id: 'e-1000', platform_apps: [] });
    expect(fromMock).toHaveBeenCalledTimes(2);
  });
});
