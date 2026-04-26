export type SlipLanguage = 'ar' | 'en';

export const LANGUAGE_META: Record<SlipLanguage, { label: string; dir: 'rtl' | 'ltr'; flag: string; fontFamily: string }> = {
  ar: { label: 'العربية', dir: 'rtl', flag: 'SA', fontFamily: 'Arial, sans-serif' },
  en: { label: 'English', dir: 'ltr', flag: 'GB', fontFamily: 'Arial, sans-serif' },
};

export interface SlipTranslations {
  title: string;
  subtitle: string;
  sectionEmployee: string;
  name: string;
  nationalId: string;
  city: string;
  month: string;
  status: string;
  paymentMethod: string;
  statusPending: string;
  statusApproved: string;
  statusPaid: string;
  payBank: string;
  payCash: string;
  sectionPlatforms: string;
  orders: string;
  platformTotal: string;
  sectionAdditions: string;
  incentives: string;
  sickAllowance: string;
  totalWithSalary: string;
  sectionEarnings: string;
  sectionDeductions: string;
  advanceInstallment: string;
  externalDeductions: string;
  violations: string;
  walletHunger: string;
  walletTuyo: string;
  walletJahiz: string;
  foodDamage: string;
  totalDeductions: string;
  netSalary: string;
  transfer: string;
  remaining: string;
  advanceBalance: string;
  signatureDriver: string;
  signatureAdmin: string;
  currency: string;
  printPdf: string;
  approve: string;
  close: string;
}

const SLIP_KEYS: readonly (keyof SlipTranslations)[] = [
  'title',
  'subtitle',
  'sectionEmployee',
  'name',
  'nationalId',
  'city',
  'month',
  'status',
  'paymentMethod',
  'statusPending',
  'statusApproved',
  'statusPaid',
  'payBank',
  'payCash',
  'sectionPlatforms',
  'orders',
  'platformTotal',
  'sectionAdditions',
  'incentives',
  'sickAllowance',
  'totalWithSalary',
  'sectionEarnings',
  'sectionDeductions',
  'advanceInstallment',
  'externalDeductions',
  'violations',
  'walletHunger',
  'walletTuyo',
  'walletJahiz',
  'foodDamage',
  'totalDeductions',
  'netSalary',
  'transfer',
  'remaining',
  'advanceBalance',
  'signatureDriver',
  'signatureAdmin',
  'currency',
  'printPdf',
  'approve',
  'close',
];

const toSlipTranslations = (values: readonly string[]): SlipTranslations => {
  if (values.length !== SLIP_KEYS.length) {
    throw new Error(`salarySlipTranslations: expected ${SLIP_KEYS.length} values, got ${values.length}`);
  }
  const out = {} as Record<keyof SlipTranslations, string>;
  SLIP_KEYS.forEach((key, idx) => {
    out[key] = values[idx];
  });
  return out as SlipTranslations;
};

const translations: Record<SlipLanguage, SlipTranslations> = {
  ar: toSlipTranslations([
    'كشف راتب',
    'نظام إدارة التوصيل',
    'بيانات المندوب',
    'الاسم',
    'رقم الهوية',
    'المدينة',
    'الشهر',
    'الحالة',
    'طريقة الصرف',
    'معلّق',
    'معتمد',
    'مصروف',
    'تحويل بنكي',
    'كاش',
    'الطلبات حسب المنصة',
    'طلب',
    'إجمالي الراتب الأساسي',
    'الإضافات',
    'الحوافز',
    'بدل مرضي',
    'المجموع مع الراتب',
    'الاستحقاقات',
    'المستقطعات',
    'قسط سلفة',
    'خصومات خارجية',
    'المخالفات',
    'محفظة هنقرستيشن',
    'محفظة تويو',
    'محفظة جاهز',
    'تلف طعام',
    'إجمالي المستقطعات',
    'إجمالي الراتب الصافي',
    'التحويل',
    'المتبقي',
    'رصيد السلفة المتبقي',
    'توقيع المندوب',
    'اعتماد الإدارة',
    'ر.س',
    'طباعة PDF',
    'اعتماد',
    'إغلاق',
  ]),
  en: toSlipTranslations([
    'Salary Slip',
    'Delivery Management System',
    'Employee Information',
    'Name',
    'ID Number',
    'City',
    'Month',
    'Status',
    'Payment Method',
    'Pending',
    'Approved',
    'Paid',
    'Bank Transfer',
    'Cash',
    'Orders by Platform',
    'orders',
    'Total Base Salary',
    'Additions',
    'Incentives',
    'Sick Leave Allowance',
    'Total with Salary',
    'Earnings',
    'Deductions',
    'Advance Installment',
    'External Deductions',
    'Violations',
    'HungerStation Wallet',
    'Tuyo Wallet',
    'Jahiz Wallet',
    'Food Damage',
    'Total Deductions',
    'Net Salary',
    'Transfer',
    'Remaining',
    'Remaining Advance Balance',
    "Driver's Signature",
    'Management Approval',
    'SAR',
    'Print PDF',
    'Approve',
    'Close',
  ]),
};

export const getSlipTranslations = (lang: SlipLanguage): SlipTranslations => translations[lang];

export const getStatusLabel = (status: string, lang: SlipLanguage): string => {
  const t = translations[lang];
  if (status === 'approved') return t.statusApproved;
  if (status === 'paid') return t.statusPaid;
  return t.statusPending;
};

export const getPaymentMethodLabel = (method: string, lang: SlipLanguage): string => {
  const t = translations[lang];
  return method === 'bank' ? t.payBank : t.payCash;
};
