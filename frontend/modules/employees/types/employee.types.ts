import type { ComponentProps } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import EmployeeProfile from '@shared/components/employees/EmployeeProfile';
import {
  parseEmployeeArabicWorkbook,
  type EmployeeArabicRow,
  upsertEmployeeArabicRows,
} from '@shared/lib/employeeArabicTemplateImport';
import { validateImportRow } from '@modules/employees/model/employeeValidation';
import type { Employee } from '@modules/employees/model/employeeUtils';

export type { Employee } from '@modules/employees/model/employeeUtils';
export type { SortDir } from '@modules/employees/model/employeeUtils';

export type SortField = keyof Employee | 'days_residency' | 'residency_status';
export type EmployeeProfileProps = ComponentProps<typeof EmployeeProfile>;
export type EmployeeStatusFilter = 'all' | 'active' | 'inactive' | 'ended';

export type UploadReport = {
  totalProcessed: number;
  successfulRows: number;
  failedRows: number;
  errors: Array<{ rowIndex: number; issue: string }>;
};

export type UploadLiveStats = {
  processedNames: number;
  totalNames: number;
  currentName: string;
};

export const processBulkImportRows = async (
  buffer: ArrayBuffer,
  onProgress: (value: number) => void,
  onLiveStats: (stats: UploadLiveStats) => void,
): Promise<{ report: UploadReport; headerWarnings: number }> => {
  onProgress(10);
  const { rows, headerErrors } = parseEmployeeArabicWorkbook(buffer);
  if (rows.length === 0) {
    return {
      report: {
        totalProcessed: 0,
        successfulRows: 0,
        failedRows: 0,
        errors: [{ rowIndex: 1, issue: 'الملف لا يحتوي على بيانات صالحة للمعالجة' }],
      },
      headerWarnings: headerErrors.length,
    };
  }

  const validationErrors: Array<{ rowIndex: number; issue: string }> = [];
  const validRows: Array<{ rowIndex: number; row: EmployeeArabicRow }> = [];

  if (headerErrors.length > 0) {
    headerErrors.forEach((err) => validationErrors.push({ rowIndex: 1, issue: err }));
  }

  rows.forEach((row, idx) => {
    const rowIndex = idx + 2;
    const rowIssues = validateImportRow(row, rowIndex);
    if (rowIssues.length > 0) validationErrors.push(...rowIssues);
    else validRows.push({ rowIndex, row });
  });

  onProgress(25);

  let successfulRows = 0;
  const processingErrors: Array<{ rowIndex: number; issue: string }> = [];
  const totalToProcess = Math.max(validRows.length, 1);
  onLiveStats({ processedNames: 0, totalNames: validRows.length, currentName: '' });

  for (let i = 0; i < validRows.length; i++) {
    const item = validRows[i];
    const currentName = String(item.row.name ?? '').trim() || `سطر ${item.rowIndex}`;
    onLiveStats({ processedNames: i, totalNames: validRows.length, currentName });
    const { processed, failures } = await upsertEmployeeArabicRows([item.row]);
    if (processed > 0) successfulRows++;
    if (failures.length > 0) {
      processingErrors.push({
        rowIndex: item.rowIndex,
        issue: failures[0]?.error || 'تعذر حفظ السطر',
      });
    }
    const progress = 25 + Math.round(((i + 1) / totalToProcess) * 70);
    onProgress(Math.min(progress, 95));
    onLiveStats({ processedNames: i + 1, totalNames: validRows.length, currentName });
  }

  const report: UploadReport = {
    totalProcessed: rows.length,
    successfulRows,
    failedRows: rows.length - successfulRows,
    errors: [...validationErrors, ...processingErrors],
  };

  return { report, headerWarnings: headerErrors.length };
};

