/**
 * useSalaryActions — Thin orchestrator hook.
 *
 * All heavy logic has been extracted into specialised hooks:
 *   • useSalaryIO          — Excel import / export / template download
 *   • useSalaryPrint       — Print table, merged PDF, batch ZIP
 *   • useSalaryPersistence — Approve, pay, persist employee fields
 *
 * This file composes them and adds the remaining local-state helpers
 * (sorting, platform-order edits, employee-detail dialog).
 */

import type React from 'react';
import type JSZip from 'jszip';
import { toast as sonnerToast } from '@shared/components/ui/sonner';
import { salaryService, type PricingRule, type SalarySchemeTier } from '@services/salaryService';
import type { SalaryRow, SchemeData, SortDir } from '@modules/salaries/types/salary.types';
import { cycleSortState } from '@shared/lib/sortTableIndicators';
import { computeSalaryRow } from '@modules/salaries/hooks/useSalaryTable';
import { getPrimaryPlatformActivityCount } from '@modules/salaries/model/salaryUtils';
import { useSalaryIO } from '@modules/salaries/hooks/useSalaryIO';
import { useSalaryPrint } from '@modules/salaries/hooks/useSalaryPrint';
import { useSalaryPersistence } from '@modules/salaries/hooks/useSalaryPersistence';

// ─── Params (kept identical to the original for backward-compat) ─────────────

