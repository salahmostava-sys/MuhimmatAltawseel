import { vehicleService } from '@services/vehicleService';
import { useAuthedQuery } from '@shared/hooks/useAuthedQuery';

export const motorcyclesDataQueryKey = (userId: string) => ['motorcycles', userId, 'list'] as const;

export const useMotorcyclesData = () => {
  return useAuthedQuery({
    buildQueryKey: motorcyclesDataQueryKey,
    queryFn: async () => {
      return vehicleService.getAllWithCurrentRider();
    },
    staleTime: 60_000,
  });
};
