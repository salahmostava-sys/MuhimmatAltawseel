import { useRef, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@shared/components/ui/button';
import { ClipboardCheck, CalendarDays, FolderOpen } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@shared/components/ui/dropdown-menu';
import DailyAttendance from '@shared/components/attendance/DailyAttendance';
import MonthlyRecord from '@shared/components/attendance/MonthlyRecord';
import { useLanguage } from '@app/providers/LanguageContext';
import { useTranslation } from 'react-i18next';
let _xlsxCache: Promise<typeof import('@e965/xlsx')> | null = null;
const loadXlsx = () => { if (!_xlsxCache) _xlsxCache = import('@e965/xlsx'); return _xlsxCache; };
import { printHtmlTable } from '@shared/lib/printTable';
import attendanceService from '@services/attendanceService';
import { useToast } from '@shared/hooks/use-toast';
import { useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { Loader2 } from 'lucide-react';

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

import { useTemporalContext } from '@app/providers/TemporalContext';

const ATT_TABS = ['daily', 'monthly'] as const;
type AttTab = (typeof ATT_TABS)[number];
const isAttTab = (v: string | null): v is AttTab =>
  v !== null && ATT_TABS.includes(v as AttTab);

const Attendance = () => {
  useAuthQueryGate();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const { selectedMonth: globalMonth } = useTemporalContext();
  const MONTHS = MONTHS_AR;
  const importRef = useRef<HTMLInputElement>(null);
  const dailyTableRef = useRef<HTMLDivElement>(null);
  const monthlyTableRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);

  // Selected date is now derived from Global Temporal Context (YYYY-MM)
  const [yearStr, monthStr] = globalMonth.split('-');
  const selectedYear = yearStr;
  const selectedMonth = String(Number(monthStr) - 1); // 0-indexed for existing components

  const tab = useMemo(() => {
    const v = searchParams.get('tab');
    if (v === 'archive') return 'daily';
    return isAttTab(v) ? v : 'daily';
  }, [searchParams]);

  const onTabChange = useCallback(
    (v: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === 'daily') next.delete('tab');
          else next.set('tab', v);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleExportAttendance = async () => {
    try {
      toast({ title: 'جاري التحميل...' });
      const year = Number(selectedYear);
      const month = Number(selectedMonth);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const records = await attendanceService.getAttendanceStatusRange(startDate, endDate);

      const data = records.map((r: { employee_name?: string; date: string; status: string; notes?: string }) => ({
        'الموظف': r.employee_name || '—',
        'التاريخ': r.date,
        'الحالة': r.status,
        'ملاحظات': r.notes || '',
      }));

      const XLSX = await loadXlsx();
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الحضور');
      XLSX.writeFile(wb, `attendance_${selectedYear}-${String(month + 1).padStart(2, '0')}.xlsx`);
      toast({ title: 'تم التصدير بنجاح' });
    } catch {
      toast({ title: 'فشل التصدير', description: 'تعذر تحميل بيانات الحضور', variant: 'destructive' });
    }
  };

  const handleAttendanceTemplate = async () => {
    const XLSX = await loadXlsx();
    const headers = [['اسم الموظف', 'التاريخ (YYYY-MM-DD)', 'الحالة (present/absent/leave/sick/late)', 'ملاحظات']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قالب');
    XLSX.writeFile(wb, 'template_attendance.xlsx');
  };

  const handleImportAttendance = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

      // Skip header row and process data
      const rows = json.slice(1).filter((row: string[]) => row[0] && row[1]);
      let imported = 0;
      let failed = 0;

      // TODO: employeeName is passed as employee_id — this is a known limitation.
      // The backend service should resolve employee name to ID, or we should look up
      // the employee ID from an employees list. For now, we send the name and rely
      // on backend resolution, with graceful error handling per row.
      // Use Promise.allSettled for parallel execution instead of sequential await
      const results = await Promise.allSettled(
        rows.map(async (row) => {
          const [employeeName, date, status, notes] = row;
          if (!employeeName || !date || !status) {
            throw new Error('missing-fields');
          }
          await attendanceService.upsertDailyAttendance({
            employee_id: employeeName, // TODO: Known limitation — should be resolved to actual ID
            date,
            status: status.toLowerCase() as 'present' | 'absent' | 'leave' | 'sick' | 'late',
            check_in: '',
            check_out: '',
            note: notes || '',
          });
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') imported++;
        else failed++;
      }

      toast({
        title: 'تم الاستيراد',
        description: `${imported} سجل ناجح، ${failed} فاشل`,
        variant: failed > 0 ? 'destructive' : 'default',
      });
    } catch {
      toast({ title: 'فشل الاستيراد', description: 'تعذر قراءة الملف', variant: 'destructive' });
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset input
    }
  };

  const handlePrintTable = () => {
    const tableRef = tab === 'daily' ? dailyTableRef : monthlyTableRef;
    const table = tableRef.current?.querySelector('table');
    if (!table) {
      toast({ title: 'لا يوجد جدول للطباعة' });
      return;
    }
    printHtmlTable(table, { title: tab === 'daily' ? 'سجل الحضور اليومي' : 'السجل الشهري' });
  };

  return (
    <div className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <nav className="page-breadcrumb">
            <span>الرئيسية</span>
            <span className="page-breadcrumb-sep">/</span>
            <span>{t('attendance')}</span>
          </nav>
          <h1 className="page-title">{t('attendance')}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 px-3 border border-border/50 text-[11px] font-bold text-muted-foreground ms-1">
            <CalendarDays size={13} className="me-1.5 text-primary/70" />
            <span>فترة: {MONTHS[Number(selectedMonth)]} {selectedYear}</span>
          </div>

          <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5" role="tablist">
            <Button
              type="button"
              variant={tab === 'daily' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 px-2.5 text-xs"
              onClick={() => onTabChange('daily')}
            >
              <ClipboardCheck size={14} />
              التسجيل اليومي
            </Button>
            <Button
              type="button"
              variant={tab === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 px-2.5 text-xs"
              onClick={() => onTabChange('monthly')}
            >
              <CalendarDays size={14} />
              السجل الشهري
            </Button>
          </div>

          <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportAttendance} disabled={importing} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <FolderOpen size={14} />
                ملفات
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportAttendance}>
                📊 تصدير Excel (ملخص شهري)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAttendanceTemplate}>
                📋 تحميل قالب الاستيراد
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => importRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 size={14} className="animate-spin ml-1" /> : '⬆️'} استيراد Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrintTable}>🖨️ طباعة الجدول</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-2">
        {tab === 'daily' ? (
          <div ref={dailyTableRef}>
            <DailyAttendance selectedMonth={Number(selectedMonth)} selectedYear={Number(selectedYear)} />
          </div>
        ) : (
          <div ref={monthlyTableRef}>
            <MonthlyRecord selectedMonth={Number(selectedMonth)} selectedYear={Number(selectedYear)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
