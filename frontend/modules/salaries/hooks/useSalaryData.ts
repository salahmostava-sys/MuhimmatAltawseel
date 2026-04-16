/**
 * useSalaryData — Two-phase data loading for the salaries page.
 *
 * ── Phase 1 (fast, ~1-2s) ─────────────────────────────────────────────────
 * Fetches all non-RPC data in parallel (employees, orders, apps, advances…)
 * Builds the salary table immediately with saved/stored data.
 *
 * ── Phase 2 (slow, background, ~2-3s) ────────────────────────────────────
 * Calls preview_salary_for_month RPC in the background after Phase 1 succeeds.
 * Updates salary figures silently when RPC returns.
 *
 * ── Placeholder / month-switch ────────────────────────────────────────────
 * When the user switches months:
 *   - Phase 1 for the NEW month fires immediately.
 *   - While it loads, isShowingPlaceholder=true → the page shows an amber
 *     banner. The table stays blank (rows=[]) — we deliberately do NOT show
 *     stale rows from the previous month to avoid confusion.
 *   - As soon as Phase 1 finishes, rows appear and isShowingPlaceholder=false.
 *
 * NOTE: keepPreviousData was removed. The placeholder rows caused the
 * "data only appears after switching months" bug because fullDataQuery was
 * blocked while isPlaceholderData=true, then the staleTime prevented a fresh
 * run when the real data finally arrived.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
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
  /** True while new month's Phase 1 is in-flight (table shows empty/banner) */
  isShowingPlaceholder: boolean;
  /** Phase 2 loading — table visible, preview numbers updating in background */
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
  // fullDataKey does NOT include salariesDraftKey — draft changes trigger
  // invalidation via queryClient.invalidateQueries in useSalaryDraft.
  // Including it in the key caused needless re-fetches on every draft save.
  const fullDataKey = useMemo(
    () => ['salaries', uid, 'full-data', selectedMonth] as const,
    [uid, selectedMonth],
  );

  // ── Phase 1: fetch all non-RPC data ──────────────────────────────────────
  const phase1 = useQuery({
    queryKey: phase1Key,
    enabled: isQueryEnabled,
    staleTime: 20_000,
    retry: defaultQueryRetry,
    // No keepPreviousData — avoids the isPlaceholderData blocking bug
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
    enabled: isQueryEnabled && phase1.isSuccess,
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

  // ── Full state: build rows whenever phase1 or phase2 data changes ─────────
  const fullDataQuery = useQuery<PreparedSalaryState, Error>({
    queryKey: fullDataKey,
    enabled: isQueryEnabled && phase1.isSuccess,
    // staleTime: 0 — always rebuild when invalidated (phase2 finish, realtime)
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      const monthlyContext = phase1.data!;
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

  // Re-run fullDataQuery when phase2 finishes (preview data becomes available)
  useEffect(() => {
    if (phase2.isSuccess) {
      void queryClient.invalidateQueries({ queryKey: fullDataKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase2.dataUpdatedAt]);

  // Invalidate everything when daily_orders change (realtime sync)
  useRealtimePostgresChanges(
    `salaries-orders-sync-${uid}-${selectedMonth}`,
    ['daily_orders'],
    () => {
      void queryClient.invalidateQueries({ queryKey: phase1Key });
      void queryClient.invalidateQueries({ queryKey: phase2Key });
    },
  );

  // isShowingPlaceholder: phase1 is loading (no data yet for this month)
  const isShowingPlaceholder = phase1.isLoading;

  // isLoading: same as isShowingPlaceholder — table not ready
  const isLoading = phase1.isLoading;

  // isRefreshingPreview: phase1 done, phase2 or rebuild in-flight
  const isRefreshingPreview =
    phase1.isSuccess && (phase2.isLoading || fullDataQuery.isFetching);

  return {
    ...(fullDataQuery.data ?? EMPTY_STATE),
    previewBackendError: phase2.data?.previewBackendError ?? null,
    isLoading,
    isShowingPlaceholder,
    isRefreshingPreview,
    error: phase1.error ? (phase1.error as Error) : null,
  };
}
