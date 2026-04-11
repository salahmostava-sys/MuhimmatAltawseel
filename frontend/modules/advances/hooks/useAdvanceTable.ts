import { useMemo, useRef, useState, useCallback, type ChangeEvent } from 'react';
import { format } from 'date-fns';
import { applyFilters } from '@shared/lib/filterUtils';
import type { FilterState } from '@shared/hooks/useAdvancedFilter';
import { useToast } from '@shared/hooks/use-toast';
import { logError } from '@shared/lib/logger';
import { printHtmlTable } from '@shared/lib/printTable';
import { ADVANCE_IO_COLUMNS } from '@shared/constants/excelSchemas';
import { advanceService } from '@services/advanceService';
import type { Advance, EmployeeSummary } from '@modules/advances/types/advance.types';
import { calcPaid, calcPending } from '@modules/advances/types/advance.types';

import { loadXlsx } from '@modules/orders/utils/xlsx';

export function useAdvanceTable(
  advances: Advance[],
  employees: { id: string; name: string; national_id?: string | null; sponsorship_status?: string | null }[],
  search: string,
  statusFilter: string,
  showWrittenOff: boolean,
  filters: FilterState,
  refetchAdvancesData: () => void,
  deleteEmployeeAdvancesId: string | null,
  setDeleteEmployeeAdvancesId: (v: string | null) => void,
  setDeletingEmployeeAdvances: (v: boolean) => void
) {
  const { toast } = useToast();
  const importRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const abscondedWithDebt = useMemo(() => {
    return employees
      .filter(e => e.sponsorship_status === 'absconded')
      .map(emp => {
        const empAdvances = advances.filter(a => a.employee_id === emp.id && !a.is_written_off && a.status === 'active');
        const remaining = empAdvances.reduce((sum, adv) => {
          const installments = adv.advance_installments || [];
          const pending = calcPending(installments);
          const paid = calcPaid(installments);
          const fallback = Math.max(adv.amount - paid, 0);
          return sum + (installments.length > 0 ? pending : fallback);
        }, 0);
        const activeIds = empAdvances.map(a => a.id);
        return remaining > 0 ? { ...emp, remaining, activeIds } : null;
      })
      .filter(Boolean) as { id: string; name: string; remaining: number; activeIds: string[] }[];
  }, [employees, advances]);

  const employeeSummaries = useMemo(() => {
    const map = new Map<string, EmployeeSummary>();
    advances.forEach(adv => {
      const empId = adv.employee_id;
      const empName = adv.employees?.name || '—';
      const nationalId = adv.employees?.national_id || '—';
      const installments = adv.advance_installments || [];
      const paid = calcPaid(installments);
      const pending = calcPending(installments);
      const remaining = installments.length > 0 ? pending : Math.max(adv.amount - paid, 0);
      if (!map.has(empId)) {
        map.set(empId, { employeeId: empId, employeeName: empName, nationalId, totalDebt: 0, totalPaid: 0, remaining: 0, activeAdvances: [], allAdvances: [], isWrittenOff: false, latestDisbursementDate: '' });
      }
      const entry = map.get(empId);
      if (!entry) return;
      const disb = adv.disbursement_date || '';
      if (disb && disb > entry.latestDisbursementDate) entry.latestDisbursementDate = disb;
      entry.totalDebt += adv.amount;
      entry.totalPaid += paid;
      entry.remaining += remaining;
      entry.allAdvances.push(adv);
      if (adv.status === 'active') entry.activeAdvances.push(adv);
      if (adv.is_written_off) entry.isWrittenOff = true;
    });
    return Array.from(map.values());
  }, [advances]);

  const filtered = useMemo(() => {
    let result = employeeSummaries.filter(s => {
      if (showWrittenOff) return s.isWrittenOff;
      if (s.isWrittenOff) return false;
      const matchSearch = s.employeeName.includes(search) || s.nationalId.includes(search);
      const matchStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && s.activeAdvances.length > 0) ||
        (statusFilter === 'completed' && s.activeAdvances.length === 0 && s.allAdvances.length > 0) ||
        (statusFilter === 'has_debt' && s.remaining > 0);
      return matchSearch && matchStatus;
    });
    if (sortField) {
      result = [...result].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortField];
        const bVal = (b as Record<string, unknown>)[sortField];
        let cmp: number;
        if (typeof aVal === 'string' && typeof bVal === 'string') cmp = aVal.localeCompare(bVal);
        else cmp = ((aVal as number) ?? 0) - ((bVal as number) ?? 0);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return applyFilters(result as unknown as Record<string, unknown>[], filters, { date_range: 'latestDisbursementDate' }) as unknown as typeof result;
  }, [employeeSummaries, search, statusFilter, sortField, sortDir, showWrittenOff, filters]);

  const grandTotals = useMemo(() => ({
    count: filtered.length,
    totalDebt: filtered.reduce((s, e) => s + e.totalDebt, 0),
    totalPaid: filtered.reduce((s, e) => s + e.totalPaid, 0),
    remaining: filtered.reduce((s, e) => s + e.remaining, 0),
  }), [filtered]);

  const writtenOffTotals = useMemo(() => {
    const wo = employeeSummaries.filter(s => s.isWrittenOff);
    return { count: wo.length, remaining: wo.reduce((s, e) => s + e.remaining, 0) };
  }, [employeeSummaries]);

  const fetchAll = useCallback(() => { void refetchAdvancesData(); }, [refetchAdvancesData]);

  const handleImportAdvances = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void (async () => {
      const XLSX = await loadXlsx();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const wb = XLSX.read(bytes, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
      if (matrix.length < 2) return toast({ title: 'الملف فارغ', variant: 'destructive' });
      const expectedHeaders = ADVANCE_IO_COLUMNS.map((c) => c.label);
      const actualHeaders = (matrix[0] || []).map((h) => String(h ?? '').trim());
      const headersMatch =
        actualHeaders.length === expectedHeaders.length &&
        actualHeaders.every((h, i) => h === expectedHeaders[i]);
      if (!headersMatch) {
        toast({
          title: 'هيكل الأعمدة غير مطابق للقالب',
          description: 'تأكد من استخدام القالب كما هو',
          variant: 'destructive',
        });
        return;
      }
      const rows = matrix.slice(1).map((line) => {
        const values = Array.isArray(line) ? line : [];
        const row: Record<string, unknown> = {};
        ADVANCE_IO_COLUMNS.forEach((column, idx) => {
          row[column.key] = values[idx];
        });
        return row;
      });
      let success = 0;
      for (const row of rows) {
        const empName = row.name;
        if (!empName) continue;
        const emp = employees.find(e => e.name === empName);
        if (!emp) continue;
        const amount = Number.parseFloat(String(row.amount ?? '')) || 0;
        const monthly = Number.parseFloat(String(row.monthly_amount ?? '')) || amount;
        const installments = monthly > 0 ? Math.ceil(amount / monthly) : 1;
        await advanceService.create({
          employee_id: emp.id, amount, monthly_amount: monthly, total_installments: installments,
          disbursement_date: String(row.disbursement_date || '') || format(new Date(), 'yyyy-MM-dd'),
          first_deduction_month: String(row.first_deduction_month || '') || format(new Date(), 'yyyy-MM'),
          status: 'active',
        });
        success++;
      }
      toast({ title: `تم استيراد ${success} سلفة ✅` });
      fetchAll();
    })();
    e.target.value = '';
  }, [employees, toast, fetchAll]);

  const handleExport = useCallback(async () => {
    const XLSX = await loadXlsx();
    const filteredEmployeeIds = new Set(filtered.map((s) => s.employeeId));
    const exportedAdvances = advances.filter((adv) => filteredEmployeeIds.has(adv.employee_id));
    const headerRow = ADVANCE_IO_COLUMNS.map((c) => c.label);
    const rows = exportedAdvances.map((adv) => {
      const employeeName = adv.employees?.name || '';
      return [
        employeeName,
        adv.amount,
        adv.monthly_amount,
        adv.disbursement_date || '',
        adv.first_deduction_month || '',
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'السلف');
    XLSX.writeFile(wb, `السلف_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }, [filtered, advances]);

  const handleTemplate = useCallback(async () => {
    const XLSX = await loadXlsx();
    const ws = XLSX.utils.aoa_to_sheet([ADVANCE_IO_COLUMNS.map((c) => c.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قالب السلف');
    XLSX.writeFile(wb, 'template_advances.xlsx');
  }, []);

  const handlePrintTable = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;
    printHtmlTable(table, {
      title: 'تقرير السلف',
      subtitle: `المجموع: ${filtered.length} مندوب — ${new Date().toLocaleDateString('ar-SA')}`,
    });
  }, [filtered]);

  const handleDeleteEmployeeAllAdvances = useCallback(async () => {
    if (!deleteEmployeeAdvancesId) return;
    setDeletingEmployeeAdvances(true);
    try {
      const empAdvIds = advances.filter(a => a.employee_id === deleteEmployeeAdvancesId).map(a => a.id);
      if (empAdvIds.length > 0) {
        await advanceService.deleteMany(empAdvIds);
      }
      toast({ title: '✅ تم حذف جميع سلف المندوب' });
      setDeleteEmployeeAdvancesId(null);
      fetchAll();
    } catch (e) {
      logError('[Advances] bulk add failed', e);
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
      toast({ title: 'خطأ في الحذف', description: message, variant: 'destructive' });
    } finally {
      setDeletingEmployeeAdvances(false);
    }
  }, [deleteEmployeeAdvancesId, advances, toast, fetchAll, setDeleteEmployeeAdvancesId, setDeletingEmployeeAdvances]);

  return {
    importRef,
    tableRef,
    sortField,
    sortDir,
    handleSort,
    abscondedWithDebt,
    employeeSummaries,
    filtered,
    grandTotals,
    writtenOffTotals,
    fetchAll,
    handleImportAdvances,
    handleExport,
    handleTemplate,
    handlePrintTable,
    handleDeleteEmployeeAllAdvances,
  };
}
