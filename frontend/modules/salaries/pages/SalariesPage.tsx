import { Suspense, lazy, useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Settings2 } from 'lucide-react';
import { useToast } from '@shared/hooks/use-toast';
import { useAppColors } from '@shared/hooks/useAppColors';
import { useAuth } from '@app/providers/AuthContext';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { usePermissions } from '@shared/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '@app/providers/SystemSettingsContext';
import type { PricingRule } from '@services/salaryService';
import { salaryDataService } from '@services/salaryDataService';
import { salaryDraftService } from '@services/salaryDraftService';
import { useMonthlyActiveEmployeeIds } from '@shared/hooks/useMonthlyActiveEmployeeIds';
import { useRealtimePostgresChanges } from '@shared/hooks/useRealtimePostgresChanges';
import { isValidSalaryMonthYear } from '@shared/lib/salaryValidation';
import { defaultQueryRetry } from '@shared/lib/query';
import { loadJsPdf } from '@modules/salaries/lib/salaryPdfLoaders';
import Loading from '@shared/components/Loading';
import { toast as sonnerToast } from '@shared/components/ui/sonner';
import { logError } from '@shared/lib/logger';

import { SalarySchemeSelector } from '@modules/salaries/components/SalarySchemeSelector';
import { useSalaryFilteredRows } from '@modules/salaries/hooks/useSalaryTable';
import { useSalaryActions } from '@modules/salaries/hooks/useSalaryActions';
import { SalaryMonthSelector, SalarySummaryCards } from '@modules/salaries/components/SalaryMonthSelector';
import { SalaryActionsBar, BatchProgressBar } from '@modules/salaries/components/SalaryActionsBar';
import { SalaryTable } from '@modules/salaries/components/SalaryTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';

// PLATFORM_COLORS import removed — we now derive colors locally via useMemo (platformMeta)
// import { PLATFORM_COLORS } from '@modules/salaries/lib/salaryConstants';
import { months } from '@modules/salaries/lib/salaryMonths';
import { buildSalaryDraftPatch, prepareSalaryState } from '@modules/salaries/lib/salaryDomain';
import type {
  SalaryRow,
  SchemeData,
  SortDir,
  SalaryBaseContextData,
  PreparedSalaryState,
} from '@modules/salaries/types/salary.types';
import type JSZip from 'jszip';

import { useTemporalContext } from '@app/providers/TemporalContext';

const PayslipModal = lazy(() =>
  import('@modules/salaries/components/PayslipModal').then((module) => ({
    default: module.PayslipModal,
  })),
);
const SalaryCardsView = lazy(() =>
  import('@modules/salaries/components/SalaryCardsView').then((module) => ({
    default: module.SalaryCardsView,
  })),
);
const SalaryDetailDialog = lazy(() =>
  import('@modules/salaries/components/SalarySlipModal').then((module) => ({
    default: module.SalaryDetailDialog,
  })),
);
const SalarySlipTemplateEditor = lazy(() =>
  import('@modules/salaries/components/SalarySlipTemplateEditor').then((module) => ({
    default: module.SalarySlipTemplateEditor,
  })),
);

const InlineLoader = ({ minHeightClassName = 'min-h-[220px]' }: Readonly<{ minHeightClassName?: string }>) => (
  <Loading minHeightClassName={minHeightClassName} />
);

const buildSalaryDraftMap = (rows: SalaryRow[]) => {
  const draft: Record<string, ReturnType<typeof buildSalaryDraftPatch>> = {};
  rows
    .filter((row) => !!row.isDirty)
    .forEach((row) => {
      draft[row.id] = buildSalaryDraftPatch(row);
    });
  return draft;
};

