import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Settings2 } from 'lucide-react';
import { useToast } from '@shared/hooks/use-toast';
import { useAppColors } from '@shared/hooks/useAppColors';
import { useAuth } from '@app/providers/AuthContext';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '@app/providers/SystemSettingsContext';
import type { PricingRule } from '@services/salaryService';
import { salaryDataService } from '@services/salaryDataService';
import { useMonthlyActiveEmployeeIds } from '@shared/hooks/useMonthlyActiveEmployeeIds';
import { createDefaultGlobalFilters } from '@shared/components/table/GlobalTableFilters';
import { isValidSalaryMonthYear } from '@shared/lib/salaryValidation';
import { defaultQueryRetry } from '@shared/lib/query';
import { loadJsPdf } from '@modules/salaries/lib/salaryPdfLoaders';

import type { FastApprovedFilter } from '@modules/salaries/model/salaryUtils';
import { SalaryFastList as SalariesFastList } from '@modules/salaries/components/SalaryFastList';
import { SalarySchemeSelector } from '@modules/salaries/components/SalarySchemeSelector';
import { PayslipModal } from '@modules/salaries/components/PayslipModal';
import { useSalaryFilteredRows } from '@modules/salaries/hooks/useSalaryTable';
import { useSalaryActions } from '@modules/salaries/hooks/useSalaryActions';
import { SalaryMonthSelector, SalarySummaryCards } from '@modules/salaries/components/SalaryMonthSelector';
import { SalaryActionsBar, BatchProgressBar } from '@modules/salaries/components/SalaryActionsBar';
import { SalaryCardsView } from '@modules/salaries/components/SalaryCardsView';
import { SalaryTable } from '@modules/salaries/components/SalaryTable';
import { SalaryDetailDialog, BatchSlipRenderer, buildBatchSlipHTML } from '@modules/salaries/components/SalarySlipModal';
import { SalarySlipTemplateEditor } from '@modules/salaries/components/SalarySlipTemplateEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';

import { PLATFORM_COLORS } from '@modules/salaries/lib/salaryConstants';
import { months } from '@modules/salaries/lib/salaryMonths';
import { prepareSalaryState } from '@modules/salaries/lib/salaryDomain';
import type {
  SalaryRow,
  SchemeData,
  SortDir,
  SalaryBaseContextData,
  SalaryDraftPatch,
  PreparedSalaryState,
} from '@modules/salaries/types/salary.types';
import type JSZip from 'jszip';

import { useTemporalContext } from '@app/providers/TemporalContext';

