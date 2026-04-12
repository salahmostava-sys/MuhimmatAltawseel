import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';

type Props = Readonly<{
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  filteredCount: number;
}>;

export function EmployeeTablePagination({ page, setPage, pageSize, setPageSize, totalPages, filteredCount }: Props) {
  if (filteredCount === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border/30 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">عرض:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
        >
          <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">لكل صفحة</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {Math.min((page - 1) * pageSize + 1, filteredCount)}–{Math.min(page * pageSize, filteredCount)} من {filteredCount}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(1)} disabled={page === 1}>«</Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronRight size={12} /></Button>
          <span className="text-xs text-muted-foreground px-2 min-w-[70px] text-center">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}><ChevronLeft size={12} /></Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>»</Button>
        </div>
      </div>
    </div>
  );
}