const Salaries = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const navigate = useNavigate();
  const { permissions } = usePermissions('salaries');
  const { projectName } = useSystemSettings();
  const { apps: appColorsList } = useAppColors();
  const { selectedMonth } = useTemporalContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter] = useState('all');
  const { data: activeIdsData } = useMonthlyActiveEmployeeIds(selectedMonth);
  const activeEmployeeIdsInMonth = activeIdsData?.employeeIds;
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [empPlatformScheme, setEmpPlatformScheme] = useState<Record<string, Record<string, SchemeData | null>>>({});
  const [payslipRow, setPayslipRow] = useState<SalaryRow | null>(null);
  const [salaryActionLoading, setSalaryActionLoading] = useState(false);
  const queryClient = useQueryClient();
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [previewBackendError, setPreviewBackendError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; platform: string } | null>(null);
  const [appsWithoutScheme, setAppsWithoutScheme] = useState<string[]>([]);
  const [appsWithoutPricingRules, setAppsWithoutPricingRules] = useState<string[]>([]);
  const [appIdByName, setAppIdByName] = useState<Record<string, string>>({});
  const [pricingRulesByAppId, setPricingRulesByAppId] = useState<Record<string, PricingRule[]>>({});
  const [employeeFieldSaving, setEmployeeFieldSaving] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<SalaryRow | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  const [batchQueue, setBatchQueue] = useState<SalaryRow[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchZip, setBatchZip] = useState<JSZip | null>(null);
  const [batchMonth, setBatchMonth] = useState('');
  const salaryToolbarImportRef = useRef<HTMLInputElement>(null);
  const skipNextDraftSaveRef = useRef(true);
  const lastDraftSignatureRef = useRef<string | null>(null);
  const batchAbortRef = useRef(false);
  const salariesDraftKey = useMemo(
    () => `salaries:draft:${user?.id || 'anon'}:${selectedMonth}`,
    [user?.id, selectedMonth]
  );

  const appsWithoutPricingRulesDeduped = useMemo(
    () => appsWithoutPricingRules.filter((n) => !appsWithoutScheme.includes(n)),
    [appsWithoutPricingRules, appsWithoutScheme]
  );

  const platformMeta = useMemo(() => {
    const newColors: Record<string, { header: string; headerText: string; cellBg: string; valueColor: string; focusBorder: string }> = {};
    const newPlatforms: string[] = [];
    const newCustomCols: Record<string, import('@shared/hooks/useAppColors').CustomColumn[]> = {};
    appColorsList
      .filter((a) => a.is_active)
      .forEach((app) => {
        newPlatforms.push(app.name);
        newColors[app.name] = {
          header: app.brand_color,
          headerText: app.text_color,
          cellBg: `${app.brand_color}18`,
          valueColor: app.brand_color,
          focusBorder: app.brand_color,
        };
        newCustomCols[app.name] = app.custom_columns || [];
      });
    return { platforms: newPlatforms, platformColors: newColors, appCustomColumns: newCustomCols };
  }, [appColorsList]);
  const platforms = platformMeta.platforms;
  const platformColors = platformMeta.platformColors;
  const appCustomColumns = platformMeta.appCustomColumns;
  // NOTE: Previously mutated shared PLATFORM_COLORS in-place — now we only use the local
  // `platformColors` derived via useMemo above. Components that still import PLATFORM_COLORS
  // from salaryConstants receive the original defaults; within Salaries we always pass
  // `platformColors` (from platformMeta) as a prop, so the shared object stays untouched.

  const salaryBaseContextQueryKey = useMemo(
    () => ['salaries', uid, 'base-context', selectedMonth] as const,
    [selectedMonth, uid],
  );

  const {
    data: salaryBaseContext,
    error: salaryBaseContextError,
    isLoading: salaryBaseContextLoading,
  } = useQuery({
    queryKey: salaryBaseContextQueryKey,
    enabled: enabled && isValidSalaryMonthYear(selectedMonth),
    queryFn: async () => {
      const monthlyContextPromise = salaryDataService.getMonthlyContext(selectedMonth);
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('انتهت مهلة تحميل بيانات الرواتب. حاول مرة أخرى.')),
          15000
        );
      });

      let monthlyContext: Awaited<ReturnType<typeof salaryDataService.getMonthlyContext>>;
      try {
        monthlyContext = await Promise.race([monthlyContextPromise, timeoutPromise]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      const previewData = await salaryDataService.getSalaryPreviewForMonth(selectedMonth);

      return {
        monthlyContext,
        previewData: previewData || [],
      };
    },
    retry: defaultQueryRetry,
    staleTime: 20_000,
  });

  useRealtimePostgresChanges(
    `salaries-orders-sync-${uid}-${selectedMonth}`,
    ['daily_orders'],
    () => {
      void queryClient.invalidateQueries({ queryKey: salaryBaseContextQueryKey });
    },
  );

  // ─── Data fetching ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const handleFetchError = (error: unknown) => {
      const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء تحميل الرواتب';
      if (message.startsWith('PREVIEW_BACKEND:')) {
        const normalized = message.replace('PREVIEW_BACKEND:', '').trim();
        setRows([]);
        setPreviewBackendError(normalized || 'تعذر تحميل معاينة الرواتب من الخادم');
      }
      toast({
        title: 'تعذر تحميل البيانات',
        description: message,
        variant: 'destructive',
      });
    };

    const applyPreparedSalaryState = (prepared: PreparedSalaryState) => {
      setAppIdByName(prepared.appNameToId);
      setPricingRulesByAppId(prepared.rulesMap);
      setAppsWithoutPricingRules(prepared.appsWithoutPricingRules);
      setAppsWithoutScheme(prepared.appsWithoutScheme);
      setEmpPlatformScheme(prepared.builtEmpPlatformScheme);
      setRows(prepared.hydratedRows);
    };

    const fetchAllData = async () => {
      if (salaryBaseContextLoading) {
        setLoadingData(true);
        return;
      }
      setLoadingData(true);
      setPreviewBackendError(null);
      if (salaryBaseContextError) {
        if (!cancelled) handleFetchError(salaryBaseContextError);
        setLoadingData(false);
        return;
      }
      if (!salaryBaseContext || cancelled) return;
      try {
        const prepared = await prepareSalaryState({
          salaryBaseContext: salaryBaseContext as SalaryBaseContextData,
          selectedMonth,
          activeEmployeeIdsInMonth,
          salariesDraftKey,
        });

        if (cancelled) return;
        applyPreparedSalaryState(prepared);
      } catch (error) {
        if (!cancelled) handleFetchError(error);
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    };

    void fetchAllData();
    return () => {
      cancelled = true;
    };
  }, [
    selectedMonth,
    salariesDraftKey,
    salaryBaseContext,
    salaryBaseContextError,
    salaryBaseContextLoading,
    activeEmployeeIdsInMonth,
    toast,
  ]);

  // ── Draft syncing flow ──────────────────────────────────────────
  // When selectedMonth or user changes, reset draft tracking refs so that the first
  // render with new data doesn't trigger a premature server sync.
  useEffect(() => {
    skipNextDraftSaveRef.current = true;
    lastDraftSignatureRef.current = null;
  }, [selectedMonth, user?.id]);

  // Draft auto-save effect:
  // 1. Build a draft patch from dirty rows → serialize to JSON.
  // 2. Mirror to localStorage for offline persistence.
  // 3. On first data load (skipNextDraftSaveRef), capture the signature but don't sync
  //    to the server — avoids writing back the same data we just loaded.
  // 4. On subsequent changes, compare serialized draft with lastDraftSignatureRef.
  //    If different, debounce 2s then sync to server via salaryDraftService.
  useEffect(() => {
    if (loadingData) return;

    const draft = buildSalaryDraftMap(rows);
    const serializedDraft = JSON.stringify(draft);

    try {
      if (Object.keys(draft).length === 0) {
        localStorage.removeItem(salariesDraftKey);
      } else {
        localStorage.setItem(salariesDraftKey, serializedDraft);
      }
    } catch (e) {
      logError('[Salaries] Failed to mirror drafts to localStorage', e, { level: 'warn' });
    }

    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      lastDraftSignatureRef.current = serializedDraft;
      return;
    }

    if (lastDraftSignatureRef.current === serializedDraft) return;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          await salaryDraftService.syncDraftsForMonth(selectedMonth, draft);
          lastDraftSignatureRef.current = serializedDraft;
        } catch (e) {
          logError('[Salaries] Failed to auto-save drafts to server', e, { level: 'warn' });
        }
      })();
    }, 2000);

    return () => clearTimeout(timer);
  }, [rows, loadingData, salariesDraftKey, selectedMonth]);

  const { filtered, computeRow } = useSalaryFilteredRows(
    rows, search, statusFilter, cityFilter, sortField, sortDir, platforms
  );

  const actions = useSalaryActions({
    rows, setRows, filtered, computeRow, selectedMonth, platforms, platformColors,
    toast: sonnerToast, user, uid, queryClient, projectName,
    payslipRow, setPayslipRow,
    sortField, setSortField, sortDir, setSortDir,
    salaryActionLoading, setSalaryActionLoading,
    setMarkingPaid, setBatchQueue, setBatchIndex, setBatchZip, setBatchMonth,
    salaryToolbarImportRef, employeeFieldSaving, setEmployeeFieldSaving,
    appIdByName, pricingRulesByAppId, empPlatformScheme,
    setDetailRow,
  });

  const totalNet = filtered.reduce((s, r) => s + computeRow(r).netSalary, 0);
  const pendingCount = filtered.filter((r) => r.status === 'pending' || r.isDirty).length;

  // ── Batch ZIP export: generate HTML-based PDFs sequentially ────
  // Uses batchAbortRef to cancel work on unmount and clearTimeout for cleanup.
  useEffect(() => {
    batchAbortRef.current = false;

    if (batchQueue.length === 0 || !batchZip) return;
    if (batchIndex >= batchQueue.length) {
      const [y, m] = selectedMonth.split('-');
      batchZip.generateAsync({ type: 'blob' }).then(blob => {
        if (batchAbortRef.current) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `كشوف_رواتب_${m}_${y}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: `✅ تم تحميل ${batchQueue.length} كشف راتب في ملف ZIP` });
        setBatchQueue([]);
        setBatchIndex(0);
        setBatchZip(null);
      });
      return;
    }

    const timer = setTimeout(async () => {
      if (batchAbortRef.current) return;
      try {
        const row = batchQueue[batchIndex];
        const { buildBatchSlipHTML } = await import('@modules/salaries/lib/buildBatchSlipHTML');
        const html = buildBatchSlipHTML(row, months.find(m => m.v === selectedMonth)?.l || selectedMonth, projectName);

        // Use jsPDF for blob generation
        const JsPdf = await loadJsPdf();
        const pdf = new JsPdf({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        // Create a temporary iframe to render HTML for jsPDF
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:794px;height:1123px;border:none';
        document.body.appendChild(iframe);
        const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iDoc) {
          iDoc.open();
          iDoc.write(html);
          iDoc.close();
        }

        // Wait for render, then capture
        await new Promise(resolve => setTimeout(resolve, 200));
        if (batchAbortRef.current) {
          try { document.body.removeChild(iframe); } catch { /* ignore */ }
          return;
        }
        const container = iDoc?.querySelector('.slip-container') as HTMLElement | null;
        if (container) {
          await pdf.html(container, {
            x: 5,
            y: 5,
            width: 190,
            windowWidth: 700,
          });
        }

        try { document.body.removeChild(iframe); } catch { /* ignore */ }

        if (batchAbortRef.current) return;
        const pdfBlob = pdf.output('blob');
        const safeName = row.employeeName.replace(/\s+/g, '_');
        const [y, m] = selectedMonth.split('-');
        batchZip.file(`كشف_راتب_${safeName}_${m}_${y}.pdf`, pdfBlob);
        setBatchIndex(i => i + 1);
      } catch {
        if (!batchAbortRef.current) setBatchIndex(i => i + 1);
      }
    }, 150);
    return () => {
      batchAbortRef.current = true;
      clearTimeout(timer);
    };
  }, [batchIndex, batchQueue, batchZip, selectedMonth, toast, projectName]);

  const monthLabel = months.find(m => m.v === selectedMonth)?.l || selectedMonth;

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <nav className="page-breadcrumb"><span>الرئيسية</span><span className="page-breadcrumb-sep">/</span><span>الرواتب</span></nav>
      </div>
      <SalaryMonthSelector
        loadingData={loadingData}
        previewBackendError={previewBackendError}
      />

      <SalarySummaryCards
        totalNet={totalNet}
        platforms={platforms}
        platformColors={platformColors}
        filtered={filtered}
        computeRow={computeRow}
      />

      {previewBackendError && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-destructive flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">المعاينة الخلفية غير متاحة</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              تم إيقاف الحساب المحلي حفاظاً على الدقة. {previewBackendError}
            </p>
          </div>
        </div>
      )}

      <SalarySchemeSelector
        appsWithoutScheme={appsWithoutScheme}
        appsWithoutPricingRulesDeduped={appsWithoutPricingRulesDeduped}
        onOpenSettings={() => navigate('/settings/schemes')}
      />

      <SalaryActionsBar
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
        pendingCount={pendingCount}
        canEdit={permissions.can_edit}
        approveAll={actions.approveAll}
        salaryActionLoading={salaryActionLoading}
        salaryToolbarImportRef={salaryToolbarImportRef}
        onSalaryToolbarImportChange={actions.onSalaryToolbarImportChange}
        runExportExcel={actions.runExportExcel}
        downloadSalaryTemplate={actions.downloadSalaryTemplate}
        openSalaryToolbarImport={actions.openSalaryToolbarImport}
        runPrintTable={actions.runPrintTable}
        startBatchZipExport={actions.startBatchZipExport}
        exportMergedPDF={actions.exportMergedPDF}
        batchQueue={batchQueue}
        batchIndex={batchIndex}
        openTemplateEditor={() => setShowTemplateEditor(true)}
      />

      <BatchProgressBar
        batchQueue={batchQueue}
        batchIndex={batchIndex}
        batchMonth={batchMonth}
      />

      {viewMode === 'cards' && (
        <Suspense fallback={<InlineLoader />}>
          <SalaryCardsView
            loadingData={loadingData}
            filtered={filtered}
            computeRow={computeRow}
            approveRow={actions.approveRow}
            approvingRowId={actions.approvingRowId}
            markAsPaid={actions.markAsPaid}
            markingPaid={markingPaid}
            setPayslipRow={setPayslipRow}
          />
        </Suspense>
      )}

      {viewMode === 'table' && (
        <SalaryTable
          loadingData={loadingData}
          rows={rows}
          filtered={filtered}
          computeRow={computeRow}
          platforms={platforms}
          platformColors={platformColors}
          appCustomColumns={appCustomColumns}
          empPlatformScheme={empPlatformScheme}
          sortField={sortField}
          sortDir={sortDir}
          handleSort={actions.handleSort}
          updateRow={actions.updateRow}
          updatePlatformOrders={actions.updatePlatformOrders}
          approveRow={actions.approveRow}
          approvingRowId={actions.approvingRowId}
          markAsPaid={actions.markAsPaid}
          markingPaid={markingPaid}
          editingCell={editingCell}
          setEditingCell={setEditingCell}
          setPayslipRow={setPayslipRow}
          persistEmployeeCity={actions.persistEmployeeCity}
          persistEmployeePaymentMethod={actions.persistEmployeePaymentMethod}
          employeeFieldSaving={employeeFieldSaving}
          openEmployeeDetail={actions.openEmployeeDetail}
        />
      )}

      {payslipRow && (
        <Suspense fallback={<InlineLoader />}>
          <PayslipModal
            row={payslipRow}
            selectedMonth={selectedMonth}
            companyName={projectName}
            onClose={() => setPayslipRow(null)}
            onApprove={() => { actions.approveRow(payslipRow.id); setPayslipRow(null); }}
          />
        </Suspense>
      )}

      {detailRow && (
        <Suspense fallback={<InlineLoader />}>
          <SalaryDetailDialog
            detailRow={detailRow}
            computeRow={computeRow}
            platforms={platforms}
            platformColors={platformColors}
            appCustomColumns={appCustomColumns}
            selectedMonth={selectedMonth}
            monthLabel={monthLabel}
            setDetailRow={setDetailRow}
            setPayslipRow={setPayslipRow}
          />
        </Suspense>
      )}

      <Dialog open={showTemplateEditor} onOpenChange={setShowTemplateEditor}>
        <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] overflow-y-auto p-0 border-none bg-muted/20">
          <DialogHeader className="p-6 bg-white border-b sticky top-0 z-10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Settings2 className="text-primary" /> إعدادات قوالب كشوف الرواتب
            </DialogTitle>
          </DialogHeader>
          <div className="p-2">
            {showTemplateEditor && (
              <Suspense fallback={<InlineLoader minHeightClassName="min-h-[480px]" />}>
                <SalarySlipTemplateEditor />
              </Suspense>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Salaries;
