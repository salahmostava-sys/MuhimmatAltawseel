import { useEffect, useRef } from 'react';
import { loadJsPdf } from '@modules/salaries/lib/salaryPdfLoaders';
import { months } from '@modules/salaries/lib/salaryMonths';
import type { SalaryRow } from '@modules/salaries/types/salary.types';
import type JSZip from 'jszip';

/**
 * Manages sequential batch PDF generation for salary slips.
 * Generates one PDF per row via iframe + jsPDF, adds to ZIP, then downloads.
 */
export function useBatchPdfExport(params: {
  batchQueue: SalaryRow[];
  batchIndex: number;
  batchZip: JSZip | null;
  selectedMonth: string;
  projectName: string;
  setBatchQueue: React.Dispatch<React.SetStateAction<SalaryRow[]>>;
  setBatchIndex: React.Dispatch<React.SetStateAction<number>>;
  setBatchZip: React.Dispatch<React.SetStateAction<JSZip | null>>;
  toast: (opts: { title: string }) => unknown;
}) {
  const {
    batchQueue, batchIndex, batchZip, selectedMonth, projectName,
    setBatchQueue, setBatchIndex, setBatchZip, toast,
  } = params;
  const batchAbortRef = useRef(false);

  useEffect(() => {
    batchAbortRef.current = false;

    if (batchQueue.length === 0 || !batchZip) return;

    // All done — generate and download ZIP
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

    // Process one slip at a time
    const timer = setTimeout(async () => {
      if (batchAbortRef.current) return;
      try {
        const row = batchQueue[batchIndex];
        const { buildBatchSlipHTML } = await import('@modules/salaries/lib/buildBatchSlipHTML');
        const monthLabel = months.find(m => m.v === selectedMonth)?.l || selectedMonth;
        const html = buildBatchSlipHTML(row, monthLabel, projectName);

        const JsPdf = await loadJsPdf();
        const pdf = new JsPdf({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:794px;height:1123px;border:none';
        document.body.appendChild(iframe);
        const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iDoc) {
          iDoc.open();
          iDoc.write(html);
          iDoc.close();
        }

        await new Promise(resolve => setTimeout(resolve, 200));
        if (batchAbortRef.current) {
          try { document.body.removeChild(iframe); } catch { /* ignore */ }
          return;
        }

        const container = iDoc?.querySelector('.slip-container') as HTMLElement | null;
        if (container) {
          await pdf.html(container, { x: 5, y: 5, width: 190, windowWidth: 700 });
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
  }, [batchIndex, batchQueue, batchZip, selectedMonth, toast, projectName, setBatchQueue, setBatchIndex, setBatchZip]);
}
