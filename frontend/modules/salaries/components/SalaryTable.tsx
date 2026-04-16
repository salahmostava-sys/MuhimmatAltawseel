/**
 * SalaryTable — Virtualized salary table.
 *
 * Uses @tanstack/react-virtual to render only visible rows (~15-20 at a time),
 * instead of all rows at once. This reduces DOM nodes from 1200+ to ~150-200.
 *
 * ── What stays the same ──────────────────────────────────────────────────────
 * - Sticky columns (رقم, اسم, مسمى, هوية) — implemented via CSS position:sticky
 * - Totals footer row — rendered outside the virtual list, always visible
 * - All cell editing, approve, mark-paid, payslip actions
 * - PDF/print export — reads from `filtered` array directly (not DOM)
 * - Sorting, filtering — unchanged (handled by parent)
 *
 * ── What changes ─────────────────────────────────────────────────────────────
 * - tbody uses a fixed total height with absolutely positioned rows
 * - Only rows within the scroll viewport are in the DOM
 * - Ctrl+F browser search won't find off-screen rows (acceptable trade-off)
 */
import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@shared/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@shared/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { CheckCircle, Printer, AlertTriangle, Loader2 } from 'lucide-react';
import type { CustomColumn } from '@shared/hooks/useAppColors';
import { SalarySortIcon } from '@modules/salaries/components/SalarySortIcon';
import {
  EditableCell,
  PlatformOrderCell,
  CustomDeductionCell,
} from '@modules/salaries/components/SalaryTableCells';
import { OrderDetailsModal } from '@modules/salaries/components/OrderDetailsModal';
import { shortEmployeeName } from '@modules/salaries/lib/salaryConstants';
import type { SalaryRow, SchemeData, SortDir } from '@modules/salaries/types/salary.types';
import { getSalaryRowActivityTotals, hasPlatformActivity } from '@modules/salaries/model/salaryUtils';

// ── Style constants ───────────────────────────────────────────────────────────
const thFrozenBase = "px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap border border-border/40 bg-muted/60 text-right sticky z-20";
const thBase = "px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap border border-border/40 bg-muted/50 text-center";
const tdClass = "px-3 py-2 text-xs whitespace-nowrap text-center border border-border/40 text-foreground";
const tfClass = "px-3 py-2 text-xs font-bold whitespace-nowrap text-center border border-border/40 bg-muted/60 text-foreground";
const stickyLeft = (offset: number) => ({ left: offset });

/** Height of each row in pixels — must be fixed for virtual list to work correctly */
const ROW_HEIGHT = 48;

// ── Props ─────────────────────────────────────────────────────────────────────
interface SalaryTableProps {
  loadingData: boolean;
  rows: SalaryRow[];
  filtered: SalaryRow[];
  computeRow: (r: SalaryRow) => { totalPlatformSalary: number; totalAdditions: number; totalWithSalary: number; totalDeductions: number; netSalary: number; remaining: number };
  platforms: string[];
  platformColors: Record<string, { header: string; headerText: string; cellBg: string; valueColor: string; focusBorder: string }>;
  appCustomColumns: Record<string, CustomColumn[]>;
  empPlatformScheme: Record<string, Record<string, SchemeData | null>>;
  sortField: string | null;
  sortDir: SortDir;
  handleSort: (field: string) => void;
  updateRow: (id: string, patch: Partial<SalaryRow>) => void;
  updatePlatformOrders: (id: string, platform: string, value: number) => void;
  approveRow: (id: string) => void;
  approvingRowId: string | null;
  markAsPaid: (row: SalaryRow) => void;
  markingPaid: string | null;
  editingCell: { rowId: string; platform: string } | null;
  setEditingCell: React.Dispatch<React.SetStateAction<{ rowId: string; platform: string } | null>>;
  setPayslipRow: React.Dispatch<React.SetStateAction<SalaryRow | null>>;
  persistEmployeeCity: (row: SalaryRow, nextCity: 'makkah' | 'jeddah') => void;
  persistEmployeePaymentMethod: (row: SalaryRow, next: 'bank' | 'cash') => void;
  employeeFieldSaving: string | null;
  openEmployeeDetail: (row: SalaryRow) => void;
}

