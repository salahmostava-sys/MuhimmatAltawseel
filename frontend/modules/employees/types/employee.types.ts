import type { ComponentProps } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import EmployeeProfile from '@shared/components/employees/EmployeeProfile';
import type { EmployeeArabicRow } from '@shared/lib/employeeArabicTemplateImport';
import { validateImportRow } from '@modules/employees/model/employeeValidation';

const loadImportModule = () => import('@shared/lib/employeeArabicTemplateImport');
import type { Employee } from '@modules/employees/model/employeeUtils';
import { getEmployeeCities } from '@modules/employees/model/employeeUtils';
import { cityLabel } from '@modules/employees/model/employeeCity';

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

export const EMPTY_DATA_PLACEHOLDER = '•';

export const processBulkImportRows = async (
  buffer: ArrayBuffer,
  onProgress: (value: number) => void,
  onLiveStats: (stats: UploadLiveStats) => void,
): Promise<{ report: UploadReport; headerWarnings: number }> => {
  onProgress(10);
  const { parseEmployeeArabicWorkbook } = await loadImportModule();
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
  const BATCH_SIZE = 10;
  onLiveStats({ processedNames: 0, totalNames: validRows.length, currentName: '' });

  for (let batchStart = 0; batchStart < validRows.length; batchStart += BATCH_SIZE) {
    const batch = validRows.slice(batchStart, batchStart + BATCH_SIZE);
    const lastItem = batch[batch.length - 1];
    const currentName = String(lastItem.row.name ?? '').trim() || `سطر ${lastItem.rowIndex}`;
    onLiveStats({ processedNames: batchStart, totalNames: validRows.length, currentName });

    const { upsertEmployeeArabicRows } = await loadImportModule();
    const { processed, failures } = await upsertEmployeeArabicRows(batch.map((item) => item.row));
    successfulRows += processed;

    if (failures.length > 0) {
      for (const failure of failures) {
        // Map failure back to original row index when possible
        const failedItem = batch.find(
          (item) => String(item.row.name ?? '').trim() === (failure.name ?? '').trim(),
        );
        processingErrors.push({
          rowIndex: failedItem?.rowIndex ?? batch[0].rowIndex,
          issue: failure.error || 'تعذر حفظ السطر',
        });
      }
    }

    const batchEnd = Math.min(batchStart + BATCH_SIZE, validRows.length);
    const progress = 25 + Math.round((batchEnd / totalToProcess) * 70);
    onProgress(Math.min(progress, 95));
    onLiveStats({ processedNames: batchEnd, totalNames: validRows.length, currentName });
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
  { key: 'name',                     label: 'اسم الموظف',              sortable: true  },
  { key: 'name_en',                  label: 'الاسم (إنجليزي)',         sortable: true  },
  { key: 'national_id',              label: 'رقم الهوية',              sortable: true  },
  { key: 'job_title',                label: 'المسمى الوظيفي',          sortable: true  },
  { key: 'city',                     label: 'المدن',                   sortable: true  },
  { key: 'phone',                    label: 'رقم الهاتف',              sortable: true  },
  { key: 'nationality',              label: 'الجنسية',                 sortable: true  },
  { key: 'platform_apps',            label: 'المنصة',                  sortable: false },
  { key: 'commercial_record',        label: 'السجل التجاري',           sortable: true  },
  { key: 'sponsorship_status',       label: 'حالة الكفالة',            sortable: true  },
  { key: 'status',                   label: 'حالة الموظف',             sortable: true  },
  { key: 'join_date',                label: 'تاريخ الانضمام',          sortable: true  },
  { key: 'birth_date',               label: 'تاريخ الميلاد',           sortable: true  },
  { key: 'probation_end_date',       label: 'انتهاء فترة التجربة',     sortable: true  },
  { key: 'residency_combined',       label: 'الإقامة',                 sortable: true  },
  { key: 'health_insurance_expiry',  label: 'انتهاء التأمين الصحي',    sortable: true  },
  { key: 'license_status',           label: 'حالة الرخصة',             sortable: true  },
  { key: 'license_expiry',           label: 'انتهاء الرخصة',           sortable: true  },
  { key: 'bank_account_number',      label: 'رقم الحساب البنكي',       sortable: false },
  { key: 'email',                    label: 'البريد الإلكتروني',       sortable: false },
  { key: 'actions',                  label: 'الإجراءات',               sortable: false },
] as const;

export type ColKey = typeof ALL_COLUMNS[number]['key'];
export type ColumnDef = typeof ALL_COLUMNS[number];

export const DEFAULT_HIDDEN_COLS = new Set<ColKey>(['name_en', 'license_expiry']);
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
export const toCityLabel = (city?: string | null, fallback = EMPTY_DATA_PLACEHOLDER) => cityLabel(city, fallback);
export const employeeCitySummary = (
  employee: Pick<Employee, 'cities' | 'city'>,
  fallback = EMPTY_DATA_PLACEHOLDER,
) => {
  const values = getEmployeeCities(employee);
  if (values.length === 0) return fallback;
  return values.map((value) => toCityLabel(value, value)).join('، ');
};

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