const Salaries = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const navigate = useNavigate();
  const { projectName } = useSystemSettings();
  const { apps: appColorsList } = useAppColors();
  const { selectedMonth } = useTemporalContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
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
  const [pageMode, setPageMode] = useState<'detailed' | 'fast'>('detailed');
  const [fastPage, setFastPage] = useState(1);
  const [fastPageSize] = useState(50);
  const [fastFilters, setFastFilters] = useState(() => createDefaultGlobalFilters());
  const [fastApproved, setFastApproved] = useState<FastApprovedFilter>('all');
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; platform: string } | null>(null);
  const [appsWithoutScheme, setAppsWithoutScheme] = useState<string[]>([]);
  const [appsWithoutPricingRules, setAppsWithoutPricingRules] = useState<string[]>([]);
  const [appIdByName, setAppIdByName] = useState<Record<string, string>>({});
  const [pricingRulesByAppId, setPricingRulesByAppId] = useState<Record<string, PricingRule[]>>({});
  const [employeeFieldSaving, setEmployeeFieldSaving] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<SalaryRow | null>(null);
  const [detailOrders, setDetailOrders] = useState<{ appName: string; orders: number; salary: number }[]>([]);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  const [batchQueue, setBatchQueue] = useState<SalaryRow[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchZip, setBatchZip] = useState<JSZip | null>(null);
  const [batchMonth, setBatchMonth] = useState('');
  const salaryToolbarImportRef = useRef<HTMLInputElement>(null);
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
  useEffect(() => {
    Object.keys(PLATFORM_COLORS).forEach((k) => delete PLATFORM_COLORS[k]);
    Object.assign(PLATFORM_COLORS, platformColors);
  }, [platformColors]);

  const {
    data: salaryBaseContext,
    error: salaryBaseContextError,
    isLoading: salaryBaseContextLoading,
  } = useQuery({
    queryKey: ['salaries', uid, 'base-context', selectedMonth],
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

  useEffect(() => {
    if (loadingData || rows.length === 0) return;
    const timer = setTimeout(() => {
      const draft: Record<string, SalaryDraftPatch> = {};
      rows.forEach((row) => {
        draft[row.id] = {
          platformOrders: row.platformOrders,
          incentives: row.incentives,
          sickAllowance: row.sickAllowance,
          violations: row.violations,
          customDeductions: row.customDeductions,
          transfer: row.transfer,
          advanceDeduction: row.advanceDeduction,
          externalDeduction: row.externalDeduction,
          platformIncome: row.platformIncome,
        };
      });
      localStorage.setItem(salariesDraftKey, JSON.stringify(draft));
    }, 600);
    return () => clearTimeout(timer);
  }, [rows, loadingData, salariesDraftKey]);

  const { filtered, computeRow } = useSalaryFilteredRows(
    rows, search, statusFilter, cityFilter, sortField, sortDir, platforms
  );

  const actions = useSalaryActions({
    rows, setRows, filtered, computeRow, selectedMonth, platforms, platformColors,
    toast, user, uid, queryClient, projectName,
    payslipRow, setPayslipRow,
    sortField, setSortField, sortDir, setSortDir,
    salaryActionLoading, setSalaryActionLoading,
    setMarkingPaid, setBatchQueue, setBatchIndex, setBatchZip, setBatchMonth,
    salaryToolbarImportRef, employeeFieldSaving, setEmployeeFieldSaving,
    appIdByName, pricingRulesByAppId, empPlatformScheme,
    setDetailRow, setDetailOrders,
  });

  const totalNet = filtered.reduce((s, r) => s + computeRow(r).netSalary, 0);
  const pendingCount = filtered.filter(r => r.status === 'pending').length;

  // ── Batch ZIP export: generate HTML-based PDFs sequentially ────
  useEffect(() => {
    if (batchQueue.length === 0 || !batchZip) return;
    if (batchIndex >= batchQueue.length) {
      const [y, m] = selectedMonth.split('-');
      batchZip.generateAsync({ type: 'blob' }).then(blob => {
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
      try {
        const row = batchQueue[batchIndex];
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

        const pdfBlob = pdf.output('blob');
        const safeName = row.employeeName.replace(/\s+/g, '_');
        const [y, m] = selectedMonth.split('-');
        batchZip.file(`كشف_راتب_${safeName}_${m}_${y}.pdf`, pdfBlob);
        setBatchIndex(i => i + 1);
      } catch {
        setBatchIndex(i => i + 1);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [batchIndex, batchQueue, batchZip, selectedMonth, toast, projectName]);

  if (pageMode === 'fast') {
    return (
      <SalariesFastList
        monthYear={selectedMonth}
        branch={fastFilters.branch}
        search={fastFilters.search}
        approved={fastApproved}
        onApprovedChange={setFastApproved}
        onFiltersChange={(next) => { setFastFilters(next); setFastPage(1); }}
        page={fastPage}
        pageSize={fastPageSize}
        onPageChange={setFastPage}
        onBack={() => setPageMode('detailed')}
        onSalaryTemplate={actions.downloadSalaryTemplate}
        onSalaryImport={actions.handleSalaryImportFile}
        salaryActionLoading={salaryActionLoading}
      />
    );
  }

  const monthLabel = months.find(m => m.v === selectedMonth)?.l || selectedMonth;

  return (
    <div className="space-y-4" dir="rtl">
      <SalaryMonthSelector
        setPageMode={setPageMode}
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
        <SalaryCardsView
          loadingData={loadingData}
          filtered={filtered}
          computeRow={computeRow}
          approveRow={actions.approveRow}
          markAsPaid={actions.markAsPaid}
          markingPaid={markingPaid}
          setPayslipRow={setPayslipRow}
        />
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
        <PayslipModal
          row={payslipRow}
          selectedMonth={selectedMonth}
          companyName={projectName}
          onClose={() => setPayslipRow(null)}
          onApprove={() => { actions.approveRow(payslipRow.id); setPayslipRow(null); }}
        />
      )}

      {detailRow && (
        <SalaryDetailDialog
          detailRow={detailRow}
          computeRow={computeRow}
          platforms={platforms}
          platformColors={platformColors}
          appCustomColumns={appCustomColumns}
          detailOrders={detailOrders}
          selectedMonth={selectedMonth}
          monthLabel={monthLabel}
          setDetailRow={setDetailRow}
          setPayslipRow={setPayslipRow}
        />
      )}

      <BatchSlipRenderer
        batchQueue={batchQueue}
        batchIndex={batchIndex}
        batchMonth={batchMonth}
        projectName={projectName}
      />

      <Dialog open={showTemplateEditor} onOpenChange={setShowTemplateEditor}>
        <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] overflow-y-auto p-0 border-none bg-muted/20">
          <DialogHeader className="p-6 bg-white border-b sticky top-0 z-10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Settings2 className="text-primary" /> إعدادات قوالب كشوف الرواتب
            </DialogTitle>
          </DialogHeader>
          <div className="p-2">
            <SalarySlipTemplateEditor />
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Salaries;
