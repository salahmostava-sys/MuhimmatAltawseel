import { useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@shared/components/ui/button';
import { ClipboardCheck, CalendarDays, FolderOpen } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@shared/components/ui/dropdown-menu';
import DailyAttendance from '@shared/components/attendance/DailyAttendance';
import MonthlyRecord from '@shared/components/attendance/MonthlyRecord';
import { useLanguage } from '@app/providers/LanguageContext';
import { useTranslation } from 'react-i18next';
import * as XLSX from '@e965/xlsx';
import { printHtmlTable } from '@shared/lib/printTable';

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
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const { selectedMonth: globalMonth } = useTemporalContext();
  const MONTHS = MONTHS_AR;
  const importRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

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

  const handleExportAttendance = () => {
    const ws = XLSX.utils.json_to_sheet([{ 'Note': `Attendance — ${MONTHS[Number(selectedMonth)]} ${selectedYear}` }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الحضور');
    XLSX.writeFile(wb, `attendance_${selectedYear}-${String(Number(selectedMonth) + 1).padStart(2, '0')}.xlsx`);
  };

  const handleAttendanceTemplate = () => {
    const headers = [['اسم الموظف', 'التاريخ (YYYY-MM-DD)', 'الحالة (present/absent/leave/sick/late)', 'ملاحظات']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قالب');
    XLSX.writeFile(wb, 'template_attendance.xlsx');
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
          <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 px-3 border border-border/50 text-[11px] font-bold text-muted-foreground mr-1">
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

          <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" />
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
              <DropdownMenuItem onClick={() => importRef.current?.click()}>⬆️ استيراد Excel</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                const table = document.querySelector('table');
                if (!(table instanceof HTMLTableElement)) return;
                printHtmlTable(table, { title: 'سجل الحضور' });
              }}>🖨️ طباعة الجدول</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-2">
        {tab === 'daily' ? (
          <DailyAttendance selectedMonth={Number(selectedMonth)} selectedYear={Number(selectedYear)} />
        ) : (
          <MonthlyRecord selectedMonth={Number(selectedMonth)} selectedYear={Number(selectedYear)} />
        )}
      </div>
    </div>
  );
};

export default Attendance;
