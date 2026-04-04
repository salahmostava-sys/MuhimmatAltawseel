import type { UseQueryResult } from '@tanstack/react-query';
import { platformAccountService } from '@services/platformAccountService';
import type { BranchKey } from '@shared/components/table/GlobalTableFilters';
import { useAuthedPagedQuery } from '@shared/hooks/useAuthedPagedQuery';
import type { PagedResult } from '@shared/types/pagination';

export type PlatformAccountsPagedFilters = {
  driverId?: string;
  platformAppIds?: string[];
  branch?: BranchKey;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
};

export function usePlatformAccountsPaged(params: {
  page: number;
  pageSize: number;
  filters: PlatformAccountsPagedFilters;
}): UseQueryResult<PagedResult<unknown>> {
  const { page, pageSize, filters } = params;

  const employeeId = filters.driverId?.trim() || undefined;
  const appIds =
    filters.platformAppIds && filters.platformAppIds.length > 0 ? filters.platformAppIds : undefined;
  const branch = filters.branch === 'all' ? undefined : filters.branch;
  const status = filters.status && filters.status !== 'all' ? filters.status : undefined;
  const search = filters.search?.trim() || undefined;

  return useAuthedPagedQuery<PagedResult<unknown>>({
    buildQueryKey: (uid) =>
      [
        'platform-accounts',
        uid,
        'paged',
        page,
        pageSize,
        employeeId ?? null,
        appIds?.join(',') ?? null,
        branch ?? null,
        status ?? null,
        search ?? null,
      ] as const,
    queryFn: async () =>
      platformAccountService.getAccountsPaged({
        page,
        pageSize,
        filters: { employeeId, appIds, branch, status, search },
      }),
    errorTitle: 'تعذر تحميل حسابات المنصات',
  });
}

