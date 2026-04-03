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
