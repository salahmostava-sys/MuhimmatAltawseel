import { useQuery } from '@tanstack/react-query';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import type { RiderPrediction } from '@services/predictionService';
import { analyticsService } from '@services/analyticsService';
import { format } from 'date-fns';

export function useRiderPredictions() {
  const { enabled, userId } = useAuthQueryGate();
  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');

  return useQuery({
    queryKey: ['rider-predictions', authQueryUserId(userId), currentMonth] as const,
    enabled,
    staleTime: 30 * 60 * 1000,
    queryFn: (): Promise<RiderPrediction[]> => analyticsService.getRiderPredictions(now),
  });
}
