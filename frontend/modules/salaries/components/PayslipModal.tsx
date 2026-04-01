import { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle, Printer, Download, Globe, Loader2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { getSlipTranslations, LANGUAGE_META } from '@shared/lib/salarySlipTranslations';
import { logError } from '@shared/lib/logger';
import { months } from '@modules/salaries/lib/salaryMonths';
import { buildSalarySlipHTML } from '@modules/salaries/lib/buildSalarySlipHTML';
import { buildSlipFieldsFromRow, buildSlipPlatformRows, buildSlipEmployeeInfo } from '@modules/salaries/lib/buildSalarySlipFields';
import { previewSlipInIframe, printSlipHTML, exportSlipPDF } from '@modules/salaries/lib/salarySlipActions';
import { aiService, type SalaryAnalysisResponse } from '@services/aiService';
import { salarySlipTemplateService, type SalarySlipTemplate } from '@services/salarySlipTemplateService';
import { toast } from '@shared/components/ui/sonner';
import type { SalaryRow } from '@modules/salaries/types/salary.types';

export type PayslipModalProps = Readonly<{
  row: SalaryRow;
  onClose: () => void;
  onApprove: () => void;
  selectedMonth: string;
  companyName?: string;
}>;

export function PayslipModal({ row, onClose, onApprove, selectedMonth, companyName }: PayslipModalProps) {
  const t = getSlipTranslations(row.preferredLanguage);
  const meta = LANGUAGE_META[row.preferredLanguage];
  const dir = meta.dir;
  const previewRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [template, setTemplate] = useState<SalarySlipTemplate | null>(null);
  const [analysis, setAnalysis] = useState<SalaryAnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const monthLabel = months.find((m) => m.v === selectedMonth)?.l || selectedMonth;

  // Build dynamic fields from row data
  const platforms = buildSlipPlatformRows(row);
  const totalPlatformSalary = platforms.reduce((s, r) => s + r.salary, 0);
  const totalEarnings = totalPlatformSalary + row.incentives + row.sickAllowance;
  const allDeductions = [
    row.advanceDeduction,
    row.externalDeduction,
    row.violations,
    ...Object.values(row.customDeductions || {}),
  ];
  const totalDeductions = allDeductions.reduce((s, d) => s + d, 0);
  const netSalary = totalEarnings - totalDeductions;
  const remaining = netSalary - row.transfer;

  const computed = {
    totalPlatformSalary,
    totalAdditions: row.incentives + row.sickAllowance,
    totalWithSalary: totalEarnings,
    totalDeductions,
    netSalary,
    remaining,
  };

  const fields = buildSlipFieldsFromRow(row, computed, t);
  // Fill in the month label for the info field
  const monthField = fields.find(f => f.key === 'month');
  if (monthField) monthField.value = monthLabel;

  const employeeInfo = buildSlipEmployeeInfo(row, monthLabel, companyName);

  useEffect(() => {
    // Load default template
    salarySlipTemplateService.getDefault().then(setTemplate).catch(() => {});

    // AI Analysis call
    const totalOrders = platforms.reduce((s, p) => s + p.orders, 0);
    const totalBonus = row.incentives + row.sickAllowance;
    
    setAnalysisLoading(true);
    aiService.analyzeSalary(row.engineBaseSalary || 0, totalOrders, totalBonus)
      .then(res => {
        setAnalysis(res);
        if (res.risk === 'underpaid') {
          toast.warning('تنبيه المحلل الذكي: ملاحظة انخفاض في المستحقات الحالية مقارنة بالأداء', {
            description: `الراتب المتوقع بناءً على المعايير: ${res.expected_salary} ر.س`,
            duration: 6000,
          });
        }
      })
      .catch(e => logError('[Salaries] AI Analysis failed', e))
      .finally(() => setAnalysisLoading(false));
  }, [row.id, platforms, row.engineBaseSalary, row.incentives, row.sickAllowance]);

  const slipHTML = buildSalarySlipHTML({
    employee: employeeInfo,
    fields,
    platforms,
    projectName: companyName,
    template: template || undefined,
    analysis: analysis || undefined,
  });

  // Render preview in iframe
  useEffect(() => {
    if (previewRef.current) {
      previewSlipInIframe(previewRef.current, slipHTML);
    }
  }, [slipHTML]);

  const handlePrint = useCallback(() => {
    printSlipHTML(slipHTML);
  }, [slipHTML]);

  const handleExportPDF = useCallback(() => {
    setExporting(true);
    try {
      exportSlipPDF(slipHTML, `salary-slip-${row.employeeName}-${selectedMonth}.pdf`);
    } catch (e) {
      logError('[Salaries] PDF export failed', e, { level: 'warn' });
    } finally {
      // Slight delay since the print dialog may still be opening
      setTimeout(() => setExporting(false), 1000);
    }
  }, [slipHTML, row.employeeName, selectedMonth]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent dir={dir} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {t.title} — <span className="text-foreground">{row.employeeName}</span>
            <span className="text-sm font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
              <Globe size={12} /> {meta.flag} {meta.label}
            </span>
            {analysisLoading && <Loader2 className="animate-spin text-muted-foreground ml-2" size={14} />}
            {analysis?.risk === 'underpaid' && (
              <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse">
                تحليل AI: مخاوف من انخفاض الراتب
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Dynamic HTML Preview via iframe */}
        <div
          ref={previewRef}
          className="rounded-md border border-border overflow-hidden bg-white"
          style={{ minHeight: 500 }}
        />

        <div className="flex gap-2 justify-between pt-2">
          <Button variant="outline" onClick={onClose}>{t.close}</Button>
          <div className="flex gap-2">
            {row.status === 'pending' && (
              <Button variant="default" className="gap-2" onClick={onApprove}>
                <CheckCircle size={14} /> {t.approve}
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer size={14} /> طباعة
            </Button>
            <Button onClick={handleExportPDF} disabled={exporting} className="gap-2">
              <Download size={14} /> {exporting ? '...' : t.printPdf}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
