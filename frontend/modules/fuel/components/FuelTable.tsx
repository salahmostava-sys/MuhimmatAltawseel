import React, { useState } from 'react';
import {
  Download, FolderOpen, Edit2, Trash2,
  Fuel,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import * as XLSX from '@e965/xlsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@shared/components/ui/dropdown-menu';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { useToast } from '@shared/hooks/use-toast';
import { GlobalTableFilters, createDefaultGlobalFilters } from '@shared/components/table/GlobalTableFilters';
import { useFuelDailyPaged } from '@shared/hooks/useFuelDailyPaged';
import { auditService } from '@services/auditService';
import { getErrorMessage } from '@services/serviceError';
import {
  calcFuelCostPerKm,
  calcFuelPerOrder,
  getRiderDailyRows,
  getRiderOrders,
  sumRiderFuel,
  sumRiderKm,
} from '@shared/lib/fuelBusiness';
import { useFuel } from '@modules/fuel/hooks/useFuel';
import {
  costPerKmColor,
  fuelPerOrderBadgeClass,
} from '@modules/fuel/model/fuelCalculations';
import { FuelMonthlyStats, FuelDailyStats } from '@modules/fuel/components/FuelStats';
import { FuelForm } from '@modules/fuel/components/FuelForm';
import type {
  DailyRow,
  MonthlyRow,
  Employee,
  AppRow,
  DailyExpandedArgs,
  FuelBranch,
} from '@modules/fuel/types/fuel.types';
import { MONTHLY_SKELETON_ROWS } from '@modules/fuel/types/fuel.types';

export function FuelMonthlyTable(props: Readonly<{
  tableRef: React.RefObject<HTMLTableElement | null>;
  bodyRows: React.ReactNode;
}>) {
  const { tableRef, bodyRows } = props;
  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground">المندوب</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">أيام مسجّلة</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">الكيلومترات</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">تكلفة البنزين</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">تكلفة/كم</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">الدباب 🏍️</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">عدد الطلبات 📦</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">بنزين/طلب</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">إجراءات</th>
            </tr>
          </thead>
          <tbody>{bodyRows}</tbody>
        </table>
      </div>
    </div>
  );
}

const renderMonthlyLoadingRows = (): React.ReactNode =>
  MONTHLY_SKELETON_ROWS.map((rowKey) => (
    <tr key={`fuel-monthly-skeleton-row-${rowKey}`} className="border-b border-border/30">
      {Array.from({ length: 9 }).map((_, j) => (
        <td key={`fuel-monthly-skeleton-cell-${rowKey}-${j}`} className="px-4 py-3"><div className="h-4 bg-muted/60 rounded animate-pulse" /></td>
      ))}
    </tr>
  ));

const renderMonthlyEmptyRow = (): React.ReactNode => (
  <tr>
    <td colSpan={9} className="text-center py-16">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <span className="text-4xl">⛽</span>
        <p className="font-medium">لا توجد بيانات لهذا الشهر</p>
        <p className="text-xs">أضف إدخالات يومية من عرض يومي أو غيّر المنصة/البحث</p>
      </div>
    </td>
  </tr>
);

const renderMonthlyTotalsRow = (
  filteredCount: number,
  totalKm: number,
  totalFuel: number,
  avgCostPerKm: number,
  totalOrders: number
): React.ReactNode => (
  <tr className="border-t-2 border-border bg-muted/20 font-semibold text-sm">
    <td className="px-4 py-3 text-foreground">الإجمالي ({filteredCount} مندوب)</td>
    <td className="px-4 py-3 text-center text-muted-foreground">—</td>
    <td className="px-4 py-3 text-center text-primary">{totalKm.toLocaleString()} كم</td>
    <td className="px-4 py-3 text-center text-warning">{totalFuel.toLocaleString()} ر.س</td>
    <td className={`px-4 py-3 text-center ${costPerKmColor(avgCostPerKm)}`}>
      {avgCostPerKm > 0 ? `${avgCostPerKm.toFixed(3)} ر.س/كم` : '—'}
    </td>
    <td className="px-4 py-3 text-center text-muted-foreground">—</td>
    <td className="px-4 py-3 text-center">{totalOrders.toLocaleString()}</td>
    <td className="px-4 py-3 text-center text-muted-foreground">
      {totalOrders > 0 ? `${(totalFuel / totalOrders).toFixed(2)} ر.س` : '—'}
    </td>
    <td />
  </tr>
);

