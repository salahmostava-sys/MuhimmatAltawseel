import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { Printer } from 'lucide-react';
import { getSlipTranslations } from '@shared/lib/salarySlipTranslations';
import type { CustomColumn } from '@shared/hooks/useAppColors';
import { statusLabels, statusStyles } from '@modules/salaries/lib/salaryConstants';
import type { SalaryRow } from '@modules/salaries/types/salary.types';
import type React from 'react';
import { buildSalarySlipHTML } from '@modules/salaries/lib/buildSalarySlipHTML';
import { buildSlipFieldsFromRow, buildSlipEmployeeInfo } from '@modules/salaries/lib/buildSalarySlipFields';

interface SalaryDetailDialogProps {
  detailRow: SalaryRow;
  computeRow: (r: SalaryRow) => { totalPlatformSalary: number; totalAdditions: number; totalWithSalary: number; totalDeductions: number; netSalary: number; remaining: number };
  platforms: string[];
  platformColors: Record<string, { header: string; headerText: string; cellBg: string; valueColor: string; focusBorder: string }>;
  appCustomColumns: Record<string, CustomColumn[]>;
  detailOrders: { appName: string; orders: number; salary: number }[];
  selectedMonth: string;
  monthLabel: string;
  setDetailRow: React.Dispatch<React.SetStateAction<SalaryRow | null>>;
  setPayslipRow: React.Dispatch<React.SetStateAction<SalaryRow | null>>;
}

