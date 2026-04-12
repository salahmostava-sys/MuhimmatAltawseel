import type { ComponentProps } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import EmployeeProfile from '@shared/components/employees/EmployeeProfile';
import type { Employee } from '@modules/employees/model/employeeUtils';
import { getEmployeeCities } from '@modules/employees/model/employeeUtils';
import { cityLabel } from '@modules/employees/model/employeeCity';

// Re-export from lib for backward compatibility
export { processBulkImportRows } from '@modules/employees/lib/employeeImport';

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
