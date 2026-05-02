import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, type MockQueryResult } from '@shared/test/mocks/supabaseClientMock';
import type { User } from '@supabase/supabase-js';

const { tableResults, fromMock } = vi.hoisted(() => {
  const tableResultsLocal: Record<string, MockQueryResult> = {};
  return {
    tableResults: tableResultsLocal,
    fromMock: vi.fn((table: string) => createQueryBuilder(tableResultsLocal[table] ?? { data: null, error: null })),
  };
});

vi.mock('@services/supabase/client', () => ({
  supabase: { from: fromMock },
}));

const getCurrentUser = vi.fn();

vi.mock('@services/authService', () => ({
  authService: {
    getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
  },
}));

import { auditService } from './auditService';

describe('auditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(tableResults)) delete tableResults[k];
    getCurrentUser.mockResolvedValue({ id: 'user-1' } as User);
  });

  it('logAdminAction succeeds when insert succeeds', async () => {
    tableResults.admin_action_log = { data: null, error: null };

    await expect(
      auditService.logAdminAction({ action: 'settings_change', table_name: 'apps', record_id: 'a1' }),
    ).resolves.toBeUndefined();

    expect(fromMock).toHaveBeenCalledWith('admin_action_log');
    expect(getCurrentUser).toHaveBeenCalled();
  });

  it('logAdminAction swallows Supabase insert errors (non-fatal audit)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    tableResults.admin_action_log = { data: null, error: new Error('rls denied') };

    await expect(auditService.logAdminAction({ action: 'delete' })).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      '[auditService] logAdminAction failed (non-fatal):',
      'rls denied',
    );
    warnSpy.mockRestore();
  });
});
