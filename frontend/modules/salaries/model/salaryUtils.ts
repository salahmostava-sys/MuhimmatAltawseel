import type { PlatformSalaryMetric, SalaryRow } from '@modules/salaries/types/salary.types';

export const toCityArabicLabel = (city?: string | null) => {
  if (city === 'makkah') return 'مكة';
  if (city === 'jeddah') return 'جدة';
  return '—';
};

export type FastApprovedFilter = 'all' | 'approved' | 'pending';

const formatArabicCount = (count: number, noun: string) => `${count.toLocaleString('ar-SA')} ${noun}`;

export const hasPlatformActivity = (metric?: PlatformSalaryMetric | null) =>
  Boolean(metric && (metric.ordersCount > 0 || metric.shiftDays > 0 || metric.salary > 0));

/**
 * Keywords that identify delivery / field rider roles.
 * Any employee whose job title matches these is treated as a rider.
 *
 * Rule: anyone whose job title does NOT match these keywords is treated as administrative.
 * This means you only need to maintain the RIDER list — all other titles are admin by default.
 *
 * ⚠️ Do NOT add admin titles here. Only delivery / field roles belong in this list.
 */
const RIDER_JOB_TITLE_KEYWORDS = [
  // ── English rider titles ────────────────────────────────────────────────────
  'rider',
  'driver',
  'delivery',
  'courier',
  'dispatch',
  'messenger',
  // ── Arabic rider titles ─────────────────────────────────────────────────────
  'مندوب',
  'سائق',
  'توصيل',
  'موصل',
  'مرسال',
];

const normalizeSalaryJobTitle = (value?: string | null) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Returns true when the job title belongs to a delivery / field rider. */
export const isRiderJobTitle = (jobTitle?: string | null): boolean => {
  const normalized = normalizeSalaryJobTitle(jobTitle);
  if (!normalized) return false;
  return RIDER_JOB_TITLE_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

/**
 * Returns true when the employee should be treated as administrative (non-rider).
 *
 * Rule: anyone whose job title is set AND does NOT match rider keywords is administrative.
 * Empty / null job title returns false (unknown role — won't auto-include in salary months).
 */
export const isAdministrativeJobTitle = (jobTitle?: string | null): boolean => {
  const normalized = normalizeSalaryJobTitle(jobTitle);
  if (!normalized) return false;
  return !isRiderJobTitle(jobTitle);
};

export const getDisplayedBaseSalary = (
  row: Pick<SalaryRow, 'platformSalaries' | 'engineBaseSalary' | 'preferEngineBaseSalary'>,
) => {
  if (row.preferEngineBaseSalary && Number(row.engineBaseSalary || 0) > 0) {
    return Number(row.engineBaseSalary || 0);
  }
  const platformSalaryTotal = Object.values(row.platformSalaries || {}).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );
  if (platformSalaryTotal > 0) return platformSalaryTotal;
  return Number(row.engineBaseSalary || 0);
};

export const getPrimaryPlatformActivityCount = (metric?: PlatformSalaryMetric | null) => {
  if (!metric) return 0;
  if (metric.workType === 'shift') return metric.shiftDays;
  if (metric.workType === 'hybrid' && metric.ordersCount === 0) return metric.shiftDays;
  return metric.ordersCount;
};

export const getPlatformActivitySummary = (metric?: PlatformSalaryMetric | null) => {
  if (!metric) return '—';
  const orders = metric.ordersCount || 0;
  const shiftDays = metric.shiftDays || 0;

  if (metric.workType === 'shift') {
    return shiftDays > 0 ? formatArabicCount(shiftDays, 'دوام') : '—';
  }

  if (metric.workType === 'hybrid') {
    if (shiftDays > 0 && orders > 0) {
      return `${formatArabicCount(shiftDays, 'دوام')} + ${formatArabicCount(orders, 'طلب')}`;
    }
    if (shiftDays > 0) return formatArabicCount(shiftDays, 'دوام');
    if (orders > 0) return formatArabicCount(orders, 'طلب');
    return metric.salary > 0 ? 'احتساب مختلط' : '—';
  }

  return orders > 0 ? formatArabicCount(orders, 'طلب') : '—';
};

export const getPlatformActivityCompactSummary = (metric?: PlatformSalaryMetric | null) => {
  if (!metric) return '—';
  const orders = metric.ordersCount || 0;
  const shiftDays = metric.shiftDays || 0;

  if (metric.workType === 'shift') {
    return shiftDays > 0 ? `${shiftDays.toLocaleString('ar-SA')} د` : '—';
  }

  if (metric.workType === 'hybrid') {
    if (shiftDays > 0 && orders > 0) {
      return `${shiftDays.toLocaleString('ar-SA')} د + ${orders.toLocaleString('ar-SA')} ط`;
    }
    if (shiftDays > 0) return `${shiftDays.toLocaleString('ar-SA')} د`;
    if (orders > 0) return `${orders.toLocaleString('ar-SA')} ط`;
    return metric.salary > 0 ? 'مختلط' : '—';
  }

  return orders > 0 ? `${orders.toLocaleString('ar-SA')} ط` : '—';
};

export const getSalaryRowActivityTotals = (row: Pick<SalaryRow, 'platformMetrics'>) => {
  return Object.values(row.platformMetrics || {}).reduce(
    (acc, metric) => {
      acc.orders += metric.ordersCount || 0;
      acc.shiftDays += metric.shiftDays || 0;
      return acc;
    },
    { orders: 0, shiftDays: 0 }
  );
};

export const getSalaryRowActivitySummary = (row: Pick<SalaryRow, 'platformMetrics'>) => {
  const totals = getSalaryRowActivityTotals(row);
  if (totals.orders > 0 && totals.shiftDays > 0) {
    return `${totals.orders.toLocaleString('ar-SA')} طلب + ${totals.shiftDays.toLocaleString('ar-SA')} دوام`;
  }
  if (totals.shiftDays > 0) return `${totals.shiftDays.toLocaleString('ar-SA')} دوام`;
  if (totals.orders > 0) return `${totals.orders.toLocaleString('ar-SA')} طلب`;
  return '—';
};
