import { useQuery } from '@tanstack/react-query';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';
import employeeService from '@services/employeeService';

export function useActiveApps() {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);

  return useQuery({
    queryKey: ['active-apps', uid],
    queryFn: () => employeeService.getActiveApps(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
