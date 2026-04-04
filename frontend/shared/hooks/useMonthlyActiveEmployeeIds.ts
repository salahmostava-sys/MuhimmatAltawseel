import { useAuthedQuery } from '@shared/hooks/useAuthedQuery';
import {
  employeeActivityService,
  toMonthKey,
  type MonthlyActiveEmployeeIdsResult,
} from '@services/employeeActivityService';

export type { MonthlyActiveEmployeeIdsResult };

export function useMonthlyActiveEmployeeIds(monthKey?: string) {
  const mk = monthKey ?? toMonthKey(new Date());

  return useAuthedQuery({
    buildQueryKey: (uid) => ['employees', uid, 'active-ids', mk] as const,
    queryFn: async (): Promise<MonthlyActiveEmployeeIdsResult> =>
      employeeActivityService.getMonthlyActiveEmployeeIds(mk),
    staleTime: 60_000,
    requireUser: false,
  });
}
