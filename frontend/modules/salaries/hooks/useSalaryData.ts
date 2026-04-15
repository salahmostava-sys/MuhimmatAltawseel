/**
 * useSalaryData — React Query hook that replaces the useEffect-driven data fetching in SalariesPage.
 *
 * Previously SalariesPage had a useEffect that:
 *  1. Waited for salaryBaseContext (from a separate useQuery)
 *  2. Ran prepareSalaryState() to build rows, platform maps, draft hydration
 *  3. Manually tracked loading state, cancellation, and errors
 *
 * This hook consolidates everything into one React Query call, following the
 * project's ARCHITECTURE.md mandate: "Forbidden: useEffect-driven data fetching patterns".
 *
 * Query key includes selectedMonth and uid, so any month/user change triggers a fresh fetch.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@app/providers/AuthContext';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { isValidSalaryMonthYear } from '@shared/lib/salaryValidation';
import { defaultQueryRetry } from '@shared/lib/query';
import { salaryDataService } from '@services/salaryDataService';
import { prepareSalaryState } from '@modules/salaries/lib/salaryDomain';
import { useMonthlyActiveEmployeeIds } from '@shared/hooks/useMonthlyActiveEmployeeIds';
import { useRealtimePostgresChanges } from '@shared/hooks/useRealtimePostgresChanges';
import type { SalaryBaseContextData, PreparedSalaryState } from '@modules/salaries/types/salary.types';

interface UseSalaryDataParams {
  selectedMonth: string;
  salariesDraftKey: string;
}

export interface SalaryDataResult extends PreparedSalaryState {
  isLoading: boolean;
  error: Error | null;
  previewBackendError: string | null;
}

const SALARY_DATA_TIMEOUT_MS = 15_000;

export function useSalaryData({ selectedMonth, salariesDraftKey }: UseSalaryDataParams): SalaryDataResult {
  const { user } = useAuth();
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const queryClient = useQueryClient();

  const { data: activeIdsData } = useMonthlyActiveEmployeeIds(selectedMonth);
  const activeEmployeeIdsInMonth = activeIdsData?.employeeIds;

  const queryKey = useMemo(
    () => ['salaries', uid, 'full-data', selectedMonth, salariesDraftKey] as const,
    [uid, selectedMonth, salariesDraftKey],
  );

  const query = useQuery<PreparedSalaryState & { previewBackendError: string | null }, Error>({
    queryKey,
    enabled: enabled && isValidSalaryMonthYear(selectedMonth) && !!user?.id,
    staleTime: 20_000,
    retry: defaultQueryRetry,
    queryFn: async () => {
      // ── Step 1: Fetch monthly context with timeout ─────────────────────────
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('انتهت مهلة تحميل بيانات الرواتب. حاول مرة أخرى.')),
          SALARY_DATA_TIMEOUT_MS,
        );
      });

      const monthlyContext = await Promise.race([
        salaryDataService.getMonthlyContext(selectedMonth),
        timeoutPromise,
      ]);

      // ── Step 2: Fetch salary preview (errors are captured, not thrown) ─────
      let previewData: Awaited<ReturnType<typeof salaryDataService.getSalaryPreviewForMonth>> = [];
      let previewBackendError: string | null = null;

      try {
        previewData = await salaryDataService.getSalaryPreviewForMonth(selectedMonth);
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        const normalized = raw.startsWith('PREVIEW_BACKEND:')
          ? raw.replace('PREVIEW_BACKEND:', '').trim()
          : raw;
        previewBackendError = normalized || 'تعذر تحميل معاينة الرواتب من الخادم';
      }

      const salaryBaseContext = {
        monthlyContext,
        previewData: previewData || [],
      } satisfies SalaryBaseContextData;

      // ── Step 3: Prepare full salary state (rows, maps, draft hydration) ────
      const prepared = await prepareSalaryState({
        salaryBaseContext,
        selectedMonth,
        activeEmployeeIdsInMonth,
        salariesDraftKey,
      });

      return { ...prepared, previewBackendError };
    },
  });

  // Invalidate when daily_orders change (realtime sync)
  useRealtimePostgresChanges(
    `salaries-orders-sync-${uid}-${selectedMonth}`,
    ['daily_orders'],
    () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  );

  const empty: PreparedSalaryState = {
    appNameToId: {},
    rulesMap: {},
    appsWithoutPricingRules: [],
    appsWithoutScheme: [],
    builtEmpPlatformScheme: {},
    hydratedRows: [],
  };

  return {
    ...(query.data ?? empty),
    previewBackendError: query.data?.previewBackendError ?? null,
    isLoading: query.isLoading || query.isFetching,
    error: query.error ?? null,
  };
}
