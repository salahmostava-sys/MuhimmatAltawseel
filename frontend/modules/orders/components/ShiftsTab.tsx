import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Loader2, Save, Clock, Download, Printer } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { loadXlsx } from '@modules/orders/utils/xlsx';
import { OrdersMonthNavigator } from '@shared/components/orders/OrdersMonthNavigator';
import { isShiftCapableApp } from '@shared/lib/workType';
import { monthLabel } from '@modules/orders/utils/dateMonth';
import type { App, Employee } from '@modules/orders/types';

export type ShiftRow = {
  id?: string;
  employee_id: string;
  app_id: string;
  date: string;
  hours_worked: number;
  notes?: string | null;
  employee?: { name: string };
  app?: { name: string };
};

/** key = `${empId}::${day}` → hours */
type ShiftGrid = Record<string, number>;

type Props = {
  year: number;
  month: number;
  shifts: ShiftRow[];
  employees: Employee[];
  apps: App[];
  loading: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSave: (shifts: ShiftRow[]) => Promise<void>;
  canEdit: boolean;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function buildGridFromShifts(shifts: ShiftRow[]): ShiftGrid {
  const grid: ShiftGrid = {};
  for (const s of shifts) {
    if (!s.date || !s.employee_id) continue;
    const day = parseInt(s.date.slice(8, 10), 10);
    if (isNaN(day)) continue;
    const key = `${s.employee_id}::${day}`;
    grid[key] = (grid[key] ?? 0) + s.hours_worked;
  }
  return grid;
}

function gridToShiftRows(
  grid: ShiftGrid,
  year: number,
  month: number,
  shiftAppId: string,
): ShiftRow[] {
  const rows: ShiftRow[] = [];
  for (const [key, hours] of Object.entries(grid)) {
    if (hours <= 0) continue;
    const [empId, dayStr] = key.split('::');
    const day = parseInt(dayStr, 10);
    if (!empId || isNaN(day)) continue;
    rows.push({
      employee_id: empId,
      app_id: shiftAppId,
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      hours_worked: hours,
    });
  }
  return rows;
}

export function ShiftsTab({
  year,
  month,
  shifts,
  employees,
  apps,
  loading,
  onPrevMonth,
  onNextMonth,
  onSave,
  canEdit,
}: Props) {
  const shiftApps = useMemo(() => apps.filter(isShiftCapableApp), [apps]);
  const shiftAppId = shiftApps[0]?.id ?? '';

  // All employees passed from parent (already filtered to shift-app assignments)
  // plus any extra employees that have shift data in this month but weren't in the list
  const allShiftEmployees = useMemo(() => {
    const empIds = new Set(employees.map((e) => e.id));
    const extras: typeof employees = [];
    shifts.forEach((s) => {
      if (!empIds.has(s.employee_id)) {
        empIds.add(s.employee_id);
        extras.push({
          id: s.employee_id,
          name: s.employee?.name ?? s.employee_id,
          salary_type: 'shift',
          status: 'active',
          sponsorship_status: null,
        });
      }
    });
    return [...employees, ...extras];
  }, [employees, shifts]);

  const [grid, setGrid] = useState<ShiftGrid>(() => buildGridFromShifts(shifts));
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<string | null>(null);

  useEffect(() => {
    setGrid(buildGridFromShifts(shifts));
  }, [shifts]);



  const days = getDaysInMonth(year, month);
  const dayArr = useMemo(() => Array.from({ length: days }, (_, i) => i + 1), [days]);

  const filteredEmployees = useMemo(
    () => (search ? allShiftEmployees.filter((e) => e.name.includes(search)) : allShiftEmployees),
    [allShiftEmployees, search],
  );

  const getVal = useCallback(
    (empId: string, day: number) => grid[`${empId}::${day}`] ?? 0,
    [grid],
  );

  const empMonthTotal = useCallback(
    (empId: string) => dayArr.reduce((s, d) => s + getVal(empId, d), 0),
    [dayArr, getVal],
  );

  const handleCellClick = (empId: string, day: number) => {
    if (!canEdit) return;
    const key = `${empId}::${day}`;
    // Toggle: if already editing this cell, close it
    if (editingCell === key) {
      setEditingCell(null);
      return;
    }
    setEditingCell(key);

  };

  const commitAttendance = (key: string, value: number) => {
    setGrid((prev) => {
      const next = { ...prev };
      if (value > 0) next[key] = value;
      else delete next[key];
      return next;
    });
    setEditingCell(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = gridToShiftRows(grid, year, month, shiftAppId);
      await onSave(rows);
    } finally {
      setSaving(false);
    }
  };

  const tableRef = useRef<HTMLTableElement>(null);

  const exportExcel = async () => {
    const XLSX = await loadXlsx();
    const headers = ['الموظف', ...dayArr.map((d) => String(d)), 'المجموع'];
    const rows = filteredEmployees.map((emp) => {
      const values: Array<string | number> = [emp.name];
      dayArr.forEach((d) => {
        const v = getVal(emp.id, d);
        const key = `${emp.id}::${d}`;
        values.push(v > 0 ? 'حاضر' : grid[key] !== undefined ? 'غائب' : '');
      });
      values.push(empMonthTotal(emp.id));
      return values;
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الدوام');
    XLSX.writeFile(wb, `دوام_${month}_${year}.xlsx`);
  };

  const handlePrint = () => {
    const table = tableRef.current;
    if (!table) return;
    const win = globalThis.open('', '_blank');
    if (!win) return;
    const doc = win.document;
    doc.documentElement.setAttribute('dir', 'rtl');
    doc.documentElement.setAttribute('lang', 'ar');
    const meta = doc.createElement('meta'); meta.setAttribute('charset', 'UTF-8'); doc.head.appendChild(meta);
    doc.title = `دوام ${month}/${year}`;
    const style = doc.createElement('style');
    style.textContent = '*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:10px;direction:rtl}h2{text-align:center;margin:8px 0}table{width:100%;border-collapse:collapse}th{background:#1e3a5f;color:#fff;padding:4px;text-align:center;font-size:9px}td{padding:3px;border:1px solid #ddd;text-align:center}@media print{body{print-color-adjust:exact}}';
    doc.head.appendChild(style);
    const h2 = doc.createElement('h2');
    h2.textContent = `دوام شهر ${month}/${year} — ${filteredEmployees.length} موظف`;
    doc.body.appendChild(h2);
    doc.body.appendChild(table.cloneNode(true));
    win.onload = () => { win.print(); win.onafterprint = () => win.close(); };
  };

  const now = new Date();
  const today = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : -1;

  const grandTotal = useMemo(
    () => filteredEmployees.reduce((s, e) => s + empMonthTotal(e.id), 0),
    [filteredEmployees, empMonthTotal],
  );

  if (shiftApps.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Clock size={36} className="mx-auto mb-3 text-muted-foreground/30" />
        <p className="font-medium">لا توجد منصات دوام</p>
        <p className="text-xs mt-1">أضف منصة بنوع "دوام" أو "مختلط" من إعدادات التطبيقات</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <OrdersMonthNavigator
          compact
          label={monthLabel(year, month)}
          onPrev={onPrevMonth}
          onNext={onNextMonth}
        />

        <div className="flex items-center gap-2">
          <Input
            placeholder="بحث عن موظف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-48 text-xs"
          />
          <span className="text-xs text-muted-foreground">
            {filteredEmployees.length} موظف
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => void exportExcel()} className="gap-1.5 h-8 text-xs">
            <Download size={13} /> تصدير
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 h-8 text-xs">
            <Printer size={13} /> طباعة
          </Button>
          {canEdit && (
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              حفظ
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="bg-card rounded-xl shadow-card overflow-x-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" /> جاري التحميل...
          </div>
        ) : (
          <table ref={tableRef} className="border-collapse text-[11px] leading-tight w-full" style={{ minWidth: `${36 + 132 + days * 40 + 64}px` }}>
            <thead className="sticky top-0 z-20">
              <tr className="bg-muted border-b-2 border-border">
                <th className="sticky right-0 z-[32] bg-muted text-center px-0.5 py-1.5 font-semibold text-muted-foreground border-l border-border" style={{ minWidth: 36, width: 36 }}>
                  #
                </th>
                <th className="sticky z-[31] bg-muted text-right px-1.5 py-1.5 font-semibold text-foreground border-l-2 border-border" style={{ right: 36, minWidth: 132 }}>
                  الموظف
                </th>
                {dayArr.map((d) => {
                  const dow = new Date(year, month - 1, d).getDay();
                  const isWeekend = dow === 5 || dow === 6;
                  const isToday = d === today;
                  return (
                    <th
                      key={d}
                      className={`text-center px-0.5 py-1.5 font-medium border-l border-border/50
                        ${isToday ? 'bg-primary/20 text-primary font-bold' : isWeekend ? 'text-muted-foreground/50 bg-muted/40' : 'text-muted-foreground'}`}
                      style={{ minWidth: 40 }}
                    >
                      {d}
                    </th>
                  );
                })}
                <th className="sticky left-0 z-30 text-center py-1.5 font-bold text-primary bg-muted border-r-2 border-border" style={{ minWidth: 64 }}>
                  المجموع
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={days + 3} className="text-center py-12 text-muted-foreground">
                    لا يوجد موظفين دوام
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => {
                  const total = empMonthTotal(emp.id);
                  const rowBg = idx % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--muted))';

                  return (
                    <tr key={emp.id} className="border-b border-border/40">
                      <td
                        className="sticky right-0 z-[12] text-center px-0.5 py-1 border-l border-border tabular-nums text-muted-foreground font-medium"
                        style={{ backgroundColor: rowBg, minWidth: 36, width: 36 }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        className="sticky z-[11] px-1.5 py-1 border-l-2 border-border"
                        style={{ backgroundColor: rowBg, right: 36, minWidth: 132 }}
                      >
                        <span className="font-medium text-foreground truncate max-w-[7.5rem] block" title={emp.name}>
                          {emp.name}
                        </span>
                      </td>

                      {dayArr.map((d) => {
                        const val = getVal(emp.id, d);
                        const cellKey = `${emp.id}::${d}`;
                        const isEditing = editingCell === cellKey;
                        const dow = new Date(year, month - 1, d).getDay();
                        const isWeekend = dow === 5 || dow === 6;
                        const isToday = d === today;
                        const isPresent = val > 0;

                        return (
                          <td
                            key={d}
                            className={`text-center p-0 border-l border-border/30 transition-colors
                              ${isToday ? 'bg-primary/10' : isWeekend ? 'bg-muted/20' : ''}
                              ${isEditing ? 'ring-2 ring-inset ring-primary' : ''}
                              ${canEdit && !isEditing ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                            style={{ minWidth: 52 }}
                            onClick={() => !isEditing && handleCellClick(emp.id, d)}
                          >
                            {isEditing ? (
                              <select
                                autoFocus
                                value={val > 0 ? '1' : val === 0 && grid[cellKey] !== undefined ? '0' : ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === '') {
                                    // فاضي — مسح من الشبكة
                                    setGrid((prev) => { const next = { ...prev }; delete next[cellKey]; return next; });
                                    setEditingCell(null);
                                  } else {
                                    commitAttendance(cellKey, parseInt(v, 10));
                                  }
                                }}
                                onBlur={() => setEditingCell(null)}
                                className="h-7 w-full text-center text-[10px] border-0 bg-transparent cursor-pointer focus:outline-none font-bold"
                              >
                                <option value="">— فاضي —</option>
                                <option value="1">حاضر ✅</option>
                                <option value="0">غائب ❌</option>
                              </select>
                            ) : (
                              <div className="h-7 flex items-center justify-center">
                                {isPresent ? (
                                  <span className="font-bold text-[10px] leading-none text-emerald-600 dark:text-emerald-400">حاضر</span>
                                ) : grid[cellKey] !== undefined ? (
                                  <span className="font-bold text-[10px] leading-none text-rose-500 dark:text-rose-400">غائب</span>
                                ) : (
                                  <span className="text-muted-foreground/20">·</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td
                        className="sticky left-0 z-10 text-center px-1 py-1 font-bold border-r-2 border-border bg-muted"
                        style={{ minWidth: 64 }}
                      >
                        <span className="text-emerald-600 font-bold text-[10px]">{total}</span>
                        <span className="text-muted-foreground/50 text-[9px]"> / {days}</span>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Totals row */}
              {filteredEmployees.length > 0 && (
                <tr className="border-t-2 border-border font-semibold">
                  <td className="sticky right-0 z-[12] text-center px-0.5 py-1.5 border-l border-border text-muted-foreground bg-muted" style={{ minWidth: 36, width: 36 }}>
                    —
                  </td>
                  <td className="sticky z-[11] px-1.5 py-1.5 text-xs font-bold border-l-2 border-border text-foreground bg-muted" style={{ right: 36, minWidth: 132 }}>
                    الإجمالي
                  </td>
                  {dayArr.map((d) => {
                    const dayTotal = filteredEmployees.reduce((s, e) => s + (getVal(e.id, d) > 0 ? 1 : 0), 0);
                    const isToday = d === today;
                    return (
                      <td
                        key={d}
                        className={`text-center px-0.5 py-1.5 font-bold border-l border-border/40 ${isToday ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                        style={{ minWidth: 52, backgroundColor: isToday ? undefined : 'hsl(var(--muted) / 0.4)' }}
                      >
                        {dayTotal > 0 ? (
                          <span className="text-emerald-600">{dayTotal}</span>
                        ) : (
                          <span className="text-muted-foreground/30">0</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="sticky left-0 z-10 text-center px-1.5 py-1.5 font-bold text-xs text-primary border-r-2 border-border bg-muted" style={{ minWidth: 64 }}>
                    {grandTotal}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> حاضر</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> غائب</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20 inline-block" /> لم يُحدد</span>
        <span>• اضغط على الخلية لتغيير الحالة</span>
      </div>
    </div>
  );
}
