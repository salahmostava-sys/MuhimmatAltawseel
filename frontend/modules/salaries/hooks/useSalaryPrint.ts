import { useCallback } from 'react';
import type JSZip from 'jszip';
import { toast as sonnerToast } from '@shared/components/ui/sonner';
import { MERGED_PDF_STYLES, buildMergedSalaryPageHtml } from '@modules/salaries/lib/salaryMergedPdf';
import { buildSalaryTablePrintHtml } from '@modules/salaries/lib/salaryPrintTemplate';
import { months } from '@modules/salaries/lib/salaryMonths';
import { loadJsZip } from '@modules/salaries/lib/salaryPdfLoaders';
import type { SalaryRow } from '@modules/salaries/types/salary.types';
import type { computeSalaryRow } from '@modules/salaries/hooks/useSalaryTable';

// ─── Params ──────────────────────────────────────────────────────────────────

export interface UseSalaryPrintParams {
  filtered: SalaryRow[];
  computeRow: (r: SalaryRow) => ReturnType<typeof computeSalaryRow>;
  selectedMonth: string;
  platforms: string[];
  platformColors: Record<string, { header: string; headerText: string; cellBg: string; valueColor: string; focusBorder: string }>;
  projectName: string;
  toast: typeof sonnerToast;
  setSalaryActionLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setBatchQueue: React.Dispatch<React.SetStateAction<SalaryRow[]>>;
  setBatchIndex: React.Dispatch<React.SetStateAction<number>>;
  setBatchZip: React.Dispatch<React.SetStateAction<JSZip | null>>;
  setBatchMonth: React.Dispatch<React.SetStateAction<string>>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSalaryPrint(params: UseSalaryPrintParams) {
  const {
    filtered,
    computeRow,
    selectedMonth,
    platforms,
    platformColors,
    projectName,
    toast,
    setSalaryActionLoading,
    setBatchQueue,
    setBatchIndex,
    setBatchZip,
    setBatchMonth,
  } = params;

  // ── Print table ───────────────────────────────────────────────────────────

  const handlePrintTable = useCallback(() => {
    const monthLabel = months.find((m) => m.v === selectedMonth)?.l || selectedMonth;
    if (filtered.length === 0) {
      toast.success('لا يوجد بيانات للطباعة');
      return;
    }

    const html = buildSalaryTablePrintHtml({
      rows: filtered,
      platforms,
      platformColors,
      monthLabel,
      projectName,
      computeRow,
    });

    const win = globalThis.open('', '_blank', 'width=1100,height=800');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 500);
    }
  }, [filtered, selectedMonth, platforms, platformColors, projectName, computeRow, toast]);

  // ── Merged PDF ────────────────────────────────────────────────────────────

  const exportMergedPDF = useCallback(() => {
    const monthLabel = months.find((m) => m.v === selectedMonth)?.l || selectedMonth;
    const toPrint = filtered;
    if (toPrint.length === 0) {
      toast.success('لا يوجد بيانات');
      return;
    }

    const pages = toPrint
      .map((row, idx) =>
        buildMergedSalaryPageHtml({
          row,
          computed: computeRow(row),
          index: idx,
          monthLabel,
        }),
      )
      .join('\n');

    const mergedHtml = `<html dir="rtl"><head><meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
    <title>كشوف الرواتب — ${monthLabel}</title>
    <style>${MERGED_PDF_STYLES}</style></head><body>${pages}</body></html>`;

    const win = globalThis.open('', '_blank');
    if (win) {
      win.document.write(mergedHtml);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
    toast.success(`📄 تم فتح ملف PDF مدمج لـ ${toPrint.length} مندوب`);
  }, [filtered, selectedMonth, computeRow, toast]);

  // ── Batch ZIP export ──────────────────────────────────────────────────────

  const startBatchZipExport = useCallback(async () => {
    if (filtered.length === 0) {
      toast.success('لا توجد بيانات للتصدير');
      return;
    }
    const JSZipCtor = await loadJsZip();
    const zip = new JSZipCtor();
    const monthLabel = months.find((m) => m.v === selectedMonth)?.l || selectedMonth;
    setBatchMonth(monthLabel);
    setBatchZip(zip);
    setBatchIndex(0);
    setBatchQueue([...filtered]);
    toast.success(`⏳ جارٍ تجهيز ${filtered.length} كشف راتب...`, {
      description: 'يرجى الانتظار حتى يكتمل التحميل',
    });
  }, [filtered, selectedMonth, toast, setBatchMonth, setBatchZip, setBatchIndex, setBatchQueue]);

  // ── Toolbar wrapper ───────────────────────────────────────────────────────

  const runPrintTable = useCallback(async () => {
    setSalaryActionLoading(true);
    try {
      handlePrintTable();
    } finally {
      setSalaryActionLoading(false);
    }
  }, [handlePrintTable, setSalaryActionLoading]);

  return {
    handlePrintTable,
    exportMergedPDF,
    startBatchZipExport,
    runPrintTable,
  };
}
