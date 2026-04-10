import { employeeService } from '@services/employeeService';
import { useAuthedQuery } from '@shared/hooks/useAuthedQuery';

/** TanStack Query key factory for the employees list. */
export const employeesQueryKey = (userId: string) => ['employees', userId] as const;

/**
 * Fetches all employees with their platform app assignments.
 * Data is cached for 60 seconds. Includes a 12-second timeout guard.
 */
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
