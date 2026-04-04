import { employeeService } from '@services/employeeService';
import type { BranchKey } from '@shared/components/table/GlobalTableFilters';
import { useAuthedPagedQuery } from '@shared/hooks/useAuthedPagedQuery';
import type { PagedResult } from '@shared/types/pagination';

export type EmployeesPagedFilters = {
  branch?: BranchKey;
  search?: string;
  status?: 'all' | 'active' | 'inactive' | 'ended';
};

export function useEmployeesPaged(params: {
  page: number;
  pageSize: number;
  filters: EmployeesPagedFilters;
}) {
  const { page, pageSize, filters } = params;
  const branch = filters.branch === 'all' ? undefined : filters.branch;
  const status = filters.status && filters.status !== 'all' ? filters.status : undefined;
  const search = filters.search?.trim() || undefined;

  return useAuthedPagedQuery<PagedResult>({
    buildQueryKey: (uid) =>
      ['employees', uid, 'paged', page, pageSize, branch ?? null, status ?? null, search ?? null] as const,
    queryFn: async () =>
      employeeService.getPaged({ page, pageSize, filters: { branch, status, search } }),
    errorTitle: 'تعذر تحميل الموظفين',
  });
}

