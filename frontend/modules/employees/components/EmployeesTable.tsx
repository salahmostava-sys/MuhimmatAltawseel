import React from 'react';
import { Button } from '@shared/components/ui/button';
import { Skeleton } from '@shared/components/ui/skeleton';

type FastRow = {
  id: string;
  name: string;
  national_id: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  residency_expiry: string | null;
};

const FAST_SKELETON_IDS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'];

type EmployeesTableProps = Readonly<{
  rows: FastRow[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  tableRef: React.RefObject<HTMLTableElement | null>;
  toCityLabel: (city?: string | null, fallback?: string) => string;
  onPageChange: (p: number) => void;
}>;

export function EmployeesTable({
  rows,
  total,
  page,
  totalPages,
  isLoading,
  tableRef,
  toCityLabel,
  onPageChange,
}: EmployeesTableProps) {
  let body: React.ReactNode;
  if (isLoading) {
    body = FAST_SKELETON_IDS.map((id) => (
      <tr key={`employees-table-skeleton-${id}`}>
        <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-48" /></td>
        <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-28" /></td>
        <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-24" /></td>
        <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-16" /></td>
        <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-28" /></td>
        <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-16" /></td>
      </tr>
    ));
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td colSpan={6} className="py-10 text-center text-muted-foreground">لا توجد نتائج</td>
      </tr>
    );
  } else {
    body = rows.map((row) => (
      <tr key={row.id} className="transition-colors hover:bg-muted/30">
        <td className="px-4 py-3 text-center font-semibold">{row.name}</td>
        <td className="px-4 py-3 text-center text-xs tabular-nums">{row.national_id ?? '•'}</td>
        <td className="px-4 py-3 text-center text-xs tabular-nums">{row.phone ?? '•'}</td>
        <td className="px-4 py-3 text-center">{toCityLabel(row.city, '•')}</td>
        <td className="px-4 py-3 text-center">
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{row.status}</span>
        </td>
        <td className="px-4 py-3 text-center text-xs tabular-nums">{row.residency_expiry ?? '•'}</td>
      </tr>
    ));
  }

  return (
    <div className="ds-card overflow-hidden">
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full text-center align-middle text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-center font-semibold">الاسم</th>
              <th className="px-4 py-3 text-center font-semibold">رقم الهوية</th>
              <th className="px-4 py-3 text-center font-semibold">الهاتف</th>
              <th className="px-4 py-3 text-center font-semibold">المدينة</th>
              <th className="px-4 py-3 text-center font-semibold">الحالة</th>
              <th className="px-4 py-3 text-center font-semibold">انتهاء الإقامة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{body}</tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
        <div className="text-muted-foreground">{total.toLocaleString()} نتيجة</div>
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
  );
}