export const ALL_COLUMNS = [
  { key: 'seq',                      label: 'م',                       sortable: false },
  { key: 'employee_code',            label: 'الكود',                   sortable: true  },
  { key: 'name',                     label: 'اسم الموظف',              sortable: true  },
  { key: 'name_en',                  label: 'الاسم (إنجليزي)',         sortable: true  },
  { key: 'national_id',              label: 'رقم الهوية',              sortable: true  },
  { key: 'job_title',                label: 'المسمى الوظيفي',          sortable: true  },
  { key: 'city',                     label: 'المدينة',                 sortable: true  },
  { key: 'phone',                    label: 'رقم الهاتف',              sortable: true  },
  { key: 'nationality',              label: 'الجنسية',                 sortable: true  },
  { key: 'status',                   label: 'الحالة',                  sortable: true  },
  { key: 'sponsorship_status',       label: 'حالة الكفالة',            sortable: true  },
  { key: 'join_date',                label: 'تاريخ الانضمام',          sortable: true  },
  { key: 'birth_date',               label: 'تاريخ الميلاد',           sortable: true  },
  { key: 'probation_end_date',       label: 'انتهاء فترة التجربة',     sortable: true  },
  { key: 'residency_expiry',         label: 'انتهاء الإقامة',          sortable: true  },
  { key: 'days_residency',           label: 'المتبقي (يوم)',           sortable: true  },
  { key: 'residency_status',         label: 'حالة الإقامة',            sortable: false },
  { key: 'health_insurance_expiry',  label: 'انتهاء التأمين الصحي',   sortable: true  },
  { key: 'license_status',           label: 'حالة الرخصة',             sortable: true  },
  { key: 'license_expiry',           label: 'انتهاء الرخصة',           sortable: true  },
  { key: 'bank_account_number',      label: 'رقم الحساب البنكي',      sortable: false },
  { key: 'iban',                     label: 'IBAN',                    sortable: false },
  { key: 'email',                    label: 'البريد الإلكتروني',       sortable: false },
  { key: 'actions',                  label: 'الإجراءات',               sortable: false },
] as const;

export type ColKey = typeof ALL_COLUMNS[number]['key'];
export type ColumnDef = typeof ALL_COLUMNS[number];

export const DEFAULT_HIDDEN_COLS = new Set<ColKey>(['name_en', 'iban', 'license_expiry']);
export const GRID_SKELETON_IDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];
export const FAST_SKELETON_IDS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'];

export const calcResidency = (expiry?: string | null) => {
  if (!expiry) return { days: null as number | null, status: 'unknown' as const };
  const days = differenceInDays(parseISO(expiry), new Date());
  const status = days >= 0 ? 'valid' : 'expired';
  return { days, status };
};

export const CITY_LABELS: Record<string, string> = { makkah: 'مكة', jeddah: 'جدة' };
export const STATUS_LABELS: Record<string, string> = { active: 'نشط', inactive: 'غير نشط', ended: 'منتهي' };
export const SPONSORSHIP_LABELS: Record<string, string> = {
  sponsored: 'على الكفالة',
  not_sponsored: 'ليس على الكفالة',
  absconded: 'هروب',
  terminated: 'انتهاء الخدمة',
};
export const LICENSE_LABELS: Record<string, string> = {
  has_license: 'لديه رخصة',
  no_license: 'ليس لديه رخصة',
  applied: 'تم التقديم',
};
export const toCityLabel = (city?: string | null, fallback = '—') => CITY_LABELS[city || ''] || fallback;

export const dayColorByThreshold = (days: number | null): string => {
  if (days === null) return '';
  if (days < 0) return 'text-destructive font-bold';
  if (days <= 30) return 'text-warning font-medium';
  if (days <= 60) return 'text-amber-500';
  return 'text-success';
};

export const residencyStatusLabel = (status: 'valid' | 'expired' | 'unknown'): string => {
  if (status === 'valid') return 'صالحة';
  if (status === 'expired') return 'منتهية';
  return '';
};

export const probationColor = (days: number): string => {
  if (days < 0) return 'text-muted-foreground';
  if (days <= 7) return 'text-destructive';
  if (days <= 30) return 'text-warning';
  return 'text-success';
};
