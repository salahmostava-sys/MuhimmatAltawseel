/**
 * FuelSpreadsheetView — عرض جدول بيانات يشبه الإكسل لاستهلاك المناديب
 *
 * الصفوف = المناديب
 * الأعمدة = أيام الشهر (1..28/29/30/31)
 * الخلايا = كم / بنزين لكل مندوب في كل يوم
 */

import { useMemo, useState } from 'react';
import { getDaysInMonth } from 'date-fns';
import { Users, Calendar, TrendingUp, Fuel, BarChart3 } from 'lucide-react';

import type { DailyRow, Employee } from '@modules/fuel/types/fuel.types';

/* ─── Types ─────────────────────────────────────────────────── */

type CellData = {
  km: number;
  fuel: number;
  notes: string | null;
  id: string;
};

type RiderRow = {
  employee: Employee;
  days: Map<number, CellData>;
  totalKm: number;
  totalFuel: number;
  daysWithData: number;
};

type CellPopover = {
  riderName: string;
  day: number;
  date: string;
  data: CellData | null;
};

/* ─── Stat Card ─────────────────────────────────────────────── */

function SpreadsheetStat(props: Readonly<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}>) {
  const { icon, label, value, sub } = props;
  return (
    <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Cell Popover ──────────────────────────────────────────── */

function CellDetailPopover(props: Readonly<{
  popover: CellPopover;
  onClose: () => void;
}>) {
  const { popover, onClose } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-card rounded-2xl shadow-xl border border-border p-5 min-w-[280px] max-w-[360px] space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-foreground">{popover.riderName}</h4>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-muted-foreground">التاريخ: {popover.date}</p>

        {popover.data ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">الكيلومترات</span>
              <span className="font-bold text-primary">{popover.data.km.toLocaleString()} كم</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">تكلفة البنزين</span>
              <span className="font-bold text-warning">{popover.data.fuel.toLocaleString()} ر.س</span>
            </div>
            {popover.data.notes && (
              <div className="text-xs bg-muted/30 rounded-lg p-2 text-muted-foreground">
                💬 {popover.data.notes}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">لا توجد بيانات لهذا اليوم</p>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────── */

export default function FuelSpreadsheetView(props: Readonly<{
  loading: boolean;
  dailyRows: DailyRow[];
  riders: Employee[];
  monthYear: string;
}>) {
  const { loading, dailyRows, riders, monthYear } = props;
  const [popover, setPopover] = useState<CellPopover | null>(null);

  const daysInMonth = useMemo(() => {
    const [y, m] = monthYear.split('-').map(Number);
    return getDaysInMonth(new Date(y, m - 1));
  }, [monthYear]);

  const dayNumbers = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // Pivot daily rows into a map: employee_id → (day_number → CellData)
  const riderRows = useMemo((): RiderRow[] => {
    const pivot = new Map<string, Map<number, CellData>>();

    for (const row of dailyRows) {
      const dayNum = parseInt(row.date.split('-')[2], 10);
      if (!pivot.has(row.employee_id)) {
        pivot.set(row.employee_id, new Map());
      }
      const dayMap = pivot.get(row.employee_id)!;
      // Merge if multiple entries per day (shouldn't happen but be safe)
      const existing = dayMap.get(dayNum);
      if (existing) {
        dayMap.set(dayNum, {
          km: existing.km + (row.km_total || 0),
          fuel: existing.fuel + (row.fuel_cost || 0),
          notes: row.notes || existing.notes,
          id: row.id,
        });
      } else {
        dayMap.set(dayNum, {
          km: row.km_total || 0,
          fuel: row.fuel_cost || 0,
          notes: row.notes,
          id: row.id,
        });
      }
    }

    return riders.map((emp) => {
      const days = pivot.get(emp.id) ?? new Map<number, CellData>();
      let totalKm = 0;
      let totalFuel = 0;
      let daysWithData = 0;
      for (const cell of days.values()) {
        totalKm += cell.km;
        totalFuel += cell.fuel;
        daysWithData++;
      }
      return { employee: emp, days, totalKm, totalFuel, daysWithData };
    }).sort((a, b) => a.employee.name.localeCompare(b.employee.name, 'ar'));
  }, [dailyRows, riders]);

  // Column totals
  const columnTotals = useMemo(() => {
    const totals = new Map<number, { km: number; fuel: number }>();
    for (const day of dayNumbers) {
      let km = 0;
      let fuel = 0;
      for (const row of riderRows) {
        const cell = row.days.get(day);
        if (cell) {
          km += cell.km;
          fuel += cell.fuel;
        }
      }
      totals.set(day, { km, fuel });
    }
    return totals;
  }, [dayNumbers, riderRows]);

  // Stats
  const stats = useMemo(() => {
    const ridersWithData = riderRows.filter((r) => r.daysWithData > 0).length;
    const totalKm = riderRows.reduce((s, r) => s + r.totalKm, 0);
    const totalFuel = riderRows.reduce((s, r) => s + r.totalFuel, 0);
    const totalCells = riders.length * daysInMonth;
    const filledCells = riderRows.reduce((s, r) => s + r.daysWithData, 0);
    const coveragePct = totalCells > 0 ? (filledCells / totalCells) * 100 : 0;
    return { ridersWithData, totalKm, totalFuel, filledCells, coveragePct };
  }, [riderRows, riders.length, daysInMonth]);

  const grandTotalKm = riderRows.reduce((s, r) => s + r.totalKm, 0);
  const grandTotalFuel = riderRows.reduce((s, r) => s + r.totalFuel, 0);

  const handleCellClick = (riderName: string, day: number, data: CellData | null) => {
    const [y, m] = monthYear.split('-');
    const dateStr = `${y}-${m}-${String(day).padStart(2, '0')}`;
    setPopover({ riderName, day, date: dateStr, data });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="bg-card rounded-xl h-20 animate-pulse shadow-card" />
          ))}
        </div>
        <div className="bg-card rounded-xl h-96 animate-pulse shadow-card" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SpreadsheetStat
          icon={<Users size={18} />}
          label="مناديب لديهم بيانات"
          value={`${stats.ridersWithData} / ${riders.length}`}
        />
        <SpreadsheetStat
          icon={<Calendar size={18} />}
          label="خلايا مسجّلة"
          value={stats.filledCells.toLocaleString()}
          sub={`من ${(riders.length * daysInMonth).toLocaleString()} خلية`}
        />
        <SpreadsheetStat
          icon={<TrendingUp size={18} />}
          label="إجمالي الكيلومترات"
          value={`${stats.totalKm.toLocaleString()} كم`}
        />
        <SpreadsheetStat
          icon={<Fuel size={18} />}
          label="إجمالي البنزين"
          value={`${stats.totalFuel.toLocaleString()} ر.س`}
        />
        <SpreadsheetStat
          icon={<BarChart3 size={18} />}
          label="نسبة التغطية"
          value={`${stats.coveragePct.toFixed(0)}%`}
          sub="الخلايا المعبأة"
        />
      </div>

      {/* ── Spreadsheet Grid ──────────────────────────────────────── */}
      {riders.length === 0 ? (
        <div className="bg-card rounded-xl shadow-card p-12 text-center">
          <span className="text-4xl">📊</span>
          <p className="font-medium text-foreground mt-3">لا يوجد مناديب</p>
          <p className="text-xs text-muted-foreground mt-1">غيّر المنصة أو البحث</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border/50">
          <div className="px-4 py-2 border-b border-border/50 bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              📊 جدول بيانات — {riders.length} مندوب × {daysInMonth} يوم • اضغط على الخلية للتفاصيل
            </span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> بيانات مسجّلة
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-muted/60 border border-border/50" /> فارغ
              </span>
            </div>
          </div>

          <div className="overflow-auto max-h-[70vh]">
            <table className="text-[11px] border-collapse">
              {/* ── Header ──────────────────────────────────────── */}
              <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur-sm">
                <tr>
                  <th className="sticky right-0 z-30 bg-muted min-w-[180px] px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground border-b border-l border-border/50">
                    المندوب
                  </th>
                  {dayNumbers.map((d) => (
                    <th
                      key={d}
                      className="min-w-[56px] px-1 py-2.5 text-center text-xs font-semibold text-muted-foreground border-b border-l border-border/30"
                    >
                      {d}
                    </th>
                  ))}
                  <th className="min-w-[90px] px-2 py-2.5 text-center text-xs font-bold text-primary border-b border-l border-border/50 bg-primary/5">
                    المجموع
                  </th>
                </tr>
              </thead>

              <tbody>
                {riderRows.map((row) => (
                  <tr key={row.employee.id} className="border-b border-border/20 hover:bg-muted/10">
                    {/* ── Sticky rider name ────────────────────── */}
                    <td className="sticky right-0 z-10 bg-card border-l border-border/50 px-3 py-2 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        {row.employee.personal_photo_url && (
                          <img
                            src={row.employee.personal_photo_url}
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                            alt=""
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate text-[11px]">{row.employee.name}</p>
                          {row.employee.vehicle && (
                            <p className="text-[9px] text-muted-foreground truncate">
                              {row.employee.vehicle.type === 'motorcycle' ? '🏍️' : '🚗'} {row.employee.vehicle.plate_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ── Day cells ────────────────────────────── */}
                    {dayNumbers.map((d) => {
                      const cell = row.days.get(d);
                      const hasData = !!cell && (cell.km > 0 || cell.fuel > 0);
                      return (
                        <td
                          key={d}
                          className={`border-l border-border/20 px-1 py-1.5 text-center cursor-pointer transition-colors ${
                            hasData
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50'
                              : 'bg-muted/20 hover:bg-muted/40'
                          }`}
                          onClick={() => handleCellClick(row.employee.name, d, cell ?? null)}
                          title={hasData ? `${cell!.km} كم • ${cell!.fuel} ر.س` : 'لا بيانات'}
                        >
                          {hasData ? (
                            <div className="space-y-0.5">
                              <p className="font-bold text-primary leading-none">{cell!.km > 0 ? cell!.km : ''}</p>
                              <p className="text-warning leading-none text-[9px]">{cell!.fuel > 0 ? cell!.fuel : ''}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/30">·</span>
                          )}
                        </td>
                      );
                    })}

                    {/* ── Row total ────────────────────────────── */}
                    <td className="border-l border-border/50 px-2 py-1.5 text-center bg-primary/5">
                      <p className="font-bold text-primary text-[11px]">{row.totalKm > 0 ? `${row.totalKm.toLocaleString()} كم` : '—'}</p>
                      <p className="text-warning text-[9px]">{row.totalFuel > 0 ? `${row.totalFuel.toLocaleString()} ر.س` : ''}</p>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* ── Column totals footer ──────────────────────────── */}
              <tfoot className="sticky bottom-0 z-20">
                <tr className="border-t-2 border-border bg-muted/60 font-bold">
                  <td className="sticky right-0 z-30 bg-muted px-3 py-2.5 text-xs font-bold text-foreground border-l border-border/50">
                    المجموع اليومي
                  </td>
                  {dayNumbers.map((d) => {
                    const ct = columnTotals.get(d);
                    const hasData = ct && (ct.km > 0 || ct.fuel > 0);
                    return (
                      <td
                        key={d}
                        className="border-l border-border/30 px-1 py-2 text-center"
                      >
                        {hasData ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-primary leading-none text-[10px]">{ct!.km > 0 ? ct!.km.toLocaleString() : ''}</p>
                            <p className="text-warning leading-none text-[9px]">{ct!.fuel > 0 ? ct!.fuel.toLocaleString() : ''}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/30">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-l border-border/50 px-2 py-2.5 text-center bg-primary/10">
                    <p className="font-black text-primary text-xs">{grandTotalKm.toLocaleString()} كم</p>
                    <p className="text-warning text-[10px]">{grandTotalFuel.toLocaleString()} ر.س</p>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Cell Detail Popover ────────────────────────────────── */}
      {popover && <CellDetailPopover popover={popover} onClose={() => setPopover(null)} />}
    </div>
  );
}