export function SalaryDetailDialog(props: Readonly<SalaryDetailDialogProps>) {
  const {
    detailRow,
    computeRow,
    platforms,
    platformColors,
    appCustomColumns,
    detailOrders,
    monthLabel,
    setDetailRow,
    setPayslipRow,
  } = props;

  const c = computeRow(detailRow);
  const allCustomCols: { appName: string; key: string; label: string; fullKey: string }[] = [];
  platforms.forEach(p => {
    (appCustomColumns[p] || []).forEach(col => {
      allCustomCols.push({ appName: p, key: col.key, label: col.label, fullKey: `${p}___${col.key}` });
    });
  });

  return (
    <Dialog open onOpenChange={() => setDetailRow(null)}>
      <DialogContent dir="rtl" className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
              {detailRow.employeeName.slice(0, 1)}
            </div>
            {detailRow.employeeName}
            <span className={`${statusStyles[detailRow.status]} text-xs`}>{statusLabels[detailRow.status]}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="bg-muted/40 rounded-xl p-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <div><span className="text-muted-foreground">المسمى الوظيفي: </span><span className="font-semibold">{detailRow.jobTitle || '—'}</span></div>
            <div><span className="text-muted-foreground">رقم الهوية: </span><span className="font-semibold" dir="ltr">{detailRow.nationalId || '—'}</span></div>
            <div><span className="text-muted-foreground">المدينة: </span><span className="font-semibold">{detailRow.city || '—'}</span></div>
            <div><span className="text-muted-foreground">الشهر: </span><span className="font-semibold">{monthLabel}</span></div>
            <div><span className="text-muted-foreground">طريقة الصرف: </span><span className="font-semibold">{detailRow.paymentMethod === 'bank' ? '🏦 بنكي' : '💵 كاش'}</span></div>
            {detailRow.phone && <div><span className="text-muted-foreground">الهاتف: </span><span className="font-semibold" dir="ltr">{detailRow.phone}</span></div>}
          </div>

          <div className="rounded-xl border border-success/20 bg-success/5 overflow-hidden">
            <div className="px-3 py-2 bg-success/10 border-b border-success/20">
              <p className="font-bold text-xs text-success uppercase tracking-wide">✅ الطلبات والاستحقاقات</p>
            </div>
            <div className="divide-y divide-border/30">
              {platforms.map(p => {
                const orders = detailRow.platformOrders[p] || 0;
                const salary = detailRow.platformSalaries[p] || 0;
                if (orders === 0 && salary === 0) return null;
                const pc = platformColors[p];
                return (
                  <div key={p} className="flex justify-between items-center px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pc?.header || 'hsl(var(--primary))' }} />
                      <div>
                        <span className="font-medium text-xs text-foreground">{p}</span>
                        <span className="text-[10px] text-muted-foreground mr-1.5">{orders.toLocaleString()} طلب</span>
                      </div>
                    </div>
                    <span className="font-semibold text-xs" style={{ color: pc?.header || 'hsl(var(--primary))' }}>{salary.toLocaleString()} ر.س</span>
                  </div>
                );
              })}
              {detailOrders.length === 0 && platforms.every(p => !detailRow.platformOrders[p]) && (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">لا توجد طلبات مسجّلة لهذا الشهر</div>
              )}
              {detailRow.incentives > 0 && (
                <div className="flex justify-between items-center px-3 py-2.5">
                  <span className="text-xs text-foreground">حوافز</span>
                  <span className="text-xs font-semibold text-success">+{detailRow.incentives.toLocaleString()} ر.س</span>
                </div>
              )}
              {detailRow.sickAllowance > 0 && (
                <div className="flex justify-between items-center px-3 py-2.5">
                  <span className="text-xs text-foreground">بدل مرضي</span>
                  <span className="text-xs font-semibold text-success">+{detailRow.sickAllowance.toLocaleString()} ر.س</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center px-3 py-2.5 bg-success/15 font-bold">
              <span className="text-xs text-success">إجمالي الاستحقاقات</span>
              <span className="text-sm text-success">{c.totalWithSalary.toLocaleString()} ر.س</span>
            </div>
          </div>

          <div className="rounded-xl border border-destructive/20 bg-destructive/5 overflow-hidden">
            <div className="px-3 py-2 bg-destructive/10 border-b border-destructive/20">
              <p className="font-bold text-xs text-destructive uppercase tracking-wide">🔻 الاستقطاعات</p>
            </div>
            <div className="divide-y divide-border/30">
              <div className="flex justify-between items-center px-3 py-2.5">
                <span className="text-xs text-foreground">قسط سلفة</span>
                <span className={`text-xs font-semibold ${detailRow.advanceDeduction > 0 ? 'text-destructive' : 'text-muted-foreground/40'}`}>
                  {detailRow.advanceDeduction > 0 ? `-${detailRow.advanceDeduction.toLocaleString()} ر.س` : '—'}
                </span>
              </div>
              {detailRow.advanceRemaining > 0 && (
                <div className="flex justify-between items-center px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">رصيد السلفة المتبقي</span>
                  <span className="text-xs font-semibold text-warning">{detailRow.advanceRemaining.toLocaleString()} ر.س</span>
                </div>
              )}
              <div className="flex justify-between items-center px-3 py-2.5">
                <span className="text-xs text-foreground">خصومات خارجية</span>
                <span className={`text-xs font-semibold ${detailRow.externalDeduction > 0 ? 'text-destructive' : 'text-muted-foreground/40'}`}>
                  {detailRow.externalDeduction > 0 ? `-${detailRow.externalDeduction.toLocaleString()} ر.س` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center px-3 py-2.5">
                <span className="text-xs text-foreground">مخالفات</span>
                <span className={`text-xs font-semibold ${detailRow.violations > 0 ? 'text-destructive' : 'text-muted-foreground/40'}`}>
                  {detailRow.violations > 0 ? `-${detailRow.violations.toLocaleString()} ر.س` : '—'}
                </span>
              </div>
              {allCustomCols.map(col => {
                const v = detailRow.customDeductions?.[col.fullKey] || 0;
                return (
                  <div key={col.fullKey} className="flex justify-between items-center px-3 py-2.5">
                    <span className="text-xs text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: platformColors[col.appName]?.header || 'hsl(var(--muted-foreground))' }} />
                      {col.label}
                      <span className="text-[9px] text-muted-foreground">({col.appName})</span>
                    </span>
                    <span className={`text-xs font-semibold ${v > 0 ? 'text-destructive' : 'text-muted-foreground/40'}`}>
                      {v > 0 ? `-${v.toLocaleString()} ر.س` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center px-3 py-2.5 bg-destructive/15 font-bold">
              <span className="text-xs text-destructive">إجمالي الاستقطاعات</span>
              <span className="text-sm text-destructive">-{c.totalDeductions.toLocaleString()} ر.س</span>
            </div>
          </div>

          <div className="flex justify-between items-center py-3.5 bg-primary text-primary-foreground rounded-xl px-5">
            <span className="font-bold text-sm">صافي الراتب</span>
            <span className="text-xl font-black">{c.netSalary.toLocaleString()} ر.س</span>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={() => setDetailRow(null)}>إغلاق</Button>
            <Button size="sm" className="gap-1.5" onClick={() => { setPayslipRow(detailRow); setDetailRow(null); }}>
              <Printer size={13} /> كشف الراتب
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BatchSlipRendererProps {
  batchQueue: SalaryRow[];
  batchIndex: number;
  batchMonth: string;
  projectName: string;
}

/**
 * BatchSlipRenderer — No longer renders a hidden div for html2canvas capture.
 * Instead, it exposes a method to get the HTML string for each slip.
 * The parent (SalariesPage) uses buildBatchSlipHTML() directly in its export effect.
 */
export function BatchSlipRenderer(_props: Readonly<BatchSlipRendererProps>) {
  // This component is now a no-op — batch HTML generation is done inline
  // in the SalariesPage batch export effect via buildBatchSlipHTML().
  return null;
}

/**
 * Build a standalone HTML string for a single salary slip in batch mode.
 * Used by SalariesPage batch ZIP export.
 */
export function buildBatchSlipHTML(row: SalaryRow, batchMonth: string, projectName: string): string {
  const t = getSlipTranslations(row.preferredLanguage);

  const platformRows = row.registeredApps
    .filter(app => (row.platformOrders[app] || 0) > 0)
    .map(app => ({
      name: app,
      orders: row.platformOrders[app] || 0,
      salary: row.platformSalaries[app] || 0,
    }));

  const totalPlatformSalary = platformRows.reduce((s, r) => s + r.salary, 0);
  const totalEarnings = totalPlatformSalary + row.incentives + row.sickAllowance;
  const allDeductionVals = [
    row.advanceDeduction,
    row.externalDeduction,
    row.violations,
    ...Object.values(row.customDeductions || {}),
  ];
  const totalDeductions = allDeductionVals.reduce((s, d) => s + d, 0);
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
  const monthField = fields.find(f => f.key === 'month');
  if (monthField) monthField.value = batchMonth;

  const employeeInfo = buildSlipEmployeeInfo(row, batchMonth, projectName);

  return buildSalarySlipHTML({
    employee: employeeInfo,
    fields,
    platforms: platformRows,
    projectName,
  });
}
