import { salaryService } from '@services/salaryService';
import type { BranchKey } from '@shared/components/table/GlobalTableFilters';
import { useAuthedPagedQuery } from '@shared/hooks/useAuthedPagedQuery';
import type { PagedResult } from '@shared/types/pagination';

export type SalaryRecordsPagedFilters = {
  branch?: BranchKey;
  search?: string;
  approved?: 'all' | 'approved' | 'pending';
};

export function useSalaryRecordsPaged(params: {
  monthYear: string;
  page: number;
  pageSize: number;
  filters: SalaryRecordsPagedFilters;
}) {
  const { monthYear, page, pageSize, filters } = params;
  const branch = filters.branch === 'all' ? undefined : filters.branch;
  const search = filters.search?.trim() || undefined;
  const approved = filters.approved ?? 'all';

  return useAuthedPagedQuery<PagedResult<unknown>>({
    buildQueryKey: (uid) =>
      ['salaries', uid, 'records', 'paged', monthYear, page, pageSize, branch ?? null, approved, search ?? null] as const,
    queryFn: async () =>
      salaryService.getPagedByMonth({
        monthYear,
        page,
        pageSize,
        filters: { branch, approved, search },
      }),
    errorTitle: 'تعذر تحميل الرواتب',
  });
}