// ── Row renderer — extracted to keep the main component readable ──────────────
function SalaryRowCells({
  r,
  rowIdx,
  c,
  platforms,
  platformColors,
  appCustomColumns,
  allCustomCols,
  empPlatformScheme,
  editingCell,
  setEditingCell,
  updateRow,
  updatePlatformOrders,
  approveRow,
  approvingRowId,
  markAsPaid,
  markingPaid,
  setPayslipRow,
  persistEmployeeCity,
  persistEmployeePaymentMethod,
  employeeFieldSaving,
  openEmployeeDetail,
}: {
  r: SalaryRow;
  rowIdx: number;
  c: ReturnType<SalaryTableProps['computeRow']>;
  platforms: string[];
  platformColors: SalaryTableProps['platformColors'];
  appCustomColumns: SalaryTableProps['appCustomColumns'];
  allCustomCols: { appName: string; key: string; label: string; fullKey: string }[];
  empPlatformScheme: SalaryTableProps['empPlatformScheme'];
  editingCell: SalaryTableProps['editingCell'];
  setEditingCell: SalaryTableProps['setEditingCell'];
  updateRow: SalaryTableProps['updateRow'];
  updatePlatformOrders: SalaryTableProps['updatePlatformOrders'];
  approveRow: SalaryTableProps['approveRow'];
  approvingRowId: SalaryTableProps['approvingRowId'];
  markAsPaid: SalaryTableProps['markAsPaid'];
  markingPaid: SalaryTableProps['markingPaid'];
  setPayslipRow: SalaryTableProps['setPayslipRow'];
  persistEmployeeCity: SalaryTableProps['persistEmployeeCity'];
  persistEmployeePaymentMethod: SalaryTableProps['persistEmployeePaymentMethod'];
  employeeFieldSaving: SalaryTableProps['employeeFieldSaving'];
  openEmployeeDetail: SalaryTableProps['openEmployeeDetail'];
}) {
  const canEditManualBaseSalary = !Object.values(r.platformMetrics || {}).some((metric) => hasPlatformActivity(metric));
  const needsApproval = r.status === 'pending' || !!r.isDirty;

  return (
    <>
      <td className={`${tdClass} sticky text-center text-xs text-muted-foreground font-mono`} style={{ left: 0, zIndex: 10, background: 'hsl(var(--card))' }}>{rowIdx + 1}</td>
      <td className={`${tdClass} sticky font-medium whitespace-nowrap`} style={{ left: 40, zIndex: 10, background: 'hsl(var(--card))' }}>
        <div className="flex items-center gap-1.5">
          <button className="whitespace-nowrap text-primary hover:underline font-medium text-right" onClick={() => openEmployeeDetail(r)}>
            {shortEmployeeName(r.employeeName)}
          </button>
          {r.isDirty && (
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-warning/20 text-warning border border-warning/40 cursor-help">
                    <AlertTriangle size={11} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">يحتاج إعادة الاعتماد</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </td>
      <td className={`${tdClass} whitespace-nowrap`} style={{ position: 'sticky', left: 168, zIndex: 10, background: 'hsl(var(--card))' }}>{r.jobTitle}</td>
      <td className={`${tdClass} border-l border-border/40 text-muted-foreground text-xs whitespace-nowrap`} style={{ position: 'sticky', left: 264, zIndex: 10, background: 'hsl(var(--card))' }}>{r.nationalId}</td>
      <td className="px-2 py-2 text-xs text-center border border-border/40 bg-info/5 whitespace-nowrap">
        <EditableCell value={r.platformIncome} onChange={v => updateRow(r.id, { platformIncome: v })} className="text-foreground" />
      </td>
      <td className="px-2 py-2 text-xs text-center border border-border/40 bg-info/5 whitespace-nowrap">
        {r.workDays > 0 ? <span className="font-semibold text-foreground">{r.workDays}</span> : <span className="text-muted-foreground/30">—</span>}
      </td>
      <td className="px-2 py-2 text-xs text-center border border-border/40 bg-info/5 whitespace-nowrap">
        {r.fuelCost > 0 ? <span className="font-semibold text-foreground">{r.fuelCost.toLocaleString()}</span> : <span className="text-muted-foreground/30">—</span>}
      </td>
      {platforms.map(p => {
        const pc = platformColors[p];
        const salary = r.platformSalaries[p] || 0;
        const scheme = empPlatformScheme?.[r.employeeId]?.[p];
        return (
          <PlatformOrderCell
            key={`${p}-col`}
            rowId={r.id}
            platformName={p}
            tdClass={tdClass}
            pc={pc}
            metric={r.platformMetrics[p]}
            salary={salary}
            scheme={scheme}
            editingCell={editingCell}
            setEditingCell={setEditingCell}
            updatePlatformOrders={updatePlatformOrders}
          />
        );
      })}
      <td className={`${tdClass} text-center font-bold text-foreground border-l border-border/20 bg-primary/[0.04]`}>
        {(() => {
          const totalOrders = Object.values(r.platformOrders).reduce((s, v) => s + v, 0);
          const totalSalary = Object.values(r.platformSalaries).reduce((s, v) => s + v, 0);
          return totalOrders > 0 || totalSalary > 0
            ? <OrderDetailsModal row={r} empPlatformScheme={empPlatformScheme} />
            : <span className="text-muted-foreground/30">—</span>;
        })()}
      </td>
      <td className={`${tdClass} font-bold text-foreground border-l border-border/20 bg-primary/[0.06]`}>
        {canEditManualBaseSalary
          ? <EditableCell value={Number(r.engineBaseSalary || 0)} onChange={(value) => updateRow(r.id, { engineBaseSalary: value })} className="text-foreground" />
          : c.totalPlatformSalary.toLocaleString()}
      </td>
      <td className={`${tdClass} bg-success/[0.04] border-l border-border/40`}><EditableCell value={r.incentives} onChange={v => updateRow(r.id, { incentives: v })} className="text-foreground" /></td>
      <td className={`${tdClass} bg-success/[0.04]`}><EditableCell value={r.sickAllowance} onChange={v => updateRow(r.id, { sickAllowance: v })} className="text-foreground" /></td>
      <td className={`${tdClass} text-foreground font-semibold bg-success/[0.04]`}>{c.totalAdditions.toLocaleString()}</td>
      <td className={`${tdClass} font-bold text-foreground border-l border-border/40 bg-success/[0.06]`}>{c.totalWithSalary.toLocaleString()}</td>
      <td className={`${tdClass} border-l border-border/40 bg-destructive/[0.04]`}>
        <EditableCell value={r.advanceDeduction} onChange={v => updateRow(r.id, { advanceDeduction: v })} className="text-foreground" />
      </td>
      <td className={tdClass}><EditableCell value={r.violations} onChange={v => updateRow(r.id, { violations: v })} className="text-foreground" /></td>
      {allCustomCols.map(col => (
        <CustomDeductionCell key={col.fullKey} row={r} fullKey={col.fullKey} tdClass={tdClass} updateRow={updateRow} />
      ))}
      <td className={`${tdClass} font-bold text-foreground border-l border-border/20 bg-destructive/[0.06]`}>
        {c.totalDeductions > 0 ? c.totalDeductions.toLocaleString() : <span className="text-muted-foreground/30">—</span>}
      </td>
      <td className={`${tdClass} font-black text-foreground text-base ${c.netSalary < 0 ? 'text-destructive' : ''}`}>{c.netSalary.toLocaleString()}</td>
      <td className={tdClass}>
        <EditableCell value={r.transfer} onChange={v => updateRow(r.id, { transfer: Math.max(0, Math.min(v, Math.max(0, c.netSalary))) })} />
      </td>
      <td className={`${tdClass} border-l border-border/20`}>{c.remaining.toLocaleString()}</td>
      <td className={`${tdClass} text-center align-middle`}>
        <Select
          value={r.cityKey ?? '_none'}
          onValueChange={(v) => { if (v !== '_none') void persistEmployeeCity(r, v as 'makkah' | 'jeddah'); }}
          disabled={employeeFieldSaving === `${r.employeeId}:city`}
        >
          <SelectTrigger className="h-8 w-[104px] text-xs mx-auto" dir="rtl">
            {employeeFieldSaving === `${r.employeeId}:city`
              ? <span className="flex w-full justify-center"><Loader2 className="h-4 w-4 animate-spin" /></span>
              : <SelectValue placeholder="الفرع" />}
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="_none" className="text-muted-foreground">—</SelectItem>
            <SelectItem value="makkah">مكة</SelectItem>
            <SelectItem value="jeddah">جدة</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className={`${tdClass} border-l border-border/40 text-center align-middle`}>
        <Select
          value={r.paymentMethod}
          onValueChange={(v) => void persistEmployeePaymentMethod(r, v as 'bank' | 'cash')}
          disabled={employeeFieldSaving === `${r.employeeId}:payment`}
        >
          <SelectTrigger className="h-8 w-[100px] text-xs mx-auto" dir="rtl">
            {employeeFieldSaving === `${r.employeeId}:payment`
              ? <span className="flex w-full justify-center"><Loader2 className="h-4 w-4 animate-spin" /></span>
              : <SelectValue />}
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="cash">💵 كاش</SelectItem>
            <SelectItem value="bank">🏦 بنك</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className={`${tdClass} border-l border-border`}>
        <div className="flex items-center justify-center gap-1.5">
          {needsApproval && (
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-success border-success/40 hover:bg-success/10" onClick={() => approveRow(r.id)} disabled={approvingRowId === r.id}>
              {approvingRowId === r.id ? <Loader2 size={11} className="animate-spin" /> : <><CheckCircle size={11} /> اعتماد</>}
            </Button>
          )}
          {r.status === 'approved' && !r.isDirty && (
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-primary border-primary/40 hover:bg-primary/10" onClick={() => void markAsPaid(r)} disabled={markingPaid === r.id}>
              {markingPaid === r.id ? <Loader2 size={11} className="animate-spin" /> : <>✅ تم الصرف</>}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => setPayslipRow(r)}>
            <Printer size={11} /> كشف
          </Button>
        </div>
      </td>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function SalaryTable(props: Readonly<SalaryTableProps>) {
  const {
    loadingData, rows, filtered, computeRow, platforms, platformColors,
    appCustomColumns, empPlatformScheme, sortField, sortDir, handleSort,
    updateRow, updatePlatformOrders, approveRow, approvingRowId,
    markAsPaid, markingPaid, editingCell, setEditingCell, setPayslipRow,
    persistEmployeeCity, persistEmployeePaymentMethod, employeeFieldSaving,
    openEmployeeDetail,
  } = props;

  // ── Scroll container ref — required by useVirtualizer ─────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Custom columns ────────────────────────────────────────────────────────
  const allCustomCols = useMemo(() => {
    const cols: { appName: string; key: string; label: string; fullKey: string }[] = [];
    platforms.forEach(p => {
      (appCustomColumns[p] || []).forEach(col => {
        cols.push({ appName: p, key: col.key, label: col.label, fullKey: `${p}___${col.key}` });
      });
    });
    return cols;
  }, [platforms, appCustomColumns]);

  const dedColCount = 2 + allCustomCols.length + 1;

  // ── Totals (computed from all filtered rows, not just visible ones) ────────
  const totals = useMemo(() => filtered.reduce((acc, r) => {
    const c = computeRow(r);
    const activityTotals = getSalaryRowActivityTotals(r);
    platforms.forEach(p => {
      acc.platformOrders[p] = (acc.platformOrders[p] || 0) + (r.platformMetrics[p]?.ordersCount || 0);
      acc.platformShiftDays[p] = (acc.platformShiftDays[p] || 0) + (r.platformMetrics[p]?.shiftDays || 0);
    });
    acc.totalOrders += activityTotals.orders;
    acc.totalShiftDays += activityTotals.shiftDays;
    acc.platformSalaries += c.totalPlatformSalary;
    acc.incentives += r.incentives;
    acc.sickAllowance += r.sickAllowance;
    acc.totalAdditions += c.totalAdditions;
    acc.totalWithSalary += c.totalWithSalary;
    acc.advance += r.advanceDeduction;
    acc.externalDed += r.externalDeduction;
    acc.violations += r.violations;
    acc.totalDed += c.totalDeductions;
    acc.net += c.netSalary;
    acc.transfer += r.transfer;
    acc.remaining += c.remaining;
    return acc;
  }, {
    platformOrders: {} as Record<string, number>,
    platformShiftDays: {} as Record<string, number>,
    totalOrders: 0, totalShiftDays: 0,
    platformSalaries: 0, incentives: 0, sickAllowance: 0,
    totalAdditions: 0, totalWithSalary: 0,
    advance: 0, externalDed: 0, violations: 0,
    totalDed: 0, net: 0, transfer: 0, remaining: 0,
  }), [filtered, computeRow, platforms]);

  // ── Virtual rows — only renders rows visible in the scroll container ───────
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8, // render 8 extra rows above/below viewport for smooth scrolling
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalVirtualHeight = rowVirtualizer.getTotalSize();

  // ── Empty / loading states ────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div className="rounded-xl shadow-card bg-card h-48 flex items-center justify-center text-muted-foreground">
        جارٍ تحميل بيانات الرواتب...
      </div>
    );
  }

  if (!loadingData && rows.length === 0) {
    return (
      <div className="rounded-xl shadow-card bg-card h-48 flex items-center justify-center text-muted-foreground">
        لا يوجد موظفون نشطون أو بيانات لهذا الشهر
      </div>
    );
  }

  return (
    <div className="rounded-xl shadow-card bg-card overflow-hidden">
      {/* Scroll container — useVirtualizer reads its scrollTop */}
      <div ref={scrollContainerRef} className="overflow-auto" style={{ maxHeight: '75vh' }}>
        <table className="text-sm border-collapse" style={{ minWidth: 1800 }}>
          {/* ── Header — sticky at top, always visible ── */}
          <thead className="sticky top-0 z-30">
            <tr className="bg-muted/70 border-b border-border/50">
              <th className={`${thFrozenBase} w-10 text-center`} style={stickyLeft(0)}>#</th>
              <th colSpan={3} className={`${thFrozenBase} border-l border-border/50`} style={stickyLeft(40)}>بيانات المندوب</th>
              <th colSpan={3} className="px-3 py-2 text-xs font-semibold text-info whitespace-nowrap border-b border-border/40 bg-info/10 text-center border-l border-border/40">📊 بيانات المندوب الشهرية</th>
              {platforms.length > 0 && (
                <th colSpan={platforms.length} className="px-3 py-2 text-xs font-semibold text-primary whitespace-nowrap border-b border-border/50 bg-muted/40 text-center border-l border-border/50">
                  المنصات (طلبات أو دوام / راتب، ونقر مزدوج لتعديل الطلبات في منصات الطلب فقط)
                </th>
              )}
              <th colSpan={2} className="px-3 py-2 text-xs font-semibold text-primary whitespace-nowrap border-b border-border/40 bg-primary/10 text-center border-l border-border/40">إجمالي النشاط + الراتب الأساسي</th>
              <th colSpan={4} className="px-3 py-2 text-xs font-semibold text-success whitespace-nowrap border-b border-border/40 bg-success/10 text-center border-l border-border/40">✅ الإضافات</th>
              <th colSpan={dedColCount} className="px-3 py-2 text-xs font-semibold text-destructive whitespace-nowrap border-b border-border/40 bg-destructive/10 text-center border-l border-border/40">🔻 المستقطعات</th>
              <th colSpan={1} className="px-3 py-2 text-xs font-semibold text-success whitespace-nowrap border-b border-border/40 bg-muted/40 text-center border-l border-border/40">المستحق</th>
              <th colSpan={2} className="px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap border-b border-border/40 bg-muted/40 text-center border-l border-border/40">معلومات الصرف</th>
              <th colSpan={2} className="px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap border-b border-border/40 bg-muted/40 text-center border-l border-border/40">الفرع وطريقة الصرف</th>
              <th colSpan={1} className="px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap border-b border-border/40 bg-muted/40 text-center border-l border-border/40">الإجراءات</th>
            </tr>
            <tr className="bg-muted/50">
              <th className={`${thFrozenBase} w-10 text-center`} style={stickyLeft(0)}>#</th>
              <th className={`${thFrozenBase} w-32 cursor-pointer hover:text-foreground select-none`} style={stickyLeft(40)} onClick={() => handleSort('employeeName')}>
                الاسم <SalarySortIcon field="employeeName" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className={`${thFrozenBase} w-24 cursor-pointer hover:text-foreground select-none`} style={stickyLeft(168)} onClick={() => handleSort('jobTitle')}>
                المسمى الوظيفي <SalarySortIcon field="jobTitle" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className={`${thFrozenBase} w-28 cursor-pointer hover:text-foreground select-none`} style={stickyLeft(264)} onClick={() => handleSort('nationalId')}>
                رقم الهوية <SalarySortIcon field="nationalId" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-info whitespace-nowrap border border-border/40 bg-info/10 text-center cursor-pointer select-none hover:brightness-95" onClick={() => handleSort('platformIncome')}>
                دخل <SalarySortIcon field="platformIncome" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-info whitespace-nowrap border border-border/40 bg-info/10 text-center cursor-pointer select-none hover:brightness-95" onClick={() => handleSort('workDays')}>
                أيام العمل <SalarySortIcon field="workDays" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-info whitespace-nowrap border border-border/40 bg-info/10 text-center cursor-pointer select-none hover:brightness-95" onClick={() => handleSort('fuelCost')}>
                البنزين <SalarySortIcon field="fuelCost" sortField={sortField} sortDir={sortDir} />
              </th>
              {platforms.map(p => {
                const pc = platformColors[p];
                return (
                  <th key={`${p}-col`}
                    className="px-2 py-2 text-xs font-semibold whitespace-nowrap border-b border-l border-border/30 text-center cursor-pointer select-none hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: pc?.header, color: pc?.headerText }}
                    onClick={() => handleSort(p)}>
                    <div className="flex flex-col items-center gap-0">
                      <span>{p}</span>
                      <span className="text-[9px] opacity-80 font-normal">طلبات/دوام / راتب <SalarySortIcon field={p} sortField={sortField} sortDir={sortDir} /></span>
                    </div>
                  </th>
                );
              })}
              <th className="px-2 py-2 text-xs font-semibold text-foreground whitespace-nowrap border border-border/30 bg-primary/10 text-center cursor-pointer select-none hover:brightness-95" onClick={() => handleSort('totalPlatformOrders')}>
                إجمالي النشاط <SalarySortIcon field="totalPlatformOrders" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className={`${thBase} bg-primary/10`}>الراتب الأساسي</th>
              <th className={`${thBase} bg-success/5`}>حوافز</th>
              <th className={`${thBase} bg-success/5`}>إجازة مرضية</th>
              <th className={`${thBase} bg-success/5`}>إجمالي الإضافات</th>
              <th className={`${thBase} bg-success/10 border-l border-border/40`}>الإجمالي مع الراتب</th>
              <th className={`${thBase} bg-destructive/5`}>سلف</th>
              <th className={`${thBase} bg-destructive/5`}>مخالفات</th>
              {allCustomCols.map(col => (
                <th key={col.fullKey} className={`${thBase} bg-destructive/5`}>{col.label}</th>
              ))}
              <th className={`${thBase} bg-destructive/10 border-l border-border/40`}>إجمالي المستقطعات</th>
              <th className={thBase}>المستحق</th>
              <th className={thBase}>المحوّل</th>
              <th className={`${thBase} border-l border-border/40`}>المتبقي</th>
              <th className={`${thBase} cursor-pointer hover:text-foreground select-none`} onClick={() => handleSort('city')}>
                الفرع <SalarySortIcon field="city" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className={`${thBase} border-l border-border/40 cursor-pointer hover:text-foreground select-none`} onClick={() => handleSort('paymentMethod')}>
                طريقة الصرف <SalarySortIcon field="paymentMethod" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className={`${thBase} border-l border-border/50`}>الإجراءات</th>
            </tr>
          </thead>

          {/* ── Virtualized tbody ── */}
          {/* paddingTop/Bottom technique: rows stay in flow (no absolute positioning),
              so position:sticky on td cells continues to work correctly.
              We push spacer rows at the top and bottom to represent off-screen rows. */}
          <tbody>
            {/* Top spacer: represents rows above the visible window */}
            {virtualRows.length > 0 && virtualRows[0].start > 0 && (
              <tr style={{ height: virtualRows[0].start }} aria-hidden="true">
                <td colSpan={999} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const r = filtered[virtualRow.index];
              const c = computeRow(r);
              if (!c) return null;

              return (
                <tr
                  key={r.id}
                  data-index={virtualRow.index}
                  className="border-b border-border hover:bg-muted/25 transition-colors"
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  <SalaryRowCells
                    r={r}
                    rowIdx={virtualRow.index}
                    c={c}
                    platforms={platforms}
                    platformColors={platformColors}
                    appCustomColumns={appCustomColumns}
                    allCustomCols={allCustomCols}
                    empPlatformScheme={empPlatformScheme}
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    updateRow={updateRow}
                    updatePlatformOrders={updatePlatformOrders}
                    approveRow={approveRow}
                    approvingRowId={approvingRowId}
                    markAsPaid={markAsPaid}
                    markingPaid={markingPaid}
                    setPayslipRow={setPayslipRow}
                    persistEmployeeCity={persistEmployeeCity}
                    persistEmployeePaymentMethod={persistEmployeePaymentMethod}
                    employeeFieldSaving={employeeFieldSaving}
                    openEmployeeDetail={openEmployeeDetail}
                  />
                </tr>
              );
            })}
            {/* Bottom spacer: represents rows below the visible window */}
            {virtualRows.length > 0 && (() => {
              const lastRow = virtualRows[virtualRows.length - 1];
              const bottomPad = totalVirtualHeight - lastRow.end;
              return bottomPad > 0 ? (
                <tr style={{ height: bottomPad }} aria-hidden="true">
                  <td colSpan={999} />
                </tr>
              ) : null;
            })()}
          </tbody>

          {/* ── Totals footer — always rendered, outside virtual list ── */}
          <tfoot className="sticky bottom-0 z-20">
            <tr className="bg-muted/60 border-t-2 border-border">
              <td className={`${tfClass} sticky text-center`} style={{ left: 0, zIndex: 20, background: 'hsl(var(--muted) / 0.6)' }}>—</td>
              <td className={`${tfClass} sticky text-center border-l border-border/30`} style={{ left: 40, zIndex: 20, background: 'hsl(var(--muted) / 0.6)' }}>الإجمالي</td>
              <td className={tfClass} style={{ position: 'sticky', left: 168, zIndex: 20, background: 'hsl(var(--muted) / 0.6)' }}></td>
              <td className={`${tfClass} border-l border-border/30`} style={{ position: 'sticky', left: 264, zIndex: 20, background: 'hsl(var(--muted) / 0.6)' }}></td>
              <td className="px-2 py-2 text-xs font-bold text-center border border-border/40 bg-info/10 text-foreground">
                {filtered.reduce((s, r) => s + r.platformIncome, 0).toLocaleString()}
              </td>
              <td className="px-2 py-2 text-xs font-bold text-center border border-border/40 bg-info/10 text-foreground">
                {Math.round(filtered.reduce((s, r) => s + r.workDays, 0) / Math.max(filtered.length, 1))}
              </td>
              <td className="px-2 py-2 text-xs font-bold text-center border border-border/40 bg-info/10 text-foreground">
                {filtered.reduce((s, r) => s + r.fuelCost, 0).toLocaleString()}
              </td>
              {platforms.map(p => {
                const totalOrders = totals.platformOrders[p] || 0;
                const totalShiftDays = totals.platformShiftDays[p] || 0;
                const totalSal = filtered.reduce((s, r) => s + (r.platformSalaries[p] || 0), 0);
                return (
                  <td key={`${p}-col`} className={`${tfClass} border-l border-border/20 text-foreground`}>
                    <div className="flex flex-col items-center leading-tight">
                      <span>{totalOrders.toLocaleString()} طلب</span>
                      {totalShiftDays > 0 && <span className="text-[10px] opacity-75 font-normal">{totalShiftDays.toLocaleString()} دوام</span>}
                      <span className="text-[10px] opacity-75 font-normal">{totalSal.toLocaleString()} ر.س</span>
                    </div>
                  </td>
                );
              })}
              <td className={`${tfClass} text-center font-bold text-foreground border-l border-border/20`}>
                <div className="flex flex-col items-center leading-tight">
                  <span>{totals.totalOrders.toLocaleString()} طلب</span>
                  {totals.totalShiftDays > 0 && <span className="text-[10px] opacity-75 font-normal">{totals.totalShiftDays.toLocaleString()} دوام</span>}
                </div>
              </td>
              <td className={`${tfClass} text-foreground border-l border-border/30`}>{totals.platformSalaries.toLocaleString()}</td>
              <td className={`${tfClass} text-foreground`}>{totals.incentives.toLocaleString()}</td>
              <td className={`${tfClass} text-foreground`}>{totals.sickAllowance.toLocaleString()}</td>
              <td className={`${tfClass} text-foreground`}>{totals.totalAdditions.toLocaleString()}</td>
              <td className={`${tfClass} text-foreground border-l border-border/30`}>{totals.totalWithSalary.toLocaleString()}</td>
              <td className={`${tfClass} text-foreground`}>{totals.advance.toLocaleString()}</td>
              <td className={`${tfClass} text-foreground`}>{totals.violations.toLocaleString()}</td>
              {allCustomCols.map(col => {
                const colTotal = filtered.reduce((s, r) => s + (r.customDeductions?.[col.fullKey] || 0), 0);
                return <td key={col.fullKey} className={`${tfClass} text-foreground`}>{colTotal > 0 ? colTotal.toLocaleString() : '—'}</td>;
              })}
              <td className={`${tfClass} text-foreground border-l border-border/30`}>{totals.totalDed.toLocaleString()}</td>
              <td className={`${tfClass} text-foreground text-base ${totals.net < 0 ? 'text-destructive' : ''}`}>{totals.net.toLocaleString()}</td>
              <td className={tfClass}>{totals.transfer.toLocaleString()}</td>
              <td className={`${tfClass} border-l border-border/30`}>{totals.remaining.toLocaleString()}</td>
              <td className={tfClass} />
              <td className={`${tfClass} border-l border-border/30`} />
              <td className={tfClass} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
