import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { getOrdersCellBackground } from '@modules/salaries/lib/salaryConstants';
import { getPlatformActivitySummary, getPrimaryPlatformActivityCount } from '@modules/salaries/model/salaryUtils';
import type { PlatformSalaryMetric, SalaryRow, SchemeData } from '@modules/salaries/types/salary.types';
import { getTierSalaryExplanationLines } from '@services/salaryService';

export const EditableCell = ({
  value, onChange, className = '', min = 0, accentColor,
}: {
  value: number; onChange: (v: number) => void;
  className?: string; min?: number; accentColor?: string;
}) => {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(String(value));

  const commit = () => {
    const n = Number.parseFloat(local);
    const next = Number.isNaN(n) ? 0 : Math.max(min, n);
    // FIX I7: skip onChange if value didn't change — avoids unnecessary re-renders
    if (next !== value) onChange(next);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          else if (e.key === 'Escape') setEditing(false);
        }}
        style={{ borderColor: accentColor }}
        className={`w-16 text-center border rounded px-1 py-0.5 text-xs bg-background outline-none ${className}`}
      />
    );
  }
  return (
    <span
      onDoubleClick={() => { setLocal(String(value)); setEditing(true); }}
      style={accentColor && value > 0 ? { color: accentColor } : undefined}
      className={`cursor-pointer hover:bg-primary/10 rounded px-1 py-0.5 text-xs min-w-[40px] inline-block text-center ${className}`}
      title="نقر مزدوج للتعديل"
    >
      {value === 0 ? <span className="text-muted-foreground/40">0</span> : value.toLocaleString()}
    </span>
  );
};

interface SalaryBreakdownProps {
  orders: number;
  scheme: SchemeData | null;
  salary: number;
  children: ReactNode;
}

export const SalaryBreakdown = ({ orders, scheme, salary, children }: SalaryBreakdownProps) => {
  const [show, setShow] = useState(false);
  if (!scheme || orders === 0) return <>{children}</>;
  const tiers = scheme.salary_scheme_tiers || [];
  const explanationLines = getTierSalaryExplanationLines(
    orders,
    tiers.map((t) => ({
      from_orders: t.from_orders,
      to_orders: t.to_orders,
      price_per_order: t.price_per_order,
      tier_order: t.tier_order,
      tier_type: t.tier_type,
      incremental_threshold: t.incremental_threshold,
      incremental_price: t.incremental_price,
    })),
    scheme.target_orders ?? null,
    scheme.target_bonus ?? null,
  );
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full mb-1 right-0 z-50 bg-popover border border-border rounded-xl shadow-xl p-3 text-xs w-64 text-right" dir="rtl">
          <p className="font-bold text-foreground mb-2 border-b border-border/50 pb-1">{scheme.name}</p>
          <p className="text-muted-foreground mb-1">الطلبات: <span className="font-semibold text-foreground">{orders}</span></p>
          <div className="space-y-0.5 mb-2">
            {explanationLines.map((line) => (
              <p key={line} className="text-muted-foreground">{line}</p>
            ))}
          </div>
          <div className="border-t border-border/50 mt-2 pt-1 flex justify-between font-bold text-primary">
            <span>الإجمالي</span>
            <span>{salary.toLocaleString()} ر.س</span>
          </div>
        </div>
      )}
    </div>
  );
};

export type PlatformOrderCellProps = {
  rowId: string;
  platformName: string;
  tdClass: string;
  pc?: { cellBg: string; focusBorder: string };
  metric?: PlatformSalaryMetric;
  salary: number;
  scheme: SchemeData | null | undefined;
  editingCell: { rowId: string; platform: string } | null;
  setEditingCell: (value: { rowId: string; platform: string } | null) => void;
  updatePlatformOrders: (id: string, platform: string, value: number) => void;
};

export const PlatformOrderCell = ({
  rowId,
  platformName,
  tdClass,
  pc,
  metric,
  salary,
  scheme,
  editingCell,
  setEditingCell,
  updatePlatformOrders,
}: PlatformOrderCellProps) => {
  const primaryCount = getPrimaryPlatformActivityCount(metric);
  const ordersForScheme = metric?.ordersCount || 0;
  const target = scheme?.target_orders;
  const hitTarget = target && ordersForScheme >= target;
  const rowBg = getOrdersCellBackground(primaryCount, !!hitTarget, pc?.cellBg);
  const noScheme = ordersForScheme > 0 && scheme === null && metric?.workType === 'orders';
  const isEditing = editingCell?.rowId === rowId && editingCell?.platform === platformName;
  const isEditable = metric?.workType !== 'shift' && metric?.workType !== 'hybrid';
  const activitySummary = getPlatformActivitySummary(metric);
  const orders = primaryCount;

  const handleBlur = (value: number) => {
    updatePlatformOrders(rowId, platformName, value);
    setEditingCell(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
    if (e.key === 'Escape') setEditingCell(null);
  };

  let salaryMeta: ReactNode = null;
  if (salary > 0 || primaryCount > 0) {
    if (noScheme) {
      salaryMeta = (
        <span
          className="text-[10px] text-warning/90 font-medium"
          title="بدون سكيمة رواتب لهذه المنصة — راجع شريط التنبيه أعلى الصفحة"
        >
          —
        </span>
      );
    } else {
      salaryMeta = (
        <span className="text-[10px] text-foreground font-medium">
          {salary.toLocaleString()} ر.س
        </span>
      );
    }
  }

  return (
    <td
      key={`${platformName}-col`}
      className={`${tdClass} text-center border-l border-border/20`}
      style={{ background: noScheme ? 'rgba(234,179,8,0.1)' : rowBg }}
      title={activitySummary !== '—' ? activitySummary : undefined}
      onDoubleClick={() => {
        if (isEditable) setEditingCell({ rowId, platform: platformName });
      }}
    >
      {isEditing && isEditable ? (
        <input
          autoFocus
          type="number"
          defaultValue={ordersForScheme}
          className="w-16 text-center border rounded px-1 py-0.5 text-xs bg-background"
          style={{ borderColor: pc?.focusBorder }}
          onBlur={e => handleBlur(Number(e.target.value))}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <SalaryBreakdown orders={ordersForScheme} scheme={scheme || null} salary={salary}>
          <div className="flex flex-col items-center leading-tight">
            <span
              className={`font-semibold text-[11px] ${
                primaryCount === 0 && salary === 0 ? 'text-muted-foreground/30' : 'text-foreground'
              }`}
              title={isEditable ? 'نقر مزدوج للتعديل' : undefined}
            >
              {orders === 0 ? '—' : orders}
            </span>
            {salaryMeta}
          </div>
        </SalaryBreakdown>
      )}
    </td>
  );
};

export const CustomDeductionCell = ({
  row,
  fullKey,
  tdClass,
  updateRow,
}: {
  row: SalaryRow;
  fullKey: string;
  tdClass: string;
  updateRow: (id: string, patch: Partial<SalaryRow>) => void;
}) => {
  return (
    <td className={tdClass}>
      <EditableCell
        value={row.customDeductions?.[fullKey] || 0}
        onChange={(value) =>
          updateRow(row.id, { customDeductions: { ...row.customDeductions, [fullKey]: value } })
        }
        className="text-foreground"
      />
    </td>
  );
};
