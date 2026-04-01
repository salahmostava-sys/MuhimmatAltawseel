import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@app/providers/AuthContext';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { useQueryErrorToast } from '@shared/hooks/useQueryErrorToast';
import {
  employeeActivityService,
  toMonthKey,
  type MonthlyActiveEmployeeIdsResult,
} from '@services/employeeActivityService';

export type { MonthlyActiveEmployeeIdsResult };

export function useMonthlyActiveEmployeeIds(monthKey?: string) {
  const { user, session } = useAuth();
  const { userId, authReady } = useAuthQueryGate();
  const uid = authQueryUserId(user?.id ?? userId);
  const enabled = !!session && authReady;
  const mk = monthKey ?? toMonthKey(new Date());

  const query = useQuery({
    queryKey: ['employees', uid, 'active-ids', mk] as const,
    queryFn: async (): Promise<MonthlyActiveEmployeeIdsResult> =>
      employeeActivityService.getMonthlyActiveEmployeeIds(mk),
    staleTime: 60_000,
    enabled,
  });

  useQueryErrorToast(query.isError, query.error, undefined, query.refetch);
  return query;
}
