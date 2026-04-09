/**
 * React Query hooks for the AI analytics engine.
 *
 * These hooks fetch predictions, driver rankings, platform stats,
 * and smart alerts from the FastAPI backend.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { dashboardService } from '@services/dashboardService';
import { aiService, type DayRecord } from '@services/aiService';
 

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetches raw order data from Supabase and passes it to the AI backend
 * for predictions. This hook orchestrates the full pipeline.
 */
export function useAiAnalytics(monthYear: string) {
  const { enabled, userId } = useAuthQueryGate();

  // Step 1: Fetch raw orders from Supabase
  const ordersQuery = useQuery({
    queryKey: ['ai-analytics', userId, 'raw-orders', monthYear],
    queryFn: () => dashboardService.getMonthOrders(monthYear),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Step 2: Transform orders to DayRecord format for AI backend
  const history: DayRecord[] = ordersQuery.data
    ? (ordersQuery.data as Array<{
        date: string;
        employee_id?: string | null;
        app_id?: string | null;
        orders_count?: number | null;
        apps?: { name: string } | null;
        employees?: { name: string } | null;
      }>)
        .map((row) => ({
          date: row.date,
          orders: row.orders_count ?? 0,
          app_name: row.apps ? row.apps.name ?? null : null,
          employee_id: row.employee_id ?? null,
          employee_name: row.employees ? row.employees.name ?? null : null,
        }))
    : [];

  const hasHistory = history.length > 0;

  // Step 3: AI Predictions
  const predictionsQuery = useQuery({
    queryKey: ['ai-analytics', userId, 'predictions', monthYear],
    queryFn: () => aiService.predictOrders(history, 14),
    enabled: enabled && hasHistory,
    staleTime: 10 * 60 * 1000,
  });

  // Step 4: Best Drivers
  const driversQuery = useQuery({
    queryKey: ['ai-analytics', userId, 'best-drivers', monthYear],
    queryFn: () => aiService.bestDrivers(history, 5),
    enabled: enabled && hasHistory,
    staleTime: 10 * 60 * 1000,
  });

  // Step 5: Top Platforms
  const platformsQuery = useQuery({
    queryKey: ['ai-analytics', userId, 'top-platforms', monthYear],
    queryFn: () => aiService.topPlatforms(history),
    enabled: enabled && hasHistory,
    staleTime: 10 * 60 * 1000,
  });

  // Step 6: Smart Alerts
  const alertsQuery = useQuery({
    queryKey: ['ai-analytics', userId, 'smart-alerts', monthYear],
    queryFn: () => aiService.smartAlerts(history),
    enabled: enabled && hasHistory && history.length >= 7,
    staleTime: 10 * 60 * 1000,
  });

  return {
    // Loading states
    isLoading: ordersQuery.isLoading || predictionsQuery.isLoading,
    isAiAvailable: hasHistory,

    // Data
    predictions: predictionsQuery.data ?? null,
    bestDrivers: driversQuery.data?.drivers ?? [],
    topPlatforms: platformsQuery.data?.platforms ?? [],
    smartAlerts: alertsQuery.data?.alerts ?? [],

    // Errors
    ordersError: ordersQuery.error,
    predictionsError: predictionsQuery.error,
    driversError: driversQuery.error,
    platformsError: platformsQuery.error,
    alertsError: alertsQuery.error,
  };
}