const renderDailyLoadingRow = (): React.ReactNode => (
  <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">جاري التحميل...</td></tr>
);

const renderDailyEmptyRidersRow = (): React.ReactNode => (
  <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">لا يوجد مناديب على هذه المنصة</td></tr>
);

const renderDailyExpandedContent = ({
  days,
  editingDaily,
  permissionsCanEdit,
  savingEntry,
  updateEditingDaily,
  saveEditedDaily,
  setEditingDaily,
  handleDeleteDaily,
}: DailyExpandedArgs): React.ReactNode => {
  if (days.length === 0) {
    return <p className="text-xs text-muted-foreground px-2">لا سجلات يومية لهذا الشهر</p>;
  }
  return (
    <table className="w-full text-xs border border-border/40 rounded-lg overflow-hidden">
      <thead className="bg-muted/50">
        <tr>
          <th className="px-2 py-1.5 text-start">التاريخ</th>
          <th className="px-2 py-1.5 text-center">كم</th>
          <th className="px-2 py-1.5 text-center">بنزين</th>
          <th className="px-2 py-1.5 text-start">ملاحظات</th>
          <th className="px-2 py-1.5 text-center w-24">إجراء</th>
        </tr>
      </thead>
      <tbody>
        {days.map(dr => (
          <tr key={dr.id} className="border-t border-border/30">
            <td className="px-2 py-1.5 font-mono">{dr.date}</td>
            <td className="px-2 py-1.5 text-center">
              {editingDaily?.id === dr.id ? (
                <Input className="h-7 text-xs" type="number" value={editingDaily.km_total} onChange={e => updateEditingDaily('km_total', e.target.value)} />
              ) : (dr.km_total || '—')}
            </td>
            <td className="px-2 py-1.5 text-center">
              {editingDaily?.id === dr.id ? (
                <Input className="h-7 text-xs" type="number" value={editingDaily.fuel_cost} onChange={e => updateEditingDaily('fuel_cost', e.target.value)} />
              ) : (dr.fuel_cost || '—')}
            </td>
            <td className="px-2 py-1.5">
              {editingDaily?.id === dr.id ? (
                <Input className="h-7 text-xs" value={editingDaily.notes} onChange={e => updateEditingDaily('notes', e.target.value)} />
              ) : (dr.notes || '—')}
            </td>
            <td className="px-2 py-1.5 text-center">
              {permissionsCanEdit && (
                <div className="flex gap-1 justify-center">
                  {editingDaily?.id === dr.id ? (
                    <>
                      <Button type="button" size="sm" className="h-7 text-[10px] px-2" disabled={savingEntry} onClick={() => saveEditedDaily(dr)}>حفظ</Button>
                      <Button type="button" size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => setEditingDaily(null)}>إلغاء</Button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="p-1 rounded hover:bg-muted" onClick={() => setEditingDaily({ id: dr.id, km_total: String(dr.km_total), fuel_cost: String(dr.fuel_cost), notes: dr.notes || '' })}><Edit2 size={13} /></button>
                      <button type="button" className="p-1 rounded hover:bg-destructive/10 text-destructive" onClick={() => handleDeleteDaily(dr.id)}><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export function FuelMonthlyView(props: Readonly<{
  loading: boolean;
  filteredMonthly: MonthlyRow[];
  totalKm: number;
  totalFuel: number;
  totalOrders: number;
  avgCostPerKm: number;
  setSelectedEmployee: (id: string) => void;
  setView: (v: 'monthly' | 'daily') => void;
  setExpandedRider: (id: string | null) => void;
  tableRef: React.RefObject<HTMLTableElement | null>;
}>) {
  const {
    loading,
    filteredMonthly,
    totalKm,
    totalFuel,
    totalOrders,
    avgCostPerKm,
    setSelectedEmployee,
    setView,
    setExpandedRider,
    tableRef,
  } = props;

  let monthlyBodyRows: React.ReactNode;
  if (loading) {
    monthlyBodyRows = renderMonthlyLoadingRows();
  } else if (filteredMonthly.length === 0) {
    monthlyBodyRows = renderMonthlyEmptyRow();
  } else {
    monthlyBodyRows = (
      <>
        {filteredMonthly.map(row => {
          const costPerKm = calcFuelCostPerKm(row.km_total, row.fuel_cost);
          const fuelPerOrder = calcFuelPerOrder(row.fuel_cost, row.orders_count);
          return (
            <tr key={row.employee_id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {row.personal_photo_url && (
                    <img src={row.personal_photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                  )}
                  <span className="font-medium text-foreground">{row.employee_name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{row.daily_count} يوم</span>
              </td>
              <td className="px-4 py-3 text-center font-medium text-primary">{row.km_total.toLocaleString()} كم</td>
              <td className="px-4 py-3 text-center font-medium text-warning">{row.fuel_cost.toLocaleString()} ر.س</td>
              <td className={`px-4 py-3 text-center ${costPerKmColor(costPerKm)}`}>
                {costPerKm === null ? '—' : `${costPerKm.toFixed(3)} ر.س/كم`}
              </td>
              <td className="px-4 py-3 text-center">
                {row.vehicle ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-semibold text-foreground">
                      {row.vehicle.type === 'motorcycle' ? '🏍️' : '🚗'} {row.vehicle.plate_number}
                    </span>
                    {(row.vehicle.brand || row.vehicle.model) && (
                      <span className="text-[10px] text-muted-foreground">
                        {[row.vehicle.brand, row.vehicle.model].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </div>
                ) : <span className="text-muted-foreground/40 text-xs">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                {row.orders_count > 0
                  ? <span className="font-semibold text-foreground">{row.orders_count.toLocaleString()}</span>
                  : <span className="text-muted-foreground/40">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs text-muted-foreground">{fuelPerOrder === null ? '—' : `${fuelPerOrder.toFixed(2)} ر.س`}</span>
                  {(() => {
                    const badge = fuelPerOrderBadgeClass(fuelPerOrder);
                    if (!badge) return null;
                    return <span className={badge.className}>{badge.label}</span>;
                  })()}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmployee(row.employee_id);
                    setView('daily');
                    setExpandedRider(row.employee_id);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  الأيام ←
                </button>
              </td>
            </tr>
          );
        })}
        {renderMonthlyTotalsRow(filteredMonthly.length, totalKm, totalFuel, avgCostPerKm, totalOrders)}
      </>
    );
  }

  return (
    <>
      <FuelMonthlyStats totalKm={totalKm} totalFuel={totalFuel} avgCostPerKm={avgCostPerKm} totalOrders={totalOrders} />
      <FuelMonthlyTable tableRef={tableRef} bodyRows={monthlyBodyRows} />
    </>
  );
}

export function FuelDailyDetailedView(props: Readonly<{
  setDailyMode: (m: 'detailed' | 'fast') => void;
  filteredDaily: DailyRow[];
  dailyTotalKm: number;
  dailyTotalFuel: number;
  ridersForTab: Employee[];
  selectedEmployee: string;
  setSelectedEmployee: (v: string) => void;
  loading: boolean;
  expandedRider: string | null;
  setExpandedRider: (v: string | null) => void;
  monthOrdersMap: Record<string, number>;
  permissionsCanEdit: boolean;
  newEntry: { employee_id: string; date: string; km_total: string; fuel_cost: string; notes: string };
  setNewEntry: React.Dispatch<React.SetStateAction<{ employee_id: string; date: string; km_total: string; fuel_cost: string; notes: string }>>;
  defaultEntryDate: string;
  savingEntry: boolean;
  submitNewEntry: () => Promise<void>;
  editingDaily: { id: string; km_total: string; fuel_cost: string; notes: string } | null;
  setEditingDaily: React.Dispatch<React.SetStateAction<{ id: string; km_total: string; fuel_cost: string; notes: string } | null>>;
  updateEditingDaily: (field: 'km_total' | 'fuel_cost' | 'notes', value: string) => void;
  saveEditedDaily: (row: DailyRow) => Promise<void>;
  handleDeleteDaily: (id: string) => Promise<void>;
}>) {
  const {
    setDailyMode,
    filteredDaily,
    dailyTotalKm,
    dailyTotalFuel,
    ridersForTab,
    selectedEmployee,
    setSelectedEmployee,
    loading,
    expandedRider,
    setExpandedRider,
    monthOrdersMap,
    permissionsCanEdit,
    newEntry,
    setNewEntry,
    defaultEntryDate,
    savingEntry,
    submitNewEntry,
    editingDaily,
    setEditingDaily,
    updateEditingDaily,
    saveEditedDaily,
    handleDeleteDaily,
  } = props;

  const dailyForRider = (empId: string) => getRiderDailyRows(filteredDaily, empId);
  const riderMonthKm = (empId: string) => sumRiderKm(dailyForRider(empId));
  const riderMonthFuel = (empId: string) => sumRiderFuel(dailyForRider(empId));
  const riderMonthOrders = (empId: string) => getRiderOrders(monthOrdersMap, empId);

  let dailyRiderRows: React.ReactNode;
  if (loading) {
    dailyRiderRows = renderDailyLoadingRow();
  } else if (ridersForTab.length === 0) {
    dailyRiderRows = renderDailyEmptyRidersRow();
  } else {
    dailyRiderRows = ridersForTab.map(emp => {
      const open = expandedRider === emp.id;
      const days = dailyForRider(emp.id);
      return (
        <React.Fragment key={emp.id}>
          <tr className="border-b border-border/30 hover:bg-muted/10">
            <td className="px-2 py-2 text-center">
              <button
                type="button"
                className="p-1 rounded hover:bg-muted"
                onClick={() => setExpandedRider(open ? null : emp.id)}
                aria-expanded={open}
              >
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                {emp.personal_photo_url && <img src={emp.personal_photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />}
                <span className="font-medium">{emp.name}</span>
              </div>
            </td>
            <td className="px-4 py-2 text-center">
              {riderMonthOrders(emp.id) > 0
                ? <span className="font-semibold text-foreground">{riderMonthOrders(emp.id).toLocaleString()}</span>
                : <span className="text-muted-foreground/40">—</span>}
            </td>
            <td className="px-4 py-2 text-center font-medium text-primary">{riderMonthKm(emp.id).toLocaleString()}</td>
            <td className="px-4 py-2 text-center text-warning">{riderMonthFuel(emp.id).toLocaleString()} ر.س</td>
          </tr>
          {open && (
            <tr className="bg-muted/10">
              <td colSpan={5} className="p-0">
                <div className="p-3 space-y-2">
                  {renderDailyExpandedContent({
                    days,
                    editingDaily,
                    permissionsCanEdit,
                    savingEntry,
                    updateEditingDaily,
                    saveEditedDaily,
                    setEditingDaily,
                    handleDeleteDaily,
                  })}
                </div>
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
  }

  return (
    <>
      <FuelDailyStats count={filteredDaily.length} totalKm={dailyTotalKm} totalFuel={dailyTotalFuel} />

      <div className="flex flex-wrap gap-2 items-center">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-9"
          onClick={() => setDailyMode('fast')}
        >
          <Fuel size={14} /> قائمة (سريعة)
        </Button>
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="كل المناديب" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="_all_">كل المناديب (المنصة)</SelectItem>
            {ridersForTab.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Riders + expandable daily + bottom inline add */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border/50">
        <div className="px-4 py-2 border-b border-border/50 bg-muted/20 text-xs text-muted-foreground">
          مناديب المنصة المختارة (يشمل أي مندوب لديه طلبات هذا الشهر) — اضغط السهم لعرض السجلات اليومية وإضافة إدخال من الصف السفلي.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="w-10 px-2 py-2" />
                <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground">المندوب</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">الطلبات (الشهر)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">كم (الشهر)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">بنزين (الشهر)</th>
              </tr>
            </thead>
            <tbody>
              {dailyRiderRows}
            </tbody>
            {permissionsCanEdit && (
              <tfoot>
                <tr className="bg-primary/5 border-t-2 border-primary/20">
                  <td colSpan={5} className="p-3">
                    <FuelForm
                      riders={ridersForTab}
                      entry={newEntry}
                      defaultEntryDate={defaultEntryDate}
                      saving={savingEntry}
                      onSubmit={submitNewEntry}
                      onChange={setNewEntry}
                    />
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}

type FuelDailyFastListProps = Readonly<{
  monthYear: string;
  monthStart: string;
  monthEnd: string;
  employees: Employee[];
  filters: ReturnType<typeof createDefaultGlobalFilters>;
  onFiltersChange: (next: ReturnType<typeof createDefaultGlobalFilters>) => void;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onBack: () => void;
}>;

export function FuelDailyFastList(props: FuelDailyFastListProps) {
  const { monthYear, monthStart, monthEnd, employees, filters, onFiltersChange, page, pageSize, onPageChange, onBack } = props;
  const { toast } = useToast();
  const fuelApi = useFuel();
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useFuelDailyPaged({
    monthStart,
    monthEnd,
    page,
    pageSize,
    filters: {
      driverId: filters.driverId === 'all' ? undefined : String(filters.driverId),
      branch: filters.branch,
      search: filters.search,
    },
  });

  type Row = {
    id: string;
    employee_id: string;
    date: string;
    km_total: number;
    fuel_cost: number;
    notes: string | null;
    employees?: { id: string; name: string; city: string | null } | null;
  };
  const paged = data as unknown as { rows?: Row[]; total?: number } | undefined;
  const rows = paged?.rows || [];
  const total = paged?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isAllDrivers = filters.driverId === 'all';
  const isAllBranches = filters.branch === 'all';

  const exportExcel = async () => {
    setExporting(true);
    try {
      const employeeId = isAllDrivers ? undefined : String(filters.driverId);
      const branch: FuelBranch | undefined = isAllBranches ? undefined : (filters.branch as FuelBranch);
      const search = filters.search?.trim() || undefined;

      const out = (await fuelApi.exportDailyMileage({
        monthStart,
        monthEnd,
        filters: { employeeId, branch, search },
      })) as Row[];
      const sheet = out.map((r) => ({
        'التاريخ': r.date,
        'المندوب': r.employees?.name ?? '',
        'الفرع': r.employees?.city ?? '',
        'كيلومترات': r.km_total ?? 0,
        'بنزين': r.fuel_cost ?? 0,
        'ملاحظات': r.notes ?? '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sheet);
      XLSX.utils.book_append_sheet(wb, ws, 'FuelDaily');
      XLSX.writeFile(wb, `fuel_daily_${monthYear}.xlsx`);

      await auditService.logAdminAction({
        action: 'fuel.daily.export',
        table_name: 'vehicle_mileage_daily',
        record_id: null,
        meta: { total: out.length, monthYear, employeeId: employeeId ?? null, branch: branch ?? null, search: search ?? null },
      });
    } catch (e) {
      const msg = getErrorMessage(e, 'تعذر التصدير');
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };
  const tableBodyRows = (() => {
    if (isLoading) {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((slot) => (
        <tr key={`fuel-daily-skeleton-row-${slot}`}>
          <td className="px-4 py-3"><span className="text-muted-foreground">...</span></td>
          <td className="px-4 py-3"><span className="text-muted-foreground">...</span></td>
          <td className="px-4 py-3 text-center"><span className="text-muted-foreground">...</span></td>
          <td className="px-4 py-3 text-center"><span className="text-muted-foreground">...</span></td>
          <td className="px-4 py-3"><span className="text-muted-foreground">...</span></td>
        </tr>
      ));
    }
    if (rows.length === 0) {
      return (
        <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">لا توجد نتائج</td></tr>
      );
    }
    return rows.map((r) => (
      <tr key={r.id} className="hover:bg-muted/10">
        <td className="px-4 py-3 font-mono text-xs">{r.date}</td>
        <td className="px-4 py-3 font-medium">{r.employees?.name ?? '—'}</td>
        <td className="px-4 py-3 text-center font-semibold text-primary">{Number(r.km_total || 0).toLocaleString()}</td>
        <td className="px-4 py-3 text-center text-warning">{Number(r.fuel_cost || 0).toLocaleString()}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground">{r.notes ?? '—'}</td>
      </tr>
    ));
  })();

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="page-title flex items-center gap-2">
              <Fuel size={18} /> الوقود — قائمة (سريعة)
            </h2>
            <p className="page-subtitle">{total.toLocaleString()} سجل — {monthYear}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onBack}>رجوع</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" disabled={exporting}>
                  <FolderOpen size={14} /> ملفات
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportExcel} disabled={exporting}>
                  {exporting && <Download size={14} className="ml-2 opacity-70" />}
                  📊 تصدير Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="ds-card p-3">
        <GlobalTableFilters
          value={{
            ...createDefaultGlobalFilters(),
            search: filters.search,
            branch: filters.branch,
            driverId: filters.driverId,
            platformAppIds: [],
            dateFrom: '',
            dateTo: '',
          }}
          onChange={(next) => onFiltersChange({ ...filters, ...next, platformAppIds: [], dateFrom: '', dateTo: '' })}
          onReset={() => onFiltersChange(createDefaultGlobalFilters())}
          options={{
            drivers: employees.map((e) => ({ id: e.id, name: e.name })),
            enableBranch: true,
            enableDriver: true,
            enablePlatform: false,
            enableDateRange: false,
          }}
        />
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground">التاريخ</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground">المندوب</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">كم</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">بنزين</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tableBodyRows}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs">
          <div className="text-muted-foreground">{total.toLocaleString()} سجل</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
              السابق
            </Button>
            <span className="tabular-nums text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-8" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
              التالي
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
