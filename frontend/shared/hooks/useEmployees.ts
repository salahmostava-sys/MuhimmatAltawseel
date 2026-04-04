import { employeeService } from '@services/employeeService';
import { useAuthedQuery } from '@shared/hooks/useAuthedQuery';

export const employeesQueryKey = (userId: string) => ['employees', userId] as const;

export const useEmployees = () => {
  return useAuthedQuery({
    buildQueryKey: employeesQueryKey,
    queryFn: async () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('انتهت مهلة تحميل البيانات. حاول مرة أخرى.')), 12000)
      );
      const rows = await Promise.race([employeeService.getAll(), timeoutPromise]);
      return rows || [];
    },
    staleTime: 60_000,
  });
};
