import { vehicleService } from '@services/vehicleService';
import { useAuthedQuery } from '@shared/hooks/useAuthedQuery';

export const vehicleAssignmentDataQueryKey = (userId: string, month?: string) => ['vehicle-assignment', userId, 'page-data', month] as const;

export const useVehicleAssignmentData = (selectedMonth?: string) => {
  return useAuthedQuery({
    buildQueryKey: (uid) => vehicleAssignmentDataQueryKey(uid, selectedMonth),
    queryFn: async () => {
      const [assignments, vehicles, employees] = await Promise.all([
        vehicleService.getAssignmentsWithRelations(selectedMonth),
        vehicleService.getAll(),
        vehicleService.getActiveEmployees(),
      ]);

      return {
        assignments,
        vehicles,
        employees,
      };
    },
    staleTime: 60_000,
  });
};
