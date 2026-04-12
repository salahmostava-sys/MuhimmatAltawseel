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
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      try {
        const rows = await employeeService.getAll();
        return rows || [];
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new Error('انتهت مهلة تحميل البيانات. حاول مرة أخرى.');
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    },
    staleTime: 60_000,
  });
};
