/**
 * useSalaryData — Two-phase data loading + placeholder cache for the salaries page.
 *
 * ── Phase 1 (fast, ~1-2s) ─────────────────────────────────────────────────
 * Fetches all non-RPC data in parallel:
 *   employees, orders, apps, advances, fuel, saved records, deductions
 * Builds the salary table immediately with saved/stored data.
 *
 * ── Phase 2 (slow, background, ~2-3s) ────────────────────────────────────
 * Calls preview_salary_for_month RPC in the background.
 * Updates salary figures silently when RPC returns.
 *
 * ── Phase 3 — placeholder cache ──────────────────────────────────────────
 * When the user switches months, we show the previously loaded rows
 * immediately as a visual placeholder while the new month loads.
 * A banner "⚠️ تعرض بيانات شهر سابق" is shown until the new data arrives.
 * This eliminates the blank-table flash when navigating between months.
 *
 * Safety: placeholderData is only used for isLoading=true state.
 * As soon as real data arrives, it replaces the placeholder.
 * The banner prevents any confusion about which month is shown.
 */
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';
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
  /** Phase 1 loading — table not ready yet (showing placeholder or spinner) */
  isLoading: boolean;
  /** True when showing cached data from a previous month while new month loads */
  isShowingPlaceholder: boolean;
  /** Phase 2 loading — table is visible, preview RPC updating in background */
  isRefreshingPreview: boolean;
  error: Error | null;
  previewBackendError: string | null;
}

const PHASE1_TIMEOUT_MS = 12_000;

const EMPTY_STATE: PreparedSalaryState = {
  appNameToId: {},
  rulesMap: {},
  appsWithoutPricingRules: [],
  appsWithoutScheme: [],
  builtEmpPlatformScheme: {},
  hydratedRows: [],
};

export function useSalaryData({ selectedMonth, salariesDraftKey }: UseSalaryDataParams): SalaryDataResult {
  const { user } = useAuth();
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const queryClient = useQueryClient();

  const { data: activeIdsData } = useMonthlyActiveEmployeeIds(selectedMonth);
  const activeEmployeeIdsInMonth = activeIdsData?.employeeIds;

  const isQueryEnabled = enabled && isValidSalaryMonthYear(selectedMonth) && !!user?.id;

  // ── Query keys ────────────────────────────────────────────────────────────
  const phase1Key = useMemo(
    () => ['salaries', uid, 'context', selectedMonth] as const,
    [uid, selectedMonth],
  );
  const phase2Key = useMemo(
    () => ['salaries', uid, 'preview', selectedMonth] as const,
    [uid, selectedMonth],
  );
  const fullDataKey = useMemo(
    () => ['salaries', uid, 'full-data', selectedMonth, salariesDraftKey] as const,
    [uid, selectedMonth, salariesDraftKey],
  );

  // ── Track the last successfully loaded month for placeholder ─────────────
  // When selectedMonth changes, the previous month's data is used as placeholder
  // until the new month's phase1 completes.
  const lastLoadedMonthRef = useRef<string | null>(null);

  // ── Phase 1: fetch all non-RPC data in parallel ──────────────────────────
  const phase1 = useQuery({
    queryKey: phase1Key,
    enabled: isQueryEnabled,
    staleTime: 20_000,
    retry: defaultQueryRetry,
    // keepPreviousData: show last month's context while new month loads
    placeholderData: keepPreviousData,
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

  // ── Phase 2: preview RPC in background ───────────────────────────────────
  const phase2 = useQuery({
    queryKey: phase2Key,
    enabled: isQueryEnabled && phase1.isSuccess && !phase1.isPlaceholderData,
    staleTime: 20_000,
    retry: 1,
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

  // ── Full state: build rows from real phase1 data (not placeholder) ────────
  const fullDataQuery = useQuery<PreparedSalaryState, Error>({
    queryKey: fullDataKey,
    // Only run when phase1 has REAL data for this month (not placeholder from prev month)
    enabled: isQueryEnabled && phase1.isSuccess && !phase1.isPlaceholderData,
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      const monthlyContext = phase1.data!;
      const previewData = phase2.data?.previewData ?? [];

      const salaryBaseContext: SalaryBaseContextData = {
        monthlyContext,
        previewData,
      };

      const result = await prepareSalaryState({
        salaryBaseContext,
        selectedMonth,
        activeEmployeeIdsInMonth,
        salariesDraftKey,
      });

      // Track that we successfully loaded this month
      lastLoadedMonthRef.current = selectedMonth;

      return result;
    },
  });

  // Re-run fullDataQuery when phase2 finishes
  useMemo(() => {
    if (phase2.isSuccess && !phase1.isPlaceholderData) {
      void queryClient.invalidateQueries({ queryKey: fullDataKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase2.isSuccess, phase2.dataUpdatedAt]);

  // Invalidate on realtime daily_orders changes
  useRealtimePostgresChanges(
    `salaries-orders-sync-${uid}-${selectedMonth}`,
    ['daily_orders'],
    () => {
      void queryClient.invalidateQueries({ queryKey: phase1Key });
      void queryClient.invalidateQueries({ queryKey: phase2Key });
    },
  );

  // ── Determine if we are showing placeholder (prev month's data) ───────────
  // isPlaceholderData is true when keepPreviousData is active (month just changed)
  const isShowingPlaceholder = phase1.isPlaceholderData === true;

  // ── Determine loading state ───────────────────────────────────────────────
  // isLoading = true only when no data at all (first ever load, no placeholder)
  const isLoading = phase1.isLoading && !isShowingPlaceholder;

  // ── Determine refreshing state ────────────────────────────────────────────
  // isRefreshingPreview = phase2 in flight after real phase1 data arrived
  const isRefreshingPreview =
    phase1.isSuccess &&
    !phase1.isPlaceholderData &&
    (phase2.isLoading || fullDataQuery.isFetching);

  return {
    ...(fullDataQuery.data ?? EMPTY_STATE),
    previewBackendError: phase2.data?.previewBackendError ?? null,
    isLoading,
    isShowingPlaceholder,
    isRefreshingPreview,
    error: (!isShowingPlaceholder && phase1.error) ? phase1.error as Error : null,
  };
}
