import type { FilterConfig } from '@shared/hooks/useAdvancedFilter';

/** قيم sponsorship_status كما في الجدول وواجهة الموظفين (وليس on_kafala القديمة) */
export const EMPLOYEES_FILTERS: FilterConfig[] = [
  {
    key: 'kafala_status', label: 'حالة الكفالة',
    type: 'multi_select',
    defaultValues: ['sponsored', 'not_sponsored'],
    options: [
      { value: 'sponsored',      label: 'على الكفالة' },
      { value: 'not_sponsored',  label: 'ليس على الكفالة' },
      { value: 'absconded',      label: 'هروب' },
      { value: 'terminated',     label: 'انتهاء الخدمة' },
    ],
  },
  {
    key: 'branch', label: 'الفرع',
    type: 'multi_select', defaultValues: [],
    options: [
      { value: 'makkah', label: 'مكة' },
      { value: 'jeddah', label: 'جدة' },
    ],
  },
];

export const SALARIES_FILTERS: FilterConfig[] = [
  {
    key: 'salary_status', label: 'حالة الراتب',
    type: 'multi_select',
    defaultValues: ['pending', 'paid'],
    options: [
      { value: 'pending', label: 'لم يُصرف' },
      { value: 'paid',    label: 'تم الصرف' },
      { value: 'partial', label: 'جزئي' },
    ],
  },
];

/** فلتر السلف: يُعرَض في صف تحت رؤوس الجدول (تاريخ الصرف فقط — حالة السلف من الأزرار أعلى الجدول) */
export const ADVANCES_FILTERS: FilterConfig[] = [
  {
    key: 'date_range',
    label: 'تاريخ الصرف',
    type: 'date_range',
  },
];

export const FUEL_FILTERS: FilterConfig[] = [
  {
    key: 'km_range',
    label: 'نطاق الكيلومترات',
    type: 'number_range',
  },
];

export const VIOLATIONS_FILTERS: FilterConfig[] = [
  {
    key: 'status', label: 'الحالة',
    type: 'multi_select',
    defaultValues: ['open'],
    options: [
      { value: 'open',     label: 'مفتوحة' },
      { value: 'resolved', label: 'محلولة' },
      { value: 'disputed', label: 'متنازع عليها' },
    ],
  },
];
