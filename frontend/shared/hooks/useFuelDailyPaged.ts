import { fuelService } from '@services/fuelService';
import type { BranchKey } from '@shared/components/table/GlobalTableFilters';
import { useAuthedPagedQuery } from '@shared/hooks/useAuthedPagedQuery';
import type { PagedResult } from '@shared/types/pagination';

export type FuelDailyPagedFilters = {
  driverId?: string;
  branch?: BranchKey;
  search?: string;
};

export function useFuelDailyPaged(params: {
  monthStart: string;
  monthEnd: string;
  page: number;
  pageSize: number;
  filters: FuelDailyPagedFilters;
}) {
  const { monthStart, monthEnd, page, pageSize, filters } = params;
  const employeeId = filters.driverId?.trim() || undefined;
  const branch = filters.branch === 'all' ? undefined : filters.branch;
  const search = filters.search?.trim() || undefined;

  return useAuthedPagedQuery<PagedResult<unknown>>({
    buildQueryKey: (uid) =>
      ['fuel', uid, 'daily', 'paged', monthStart, monthEnd, page, pageSize, employeeId ?? null, branch ?? null, search ?? null] as const,
    queryFn: async () =>
      fuelService.getDailyMileagePaged({
        monthStart,
        monthEnd,
        page,
        pageSize,
        filters: { employeeId, branch, search },
      }),
    errorTitle: 'تعذر تحميل بيانات الوقود',
  });
}

