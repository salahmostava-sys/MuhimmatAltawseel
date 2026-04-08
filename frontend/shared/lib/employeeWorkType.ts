import type { EmployeeWorkType, SalaryType } from '@shared/types/employees';

export type DashboardWorkTypeFilter = 'all' | EmployeeWorkType;

export const EMPLOYEE_WORK_TYPES = ['orders', 'attendance', 'hybrid'] as const;

export function isEmployeeWorkType(value: unknown): value is EmployeeWorkType {
  return typeof value === 'string' && EMPLOYEE_WORK_TYPES.includes(value as EmployeeWorkType);
}

export function normalizeEmployeeWorkType(
  workType?: unknown,
  salaryType?: SalaryType | string | null,
): EmployeeWorkType {
  if (isEmployeeWorkType(workType)) return workType;
  if (salaryType === 'shift') return 'attendance';
  return 'orders';
}

export function getEmployeeWorkTypeLabel(workType?: unknown, salaryType?: SalaryType | string | null): string {
  const normalized = normalizeEmployeeWorkType(workType, salaryType);
  if (normalized === 'attendance') return 'حضور';
  if (normalized === 'hybrid') return 'مختلط';
  return 'طلبات';
}

export function isOrdersCapableEmployeeWorkType(workType?: unknown, salaryType?: SalaryType | string | null): boolean {
  const normalized = normalizeEmployeeWorkType(workType, salaryType);
  return normalized === 'orders' || normalized === 'hybrid';
}

export function isAttendanceCapableEmployeeWorkType(
  workType?: unknown,
  salaryType?: SalaryType | string | null,
): boolean {
  const normalized = normalizeEmployeeWorkType(workType, salaryType);
  return normalized === 'attendance' || normalized === 'hybrid';
}
