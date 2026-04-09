import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock('@services/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: rpcMock,
  },
}));

vi.mock('@services/serviceError', () => ({
  throwIfError: vi.fn((error: unknown, context: string) => {
    if (!error) return;
    const message = error instanceof Error ? error.message : 'service error';
    throw new Error(`${context}: ${message}`);
  }),
}));

import { accountAssignmentService } from './accountAssignmentService';

describe('accountAssignmentService.assignPlatformAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the atomic assignment rpc and returns its row', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        id: 'assignment-1',
        account_id: 'account-1',
        employee_id: 'employee-1',
        start_date: '2026-04-02',
        end_date: null,
        month_year: '2026-04',
        notes: 'handover',
        created_at: '2026-04-02T00:00:00Z',
      },
      error: null,
    });

    const result = await accountAssignmentService.assignPlatformAccount({
      account_id: 'account-1',
      employee_id: 'employee-1',
      start_date: '2026-04-02',
      notes: 'handover',
      created_by: 'user-1',
    });

    expect(rpcMock).toHaveBeenCalledWith('assign_platform_account', {
      p_account_id: 'account-1',
      p_employee_id: 'employee-1',
      p_start_date: '2026-04-02',
      p_notes: 'handover',
      p_created_by: 'user-1',
    });
    expect(result.id).toBe('assignment-1');
    expect(result.employee_id).toBe('employee-1');
  });

  it('throws when the rpc fails', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: new Error('rpc failed'),
    });

    await expect(
      accountAssignmentService.assignPlatformAccount({
        account_id: 'account-1',
        employee_id: 'employee-1',
        start_date: '2026-04-02',
        notes: null,
        created_by: null,
      }),
    ).rejects.toThrow('accountAssignmentService.assignPlatformAccount: rpc failed');
  });
});