export interface UseSalaryActionsParams {
  rows: SalaryRow[];
  setRows: React.Dispatch<React.SetStateAction<SalaryRow[]>>;
  filtered: SalaryRow[];
  computeRow: (r: SalaryRow) => ReturnType<typeof computeSalaryRow>;
  selectedMonth: string;
  platforms: string[];
  platformColors: Record<string, { header: string; headerText: string; cellBg: string; valueColor: string; focusBorder: string }>;
  toast: typeof sonnerToast;
  user: { id: string } | null;
  uid: string;
  queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>;
  projectName: string;
  payslipRow: SalaryRow | null;
  setPayslipRow: React.Dispatch<React.SetStateAction<SalaryRow | null>>;
  sortField: string | null;
  setSortField: React.Dispatch<React.SetStateAction<string | null>>;
  sortDir: SortDir;
  setSortDir: React.Dispatch<React.SetStateAction<SortDir>>;
  salaryActionLoading: boolean;
  setSalaryActionLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setMarkingPaid: React.Dispatch<React.SetStateAction<string | null>>;
  setBatchQueue: React.Dispatch<React.SetStateAction<SalaryRow[]>>;
  setBatchIndex: React.Dispatch<React.SetStateAction<number>>;
  setBatchZip: React.Dispatch<React.SetStateAction<JSZip | null>>;
  setBatchMonth: React.Dispatch<React.SetStateAction<string>>;
  salaryToolbarImportRef: React.RefObject<HTMLInputElement | null>;
  employeeFieldSaving: string | null;
  setEmployeeFieldSaving: React.Dispatch<React.SetStateAction<string | null>>;
  appIdByName: Record<string, string>;
  pricingRulesByAppId: Record<string, PricingRule[]>;
  empPlatformScheme: Record<string, Record<string, SchemeData | null>>;
  setDetailRow: React.Dispatch<React.SetStateAction<SalaryRow | null>>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSalaryActions(params: UseSalaryActionsParams) {
  const {
    rows, setRows, filtered, computeRow,
    selectedMonth, platforms, platformColors,
    toast, user, uid, queryClient, projectName,
    payslipRow, setPayslipRow,
    sortField, setSortField, sortDir, setSortDir,
    salaryActionLoading, setSalaryActionLoading,
    setMarkingPaid,
    setBatchQueue, setBatchIndex, setBatchZip, setBatchMonth,
    salaryToolbarImportRef,
    setEmployeeFieldSaving,
    appIdByName, pricingRulesByAppId, empPlatformScheme,
    setDetailRow,
  } = params;

  // ── Delegate to specialised hooks ─────────────────────────────────────────

  const io = useSalaryIO({
    filtered, computeRow, selectedMonth, toast,
    uid, queryClient,
    salaryToolbarImportRef, salaryActionLoading, setSalaryActionLoading,
  });

  const print = useSalaryPrint({
    filtered, computeRow, selectedMonth,
    platforms, platformColors, projectName, toast,
    setSalaryActionLoading,
    setBatchQueue, setBatchIndex, setBatchZip, setBatchMonth,
  });

  const persistence = useSalaryPersistence({
    rows, setRows, filtered, selectedMonth,
    toast, user, uid, queryClient,
    payslipRow, setPayslipRow,
    setMarkingPaid, setEmployeeFieldSaving,
  });

  // ── Local helpers (too small to warrant their own hook) ────────────────────

  const handleSort = (field: string) => {
    const next = cycleSortState(sortField, sortDir, field);
    setSortField(next.sortField);
    setSortDir(next.sortDir);
  };

  const updatePlatformOrders = (id: string, platform: string, value: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const currentMetric = r.platformMetrics[platform];
        if (currentMetric && currentMetric.workType !== 'orders') return r;
        const newOrders = { ...r.platformOrders, [platform]: value };
        const appId = appIdByName[platform];
        const appRules = appId ? (pricingRulesByAppId[appId] || []) : [];
        const ruleResult = salaryService.applyPricingRules(appRules, value);
        let salary = Math.round(ruleResult.salary || 0);
        if (!ruleResult.matchedRule) {
          const scheme = empPlatformScheme?.[r.employeeId]?.[platform];
          if (scheme?.salary_scheme_tiers) {
            salary = salaryService.calculateTierSalary(
              value,
              scheme.salary_scheme_tiers as SalarySchemeTier[],
              scheme.target_orders,
              scheme.target_bonus,
            );
          }
        }
        const newSalaries = { ...r.platformSalaries, [platform]: salary };
        const nextMetric = {
          appName: platform,
          workType: currentMetric?.workType || 'orders',
          calculationMethod: currentMetric?.calculationMethod ?? null,
          ordersCount: value,
          shiftDays: currentMetric?.shiftDays || 0,
          salary,
        };
        const newMetrics = { ...r.platformMetrics, [platform]: nextMetric };
        return {
          ...r,
          platformOrders: { ...newOrders, [platform]: getPrimaryPlatformActivityCount(nextMetric) },
          platformSalaries: newSalaries,
          platformMetrics: newMetrics,
          isDirty: true,
        };
      }),
    );
  };

  const openEmployeeDetail = (row: SalaryRow) => {
    setDetailRow(row);
  };

  // ── Return the same public API as before (backward-compatible) ────────────

  return {
    // State
    handleSort,
    updateRow: persistence.updateRow,
    updatePlatformOrders,
    openEmployeeDetail,
    // Persistence
    persistEmployeeCity: persistence.persistEmployeeCity,
    persistEmployeePaymentMethod: persistence.persistEmployeePaymentMethod,
    approveRow: persistence.approveRow,
    approvingRowId: persistence.approvingRowId,
    markAsPaid: persistence.markAsPaid,
    approveAll: persistence.approveAll,
    computeServerSalaryForPayment: persistence.computeServerSalaryForPayment,
    settleAdvanceInstallments: persistence.settleAdvanceInstallments,
    // IO
    exportExcel: io.exportExcel,
    downloadSalaryTemplate: io.downloadSalaryTemplate,
    handleSalaryImportFile: io.handleSalaryImportFile,
    runExportExcel: io.runExportExcel,
    openSalaryToolbarImport: io.openSalaryToolbarImport,
    onSalaryToolbarImportChange: io.onSalaryToolbarImportChange,
    // Print
    handlePrintTable: print.handlePrintTable,
    startBatchZipExport: print.startBatchZipExport,
    exportMergedPDF: print.exportMergedPDF,
    runPrintTable: print.runPrintTable,
  };
}
