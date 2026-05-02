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
  },
}));

vi.mock('@services/serviceError', () => ({
  ServiceError: class ServiceError extends Error {},
  toServiceError: vi.fn((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'service error';
    return new Error(`${context}: ${message}`);
  }),
}));

import { commercialRecordService } from './commercialRecordService';

describe('commercialRecordService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(tableResults)) delete tableResults[k];
  });

  it('merges managed and legacy commercial records with usage counts', async () => {
    tableResults.commercial_records = {
      data: [{ id: 'cr-1', name: 'سجل مكة' }],
      error: null,
    };
    tableResults.employees = {
      data: [
        { commercial_record: 'سجل مكة' },
        { commercial_record: 'سجل مكة' },
        { commercial_record: 'سجل جدة' },
      ],
      error: null,
    };

    const result = await commercialRecordService.listCatalog();

    expect(result.tableAvailable).toBe(true);
    expect(result.records).toEqual([
      { id: 'cr-1', name: 'سجل مكة', usage_count: 2, source: 'managed' },
      { id: null, name: 'سجل جدة', usage_count: 1, source: 'legacy' },
    ]);
  });

  it('falls back to legacy values when managed table is missing', async () => {
    tableResults.commercial_records = {
      data: null,
      error: new Error('relation "public.commercial_records" does not exist'),
    };
    tableResults.employees = {
      data: [{ commercial_record: 'سجل رئيسي' }],
      error: null,
    };

    const result = await commercialRecordService.listCatalog();

    expect(result.tableAvailable).toBe(false);
    expect(result.records).toEqual([
      { id: null, name: 'سجل رئيسي', usage_count: 1, source: 'legacy' },
    ]);
  });
});

