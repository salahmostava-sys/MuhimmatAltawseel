/**
 * useSalaryData — Two-phase data loading for the salaries page.
 *
 * ── Phase 1 (fast, ~1-2s) ─────────────────────────────────────────────────
 * Fetches all non-RPC data in parallel:
 *   employees, orders, apps, advances, fuel, saved records, deductions
 * Builds the salary table immediately with saved/stored data.
 * Action buttons (approve, export) are enabled once phase 1 is done.
 *
 * ── Phase 2 (slow, background, ~2-3s) ────────────────────────────────────
 * Calls preview_salary_for_month RPC in the background.
 * Updates salary figures when RPC returns.
 * Action buttons stay ENABLED during phase 2 — numbers are already correct
 * from saved records. The preview just enriches platform breakdowns.
 * A subtle "refreshing" indicator is shown during phase 2.
 *
 * This approach saves ~2-3s of perceived load time with zero data integrity risk,
 * because approve/export always reads from the current row state (not RPC directly).
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
  /** Phase 1 loading — table not ready yet */
  isLoading: boolean;
  /** Phase 2 loading — table is visible, preview updating in background */
  isRefreshingPreview: boolean;
  error: Error | null;
  previewBackendError: string | null;
}

const PHASE1_TIMEOUT_MS = 12_000;

export function useSalaryData({ selectedMonth, salariesDraftKey }: UseSalaryDataParams): SalaryDataResult {
  const { user } = useAuth();
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const queryClient = useQueryClient();

  const { data: activeIdsData } = useMonthlyActiveEmployeeIds(selectedMonth);
  const activeEmployeeIdsInMonth = activeIdsData?.employeeIds;

  const isQueryEnabled = enabled && isValidSalaryMonthYear(selectedMonth) && !!user?.id;

  // ── Phase 1 query key: monthly context (fast data) ────────────────────────
  const phase1Key = useMemo(
    () => ['salaries', uid, 'context', selectedMonth] as const,
    [uid, selectedMonth],
  );

  // ── Phase 2 query key: RPC preview (slow, background) ────────────────────
  const phase2Key = useMemo(
    () => ['salaries', uid, 'preview', selectedMonth] as const,
    [uid, selectedMonth],
  );

  // ── Full data key (depends on both phases + draft key) ───────────────────
  const fullDataKey = useMemo(
    () => ['salaries', uid, 'full-data', selectedMonth, salariesDraftKey] as const,
    [uid, selectedMonth, salariesDraftKey],
  );

  // ── Phase 1: fetch all non-RPC data in parallel ──────────────────────────
  const phase1 = useQuery({
    queryKey: phase1Key,
    enabled: isQueryEnabled,
    staleTime: 20_000,
    retry: defaultQueryRetry,
    queryFn: async () => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('انتهت مهلة تحميل بيانات الرواتب. حاول مرة أخرى.')),
          PHASE1_TIMEOUT_MS,
        );
      });

      return Promise.race([
        salaryDataService.getMonthlyContext(selectedMonth),
        timeoutPromise,
      ]);
    },
  });

  // ── Phase 2: preview RPC — starts only after phase 1 succeeds ────────────
  // enabled depends on phase1 success, so it starts automatically in background
  const phase2 = useQuery({
    queryKey: phase2Key,
    // Only start phase 2 once phase 1 data is available
    enabled: isQueryEnabled && phase1.isSuccess,
    staleTime: 20_000,
    retry: 1, // preview RPC failure is non-fatal — only retry once
    queryFn: async () => {
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

      return { previewData: previewData || [], previewBackendError };
    },
  });

  // ── Full state: build rows whenever phase 1 or phase 2 data changes ───────
  const fullDataQuery = useQuery<PreparedSalaryState, Error>({
    queryKey: fullDataKey,
    // Run when phase 1 is done (phase 2 is optional — we merge what we have)
    enabled: isQueryEnabled && phase1.isSuccess,
    staleTime: 0, // always recalculate when inputs change
    retry: false,
    queryFn: async () => {
      const monthlyContext = phase1.data!;
      // Use phase 2 data if available, otherwise empty preview (rows show saved data)
      const previewData = phase2.data?.previewData ?? [];

      const salaryBaseContext: SalaryBaseContextData = {
        monthlyContext,
        previewData,
      };

      return prepareSalaryState({
        salaryBaseContext,
        selectedMonth,
        activeEmployeeIdsInMonth,
        salariesDraftKey,
      });
    },
  });

  // Re-run fullDataQuery when phase 2 finishes (preview data becomes available)
  // We do this by invalidating fullDataKey whenever phase2 succeeds
  useMemo(() => {
    if (phase2.isSuccess) {
      void queryClient.invalidateQueries({ queryKey: fullDataKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase2.isSuccess, phase2.dataUpdatedAt]);

  // Invalidate everything when daily_orders change (realtime sync)
  useRealtimePostgresChanges(
    `salaries-orders-sync-${uid}-${selectedMonth}`,
    ['daily_orders'],
    () => {
      void queryClient.invalidateQueries({ queryKey: phase1Key });
      void queryClient.invalidateQueries({ queryKey: phase2Key });
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
    ...(fullDataQuery.data ?? empty),
    previewBackendError: phase2.data?.previewBackendError ?? null,
    // Phase 1 loading = table not ready yet (show full-page spinner)
    isLoading: phase1.isLoading,
    // Phase 2 loading = table visible, preview updating in background (show subtle indicator)
    isRefreshingPreview: phase1.isSuccess && (phase2.isLoading || fullDataQuery.isFetching),
    error: phase1.error ?? null,
  };
}
