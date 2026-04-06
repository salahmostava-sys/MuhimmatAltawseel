import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = {
  data?: unknown;
  error?: unknown;
};

function createTrackedBuilder(result: QueryResult) {
  const settled = Promise.resolve(result);
  const builder = {
    select: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    then: settled.then.bind(settled),
    catch: settled.catch.bind(settled),
    finally: settled.finally.bind(settled),
  };
  return builder;
}

const { fromMock, getUserMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock('./supabase/client', () => ({
  supabase: {
    from: fromMock,
    auth: {
      getUser: getUserMock,
    },
  },
}));

vi.mock('./serviceError', () => ({
  throwIfError: vi.fn((error: unknown, context: string) => {
    if (!error) return;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${context}: ${message}`);
  }),
}));

import { salaryDraftService } from './salaryDraftService';

describe('salaryDraftService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-42' } }, error: null });
  });

  it('scopes getDraftsForMonth to the authenticated user', async () => {
    const builder = createTrackedBuilder({
      data: [
        {
          employee_id: 'emp-1',
          draft_data: { incentives: 25 },
        },
      ],
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await salaryDraftService.getDraftsForMonth('2026-04');

    expect(fromMock).toHaveBeenCalledWith('salary_drafts');
    expect(builder.select).toHaveBeenCalledWith('employee_id, draft_data');
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'month_year', '2026-04');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-42');
    expect(result).toEqual({
      'emp-1-2026-04': { incentives: 25 },
    });
  });

  it('returns no drafts when there is no authenticated user', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const result = await salaryDraftService.getDraftsForMonth('2026-04');

    expect(result).toEqual({});
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('limits stale-draft cleanup in syncDraftsForMonth to the authenticated user', async () => {
    const selectBuilder = createTrackedBuilder({
      data: [{ employee_id: 'emp-stale' }],
      error: null,
    });
    const deleteBuilder = createTrackedBuilder({ data: null, error: null });
    fromMock.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(deleteBuilder);

    await salaryDraftService.syncDraftsForMonth('2026-04', {});

    expect(selectBuilder.select).toHaveBeenCalledWith('employee_id');
    expect(selectBuilder.eq).toHaveBeenNthCalledWith(1, 'month_year', '2026-04');
    expect(selectBuilder.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-42');
    expect(deleteBuilder.delete).toHaveBeenCalledTimes(1);
    expect(deleteBuilder.eq).toHaveBeenNthCalledWith(1, 'month_year', '2026-04');
    expect(deleteBuilder.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-42');
    expect(deleteBuilder.in).toHaveBeenCalledWith('employee_id', ['emp-stale']);
  });

  it('scopes deleteDraft to the authenticated user', async () => {
    const builder = createTrackedBuilder({ data: null, error: null });
    fromMock.mockReturnValue(builder);

    await salaryDraftService.deleteDraft('2026-04', 'emp-7');

    expect(builder.delete).toHaveBeenCalledTimes(1);
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'month_year', '2026-04');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-42');
    expect(builder.eq).toHaveBeenNthCalledWith(3, 'employee_id', 'emp-7');
  });
});
