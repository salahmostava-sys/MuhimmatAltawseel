import { addMonths, format, getDaysInMonth } from 'date-fns';

import { salaryService, type SalaryPreviewCalculationMethod, type SalaryPreviewPlatformBreakdown, type SalaryPreviewRow } from '@services/salaryService';
import { supabase } from '@services/supabase/client';
import { toServiceError } from '@services/serviceError';
import { getEmployeeWorkTypeLabel, type DashboardWorkTypeFilter, normalizeEmployeeWorkType } from '@shared/lib/employeeWorkType';
import type { EmployeeWorkType } from '@shared/types/employees';
import type { WorkType } from '@shared/types/shifts';

type LooseQueryResult = {
  data: unknown;
  error: unknown;
};

type LooseQueryBuilder = PromiseLike<LooseQueryResult> & {
  select: (...args: unknown[]) => LooseQueryBuilder;
  order: (...args: unknown[]) => LooseQueryBuilder;
  eq: (...args: unknown[]) => LooseQueryBuilder;
  gte: (...args: unknown[]) => LooseQueryBuilder;
  lte: (...args: unknown[]) => LooseQueryBuilder;
  maybeSingle: (...args: unknown[]) => LooseQueryBuilder;
};

type GenericTableClient = {
  from: (table: string) => LooseQueryBuilder;
};

type PerformanceEmployeeRecord = {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  join_date: string | null;
  salary_type: string | null;
  work_type?: EmployeeWorkType | null;
  base_salary: number;
  status?: string | null;
};

type DailyOrderRow = {
  employee_id: string;
  date: string;
  app_id: string;
  orders_count: number;
  apps?: { name?: string | null; brand_color?: string | null } | { name?: string | null; brand_color?: string | null }[] | null;
};

type AttendanceStatus = 'present' | 'absent' | 'leave' | 'sick' | 'late';

type AttendanceRow = {
  employee_id: string;
  date: string;
  status: AttendanceStatus;
  check_in?: string | null;
  check_out?: string | null;
};

type EmployeeTargetRow = {
  employee_id: string;
  monthly_target_orders: number;
  daily_target_orders: number;
};

type SalaryContextRow = {
  employee_id: string;
  is_approved?: boolean | null;
  base_salary?: number | null;
  allowances?: number | null;
  advance_deduction?: number | null;
  net_salary?: number | null;
  manual_deduction?: number | null;
  attendance_deduction?: number | null;
  external_deduction?: number | null;
  payment_method?: string | null;
};

type EmployeeMonthSources = {
  orderRows: DailyOrderRow[];
  attendanceRows: AttendanceRow[];
  targetRow: EmployeeTargetRow | null;
  salaryRow: SalaryContextRow | null;
  previewRow: SalaryPreviewRow | null;
  daysInMonth: number;
};

type EmployeeSalaryShape = Pick<PerformanceEmployeeRecord, 'id' | 'base_salary' | 'salary_type' | 'work_type'>;

export interface EmployeeOrdersAppBreakdown {
  appId: string;
  appName: string;
  brandColor: string | null;
  ordersCount: number;
}

export interface EmployeeDailyOrdersPoint {
  date: string;
  orders: number;
}

export interface EmployeeAttendancePoint {
  date: string;
  status: AttendanceStatus;
}

export interface EmployeePerformanceData {
  employeeId: string;
  employeeName: string;
  workType: EmployeeWorkType;
  baseSalary: number;
  totalOrders: number;
  activeOrderDays: number;
  avgOrdersPerDay: number;
  monthlyTargetOrders: number;
  dailyTargetOrders: number;
  targetAchievementPct: number;
  daysPresent: number;
  lateDays: number;
  daysAbsent: number;
  leaveDays: number;
  sickDays: number;
  attendanceRate: number;
  deductions: number;
  bonus: number;
  orderSalaryComponent: number;
  salary: number;
  salarySource: 'record' | 'preview' | 'calculated';
  salaryApproved: boolean;
  performanceScore: number;
  ordersByApp: EmployeeOrdersAppBreakdown[];
  recentDailyOrders: EmployeeDailyOrdersPoint[];
  recentAttendance: EmployeeAttendancePoint[];
  aiPrompt: string;
  message: string;
}

export interface DashboardEmployeePerformanceRow extends EmployeePerformanceData {
  city: string | null;
  phone: string | null;
  joinDate: string | null;
  rank: number;
}

export interface EmployeePerformanceComparisonSummary {
  current: number;
  previous: number;
  changePct: number;
}

export interface EmployeeMonthlyPerformanceSnapshot {
  monthYear: string;
  workType: EmployeeWorkType;
  totalOrders: number;
  daysPresent: number;
  daysAbsent: number;
  salary: number;
  performanceScore: number;
}

export interface EmployeePerformanceProfileResponse {
  monthYear: string;
  employee: {
    employeeId: string;
    employeeName: string;
    phone: string | null;
    city: string | null;
    joinDate: string | null;
    workType: EmployeeWorkType;
  };
  summary: DashboardEmployeePerformanceRow;
  comparisons: {
    orders: EmployeePerformanceComparisonSummary;
    attendance: EmployeePerformanceComparisonSummary;
    salary: EmployeePerformanceComparisonSummary;
  };
  lastThreeMonths: EmployeeMonthlyPerformanceSnapshot[];
}

const sb = supabase as unknown as GenericTableClient & typeof supabase;

const PRESENT_STATUSES = new Set<AttendanceStatus>(['present', 'late']);
const ABSENT_STATUSES = new Set<AttendanceStatus>(['absent']);
const ORDER_CALCULATION_METHODS = new Set<SalaryPreviewCalculationMethod | 'orders'>([
  'orders',
  'orders_fallback',
  'mixed',
]);

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildMonthRange(monthYear: string) {
  const monthDate = new Date(`${monthYear}-01`);
  const daysInMonth = getDaysInMonth(monthDate);
  return {
    startDate: `${monthYear}-01`,
    endDate: `${monthYear}-${String(daysInMonth).padStart(2, '0')}`,
    daysInMonth,
  };
}

function shiftMonth(monthYear: string, offset: number): string {
  return format(addMonths(new Date(`${monthYear}-01`), offset), 'yyyy-MM');
}

function computeChangePct(current: number, previous: number): number {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return round(((current - previous) / previous) * 100, 1);
}

function extractAppMeta(
  value: DailyOrderRow['apps'],
): { name: string | null; brandColor: string | null } {
  if (Array.isArray(value)) {
    const first = value[0];
    return {
      name: first?.name ?? null,
      brandColor: first?.brand_color ?? null,
    };
  }

  return {
    name: value?.name ?? null,
    brandColor: value?.brand_color ?? null,
  };
}

function parsePlatformBreakdown(value: unknown): SalaryPreviewPlatformBreakdown[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];

    const row = item as Partial<SalaryPreviewPlatformBreakdown>;
    if (typeof row.app_name !== 'string' || typeof row.earnings !== 'number') return [];

    return [
      {
        app_id: typeof row.app_id === 'string' ? row.app_id : undefined,
        app_name: row.app_name,
        work_type: (row.work_type ?? 'orders') as WorkType,
        calculation_method: (row.calculation_method ?? null) as SalaryPreviewCalculationMethod | null,
        orders_count: row.orders_count ?? null,
        shift_days: row.shift_days ?? null,
        earnings: row.earnings,
      },
    ];
  });
}

function buildEmptyPerformance(employee: PerformanceEmployeeRecord): EmployeePerformanceData {
  return {
    employeeId: employee.id,
    employeeName: employee.name,
    workType: normalizeEmployeeWorkType(employee.work_type, employee.salary_type),
    baseSalary: safeNumber(employee.base_salary),
    totalOrders: 0,
    activeOrderDays: 0,
    avgOrdersPerDay: 0,
    monthlyTargetOrders: 0,
    dailyTargetOrders: 0,
    targetAchievementPct: 0,
    daysPresent: 0,
    lateDays: 0,
    daysAbsent: 0,
    leaveDays: 0,
    sickDays: 0,
    attendanceRate: 0,
    deductions: 0,
    bonus: 0,
    orderSalaryComponent: 0,
    salary: 0,
    salarySource: 'calculated',
    salaryApproved: false,
    performanceScore: 0,
    ordersByApp: [],
    recentDailyOrders: [],
    recentAttendance: [],
    aiPrompt: '',
    message: '',
  };
}

function computeOrderSalaryComponent(
  employee: EmployeeSalaryShape,
  deductions: number,
  bonus: number,
  netSalary: number | null,
  previewRow: SalaryPreviewRow | null,
): number {
  const workType = normalizeEmployeeWorkType(employee.work_type, employee.salary_type);
  const breakdown = parsePlatformBreakdown(previewRow?.platform_breakdown ?? null);

  const orderBreakdownTotal = breakdown.reduce((sum, row) => {
    if (row.work_type === 'orders') return sum + safeNumber(row.earnings);
    if (row.work_type === 'hybrid' && (row.orders_count ?? 0) > 0) return sum + safeNumber(row.earnings);
    if (row.calculation_method && ORDER_CALCULATION_METHODS.has(row.calculation_method)) {
      return sum + safeNumber(row.earnings);
    }
    return sum;
  }, 0);

  if (orderBreakdownTotal > 0) return orderBreakdownTotal;

  if (netSalary != null) {
    if (workType === 'orders') {
      return Math.max(0, netSalary + deductions - bonus);
    }

    if (workType === 'hybrid') {
      return Math.max(0, netSalary - safeNumber(employee.base_salary) + deductions - bonus);
    }
  }

  if (workType === 'orders' && previewRow) {
    return safeNumber(previewRow.base_salary);
  }

  return 0;
}

function calculateAttendanceFallbackDeduction(
  employee: EmployeeSalaryShape,
  absentDays: number,
): number {
  if (absentDays <= 0) return 0;
  const dailyRate = safeNumber(employee.base_salary) / 30;
  return Math.max(0, round(dailyRate * absentDays, 2));
}

function buildOrdersPerformanceSlice(
  employee: PerformanceEmployeeRecord,
  sources: EmployeeMonthSources,
): Partial<EmployeePerformanceData> {
  const ordersByAppMap = new Map<string, EmployeeOrdersAppBreakdown>();
  const dailyOrdersMap = new Map<string, number>();

  for (const row of sources.orderRows) {
    const appMeta = extractAppMeta(row.apps);
    const currentApp = ordersByAppMap.get(row.app_id) ?? {
      appId: row.app_id,
      appName: appMeta.name ?? row.app_id,
      brandColor: appMeta.brandColor,
      ordersCount: 0,
    };
    currentApp.ordersCount += safeNumber(row.orders_count);
    ordersByAppMap.set(row.app_id, currentApp);

    dailyOrdersMap.set(row.date, (dailyOrdersMap.get(row.date) ?? 0) + safeNumber(row.orders_count));
  }

  const totalOrders = Array.from(dailyOrdersMap.values()).reduce((sum, count) => sum + count, 0);
  const activeOrderDays = dailyOrdersMap.size;
  const monthlyTargetOrders = safeNumber(sources.targetRow?.monthly_target_orders);
  const dailyTargetOrders = safeNumber(sources.targetRow?.daily_target_orders);
  const targetAchievementPct =
    monthlyTargetOrders > 0 ? round((totalOrders / monthlyTargetOrders) * 100, 1) : 0;

  const deductionsFromRecord =
    safeNumber(sources.salaryRow?.attendance_deduction) +
    safeNumber(sources.salaryRow?.advance_deduction) +
    safeNumber(sources.salaryRow?.external_deduction) +
    safeNumber(sources.salaryRow?.manual_deduction);
  const bonus = safeNumber(sources.salaryRow?.allowances);
  const netSalary =
    sources.salaryRow?.net_salary != null
      ? safeNumber(sources.salaryRow.net_salary)
      : sources.previewRow?.net_salary != null
        ? safeNumber(sources.previewRow.net_salary)
        : null;

  return {
    totalOrders,
    activeOrderDays,
    avgOrdersPerDay: activeOrderDays > 0 ? round(totalOrders / activeOrderDays, 1) : 0,
    monthlyTargetOrders,
    dailyTargetOrders,
    targetAchievementPct,
    orderSalaryComponent: computeOrderSalaryComponent(employee, deductionsFromRecord, bonus, netSalary, sources.previewRow),
    ordersByApp: Array.from(ordersByAppMap.values()).sort((left, right) => right.ordersCount - left.ordersCount),
    recentDailyOrders: Array.from(dailyOrdersMap.entries())
      .map(([date, orders]) => ({ date, orders }))
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 7),
  };
}

function buildAttendancePerformanceSlice(
  employee: PerformanceEmployeeRecord,
  sources: EmployeeMonthSources,
): Partial<EmployeePerformanceData> {
  let daysPresent = 0;
  let lateDays = 0;
  let daysAbsent = 0;
  let leaveDays = 0;
  let sickDays = 0;

  for (const row of sources.attendanceRows) {
    if (PRESENT_STATUSES.has(row.status)) {
      daysPresent += 1;
    }
    if (row.status === 'late') {
      lateDays += 1;
    }
    if (ABSENT_STATUSES.has(row.status)) {
      daysAbsent += 1;
    }
    if (row.status === 'leave') {
      leaveDays += 1;
    }
    if (row.status === 'sick') {
      sickDays += 1;
    }
  }

  const attendanceRelevantDays = daysPresent + daysAbsent;
  const attendanceRate =
    attendanceRelevantDays > 0
      ? round((daysPresent / attendanceRelevantDays) * 100, 1)
      : 0;

  const deductionsFromRecord =
    safeNumber(sources.salaryRow?.attendance_deduction) +
    safeNumber(sources.salaryRow?.advance_deduction) +
    safeNumber(sources.salaryRow?.external_deduction) +
    safeNumber(sources.salaryRow?.manual_deduction);
  const previewDeductions =
    safeNumber(sources.previewRow?.advance_deduction) +
    safeNumber(sources.previewRow?.external_deduction);
  const attendanceFallback = calculateAttendanceFallbackDeduction(employee, daysAbsent);
  const deductions = Math.max(deductionsFromRecord, previewDeductions + attendanceFallback);

  return {
    daysPresent,
    lateDays,
    daysAbsent,
    leaveDays,
    sickDays,
    attendanceRate,
    deductions,
    bonus: safeNumber(sources.salaryRow?.allowances),
    recentAttendance: [...sources.attendanceRows]
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 10)
      .map((row) => ({ date: row.date, status: row.status })),
  };
}

export function calculateSalary(
  employee: EmployeeSalaryShape,
  performance: Pick<EmployeePerformanceData, 'workType' | 'orderSalaryComponent' | 'deductions' | 'bonus' | 'salary'>,
): number {
  if (performance.salary > 0) {
    return performance.salary;
  }

  switch (performance.workType) {
    case 'orders':
      return Math.max(0, round(performance.orderSalaryComponent, 2));
    case 'attendance':
      return Math.max(
        0,
        round(safeNumber(employee.base_salary) - performance.deductions + performance.bonus, 2),
      );
    case 'hybrid':
      return Math.max(
        0,
        round(
          safeNumber(employee.base_salary) +
            performance.orderSalaryComponent -
            performance.deductions +
            performance.bonus,
          2,
        ),
      );
  }

  return 0;
}

function computePerformanceScore(
  workType: EmployeeWorkType,
  performance: Pick<EmployeePerformanceData, 'totalOrders' | 'targetAchievementPct' | 'avgOrdersPerDay' | 'attendanceRate' | 'daysPresent' | 'daysAbsent' | 'monthlyTargetOrders'>,
  daysInMonth: number,
): number {
  const orderSignal =
    performance.monthlyTargetOrders > 0
      ? Math.min(100, performance.targetAchievementPct)
      : Math.min(100, performance.totalOrders * 4);
  const orderTempo = Math.min(100, performance.avgOrdersPerDay * 8);
  const attendanceSignal =
    performance.attendanceRate > 0
      ? Math.min(100, performance.attendanceRate)
      : Math.min(100, (performance.daysPresent / Math.max(daysInMonth, 1)) * 100);
  const attendanceReliability = Math.max(
    0,
    Math.min(100, ((performance.daysPresent - performance.daysAbsent) / Math.max(daysInMonth, 1)) * 100 + 50),
  );

  if (workType === 'orders') {
    return Math.round(orderSignal * 0.7 + orderTempo * 0.3);
  }

  if (workType === 'attendance') {
    return Math.round(attendanceSignal * 0.75 + attendanceReliability * 0.25);
  }

  return Math.round(orderSignal * 0.35 + orderTempo * 0.15 + attendanceSignal * 0.35 + attendanceReliability * 0.15);
}

export function generatePrompt(
  employee: Pick<PerformanceEmployeeRecord, 'name' | 'salary_type' | 'work_type'>,
  data: Pick<EmployeePerformanceData, 'workType' | 'totalOrders' | 'daysPresent' | 'daysAbsent' | 'salary' | 'attendanceRate' | 'targetAchievementPct'>,
): string {
  const workType = normalizeEmployeeWorkType(employee.work_type, employee.salary_type);

  if (workType === 'orders') {
    return `حلل أداء ${employee.name} في الطلبات. إجمالي الطلبات ${data.totalOrders} ونسبة تحقيق الهدف ${data.targetAchievementPct.toFixed(1)}%.`;
  }

  if (workType === 'attendance') {
    return `حلل التزام ${employee.name}. أيام الحضور ${data.daysPresent} والغياب ${data.daysAbsent} ومعدل الالتزام ${data.attendanceRate.toFixed(1)}%.`;
  }

  return `حلل أداء ${employee.name} المختلط. الطلبات ${data.totalOrders}، الحضور ${data.daysPresent}، الغياب ${data.daysAbsent}، والراتب التقديري ${data.salary.toLocaleString('ar-SA')} ر.س.`;
}

export function buildMessage(
  employee: Pick<PerformanceEmployeeRecord, 'salary_type' | 'work_type'>,
  data: Pick<EmployeePerformanceData, 'workType' | 'totalOrders' | 'daysPresent' | 'daysAbsent' | 'salary'>,
): string {
  const workType = normalizeEmployeeWorkType(employee.work_type, employee.salary_type);

  switch (workType) {
    case 'orders':
      return `طلباتك هذا الشهر: ${data.totalOrders}`;
    case 'attendance':
      return `حضورك: ${data.daysPresent} يوم | غيابك: ${data.daysAbsent} يوم`;
    case 'hybrid':
      return `طلبات: ${data.totalOrders} | حضور: ${data.daysPresent} | راتب تقديري: ${data.salary.toLocaleString('ar-SA')} ر.س`;
  }

  return '';
}

function finalizePerformance(
  employee: PerformanceEmployeeRecord,
  sources: EmployeeMonthSources,
  partial: Partial<EmployeePerformanceData>,
): EmployeePerformanceData {
  const performance: EmployeePerformanceData = {
    ...buildEmptyPerformance(employee),
    ...partial,
  };

  performance.baseSalary =
    sources.salaryRow?.base_salary != null
      ? safeNumber(sources.salaryRow.base_salary)
      : safeNumber(employee.base_salary);

  const netSalaryFromRecord =
    sources.salaryRow?.net_salary != null
      ? safeNumber(sources.salaryRow.net_salary)
      : sources.previewRow?.net_salary != null
        ? safeNumber(sources.previewRow.net_salary)
        : null;

  performance.salarySource =
    sources.salaryRow?.net_salary != null
      ? 'record'
      : sources.previewRow?.net_salary != null
        ? 'preview'
        : 'calculated';
  performance.salaryApproved = Boolean(sources.salaryRow?.is_approved);
  performance.salary =
    netSalaryFromRecord != null
      ? netSalaryFromRecord
      : calculateSalary(employee, performance);
  performance.performanceScore = computePerformanceScore(performance.workType, performance, sources.daysInMonth);
  performance.aiPrompt = generatePrompt(employee, performance);
  performance.message = buildMessage(employee, performance);

  return performance;
}

async function selectEmployeesBase(params: {
  employeeId?: string;
  onlyActive?: boolean;
} = {}): Promise<PerformanceEmployeeRecord[]> {
  const primarySelect = 'id, name, phone, city, join_date, salary_type, work_type, base_salary, status';
  let query = sb
    .from('employees')
    .select(primarySelect)
    .order('name', { ascending: true });

  if (params.onlyActive) {
    query = query.eq('status', 'active');
  }

  if (params.employeeId) {
    query = query.eq('id', params.employeeId);
  }

  let { data, error } = await query;

  if (error && String(error.message ?? '').includes('work_type')) {
    let fallbackQuery = sb
      .from('employees')
      .select('id, name, phone, city, join_date, salary_type, base_salary, status')
      .order('name', { ascending: true });

    if (params.onlyActive) {
      fallbackQuery = fallbackQuery.eq('status', 'active');
    }

    if (params.employeeId) {
      fallbackQuery = fallbackQuery.eq('id', params.employeeId);
    }

    const fallback = await fallbackQuery;
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw toServiceError(error, 'employeePerformanceService.selectEmployeesBase');
  }

  return ((data ?? []) as Array<Omit<PerformanceEmployeeRecord, 'work_type'> & { work_type?: EmployeeWorkType | null }>).map((row) => ({
    ...row,
    work_type: row.work_type ?? null,
  }));
}

async function getTargetsByMonth(monthYear: string): Promise<EmployeeTargetRow[]> {
  try {
    const { data, error } = await sb
      .from('employee_targets')
      .select('employee_id, monthly_target_orders, daily_target_orders')
      .eq('month_year', monthYear);

    if (error) {
      throw error;
    }

    return (data ?? []) as EmployeeTargetRow[];
  } catch (error) {
    const message =
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : '';

    if (message.includes('employee_targets')) {
      return [];
    }

    throw toServiceError(error, 'employeePerformanceService.getTargetsByMonth');
  }
}

async function getTargetForEmployeeMonth(employeeId: string, monthYear: string): Promise<EmployeeTargetRow | null> {
  const targets = await getTargetsByMonth(monthYear);
  return targets.find((row) => row.employee_id === employeeId) ?? null;
}

async function getSalaryPreviewRows(monthYear: string): Promise<SalaryPreviewRow[]> {
  try {
    return await salaryService.getSalaryPreviewForMonth(monthYear);
  } catch {
    return [];
  }
}

async function getSalaryContextRows(monthYear: string): Promise<SalaryContextRow[]> {
  try {
    return (await salaryService.getMonthRecordsForSalaryContext(monthYear)) as SalaryContextRow[];
  } catch {
    return [];
  }
}

async function loadEmployeeMonthSources(
  employeeId: string,
  monthYear: string,
): Promise<EmployeeMonthSources> {
  const { startDate, endDate, daysInMonth } = buildMonthRange(monthYear);

  const [ordersRes, attendanceRes, targetRow, salaryRows, previewRows] = await Promise.all([
    sb
      .from('daily_orders')
      .select('employee_id, date, app_id, orders_count, apps(name, brand_color)')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate),
    sb
      .from('attendance')
      .select('employee_id, date, status, check_in, check_out')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate),
    getTargetForEmployeeMonth(employeeId, monthYear),
    sb
      .from('salary_records')
      .select('employee_id, is_approved, base_salary, allowances, advance_deduction, net_salary, manual_deduction, attendance_deduction, external_deduction, payment_method')
      .eq('employee_id', employeeId)
      .eq('month_year', monthYear)
      .maybeSingle(),
    getSalaryPreviewRows(monthYear),
  ]);

  if (ordersRes.error) {
    throw toServiceError(ordersRes.error, 'employeePerformanceService.loadEmployeeMonthSources.orders');
  }

  if (attendanceRes.error) {
    throw toServiceError(attendanceRes.error, 'employeePerformanceService.loadEmployeeMonthSources.attendance');
  }

  return {
    orderRows: (ordersRes.data ?? []) as DailyOrderRow[],
    attendanceRows: (attendanceRes.data ?? []) as AttendanceRow[],
    targetRow,
    salaryRow: (salaryRows.data ?? null) as SalaryContextRow | null,
    previewRow: previewRows.find((row) => row.employee_id === employeeId) ?? null,
    daysInMonth,
  };
}

async function loadDashboardMonthContext(
  monthYear: string,
): Promise<{
  ordersByEmployee: Map<string, DailyOrderRow[]>;
  attendanceByEmployee: Map<string, AttendanceRow[]>;
  targetsByEmployee: Map<string, EmployeeTargetRow>;
  salaryByEmployee: Map<string, SalaryContextRow>;
  previewByEmployee: Map<string, SalaryPreviewRow>;
  daysInMonth: number;
}> {
  const { startDate, endDate, daysInMonth } = buildMonthRange(monthYear);

  const [ordersRes, attendanceRes, targets, salaryRows, previewRows] = await Promise.all([
    sb
      .from('daily_orders')
      .select('employee_id, date, app_id, orders_count, apps(name, brand_color)')
      .gte('date', startDate)
      .lte('date', endDate),
    sb
      .from('attendance')
      .select('employee_id, date, status, check_in, check_out')
      .gte('date', startDate)
      .lte('date', endDate),
    getTargetsByMonth(monthYear),
    getSalaryContextRows(monthYear),
    getSalaryPreviewRows(monthYear),
  ]);

  if (ordersRes.error) {
    throw toServiceError(ordersRes.error, 'employeePerformanceService.loadDashboardMonthContext.orders');
  }

  if (attendanceRes.error) {
    throw toServiceError(attendanceRes.error, 'employeePerformanceService.loadDashboardMonthContext.attendance');
  }

  const ordersByEmployee = new Map<string, DailyOrderRow[]>();
  for (const row of (ordersRes.data ?? []) as DailyOrderRow[]) {
    const list = ordersByEmployee.get(row.employee_id) ?? [];
    list.push(row);
    ordersByEmployee.set(row.employee_id, list);
  }

  const attendanceByEmployee = new Map<string, AttendanceRow[]>();
  for (const row of (attendanceRes.data ?? []) as AttendanceRow[]) {
    const list = attendanceByEmployee.get(row.employee_id) ?? [];
    list.push(row);
    attendanceByEmployee.set(row.employee_id, list);
  }

  return {
    ordersByEmployee,
    attendanceByEmployee,
    targetsByEmployee: new Map(targets.map((row) => [row.employee_id, row])),
    salaryByEmployee: new Map(salaryRows.map((row) => [row.employee_id, row])),
    previewByEmployee: new Map(previewRows.map((row) => [row.employee_id, row])),
    daysInMonth,
  };
}

function buildPerformanceForEmployee(
  employee: PerformanceEmployeeRecord,
  sources: EmployeeMonthSources,
): EmployeePerformanceData {
  const workType = normalizeEmployeeWorkType(employee.work_type, employee.salary_type);

  const ordersSlice =
    workType === 'orders' || workType === 'hybrid'
      ? buildOrdersPerformanceSlice(employee, sources)
      : {};
  const attendanceSlice =
    workType === 'attendance' || workType === 'hybrid'
      ? buildAttendancePerformanceSlice(employee, sources)
      : {};

  return finalizePerformance(employee, sources, {
    workType,
    ...ordersSlice,
    ...attendanceSlice,
  });
}

function rankDashboardRows(
  rows: DashboardEmployeePerformanceRow[],
  type: DashboardWorkTypeFilter,
): DashboardEmployeePerformanceRow[] {
  const sorted = [...rows].sort((left, right) => {
    if (type === 'orders') {
      return (
        right.totalOrders - left.totalOrders ||
        right.avgOrdersPerDay - left.avgOrdersPerDay ||
        right.salary - left.salary
      );
    }

    if (type === 'attendance') {
      return (
        right.daysPresent - left.daysPresent ||
        right.attendanceRate - left.attendanceRate ||
        right.salary - left.salary
      );
    }

    return (
      right.performanceScore - left.performanceScore ||
      right.salary - left.salary ||
      right.totalOrders - left.totalOrders ||
      right.daysPresent - left.daysPresent
    );
  });

  return sorted.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

export function buildDashboardPrompt(
  rows: DashboardEmployeePerformanceRow[],
  type: DashboardWorkTypeFilter,
  monthYear: string,
): string {
  if (rows.length === 0) return '';

  const totals = rows.reduce(
    (acc, row) => {
      acc.orders += row.totalOrders;
      acc.days += row.daysPresent;
      acc.salary += row.salary;
      return acc;
    },
    { orders: 0, days: 0, salary: 0 },
  );

  const scopeLabel =
    type === 'all'
      ? 'كل الأنواع'
      : getEmployeeWorkTypeLabel(type);

  const topRows = rows
    .slice(0, 8)
    .map(
      (row) =>
        `- ${row.employeeName} (${getEmployeeWorkTypeLabel(row.workType)}): طلبات ${row.totalOrders}، حضور ${row.daysPresent}، غياب ${row.daysAbsent}، راتب ${row.salary.toLocaleString('ar-SA')} ر.س، ترتيب ${row.rank}.`,
    )
    .join('\n');

  return [
    'أنت محلل أداء داخلي. استخدم فقط البيانات التالية ولا تخترع أرقامًا غير موجودة.',
    `الشهر: ${monthYear}.`,
    `التصفية الحالية: ${scopeLabel}.`,
    `عدد الموظفين: ${rows.length}.`,
    `إجمالي الطلبات: ${totals.orders}.`,
    `إجمالي أيام الحضور: ${totals.days}.`,
    `إجمالي الرواتب التقديرية: ${totals.salary.toLocaleString('ar-SA')} ر.س.`,
    'أهم السجلات:',
    topRows,
    'أجب بالعربية وبشكل مباشر ومختصر، ومع المقارنات الرقمية عند السؤال عنها.',
  ].join('\n');
}

export const employeePerformanceService = {
  getEmployee: async (employeeId: string): Promise<PerformanceEmployeeRecord> => {
    const rows = await selectEmployeesBase({ employeeId });
    const employee = rows[0];

    if (!employee) {
      throw toServiceError(new Error('Employee not found'), 'employeePerformanceService.getEmployee');
    }

    return employee;
  },

  getEmployees: async (type: DashboardWorkTypeFilter = 'all'): Promise<PerformanceEmployeeRecord[]> => {
    const rows = await selectEmployeesBase({ onlyActive: true });

    if (type === 'all') {
      return rows;
    }

    return rows.filter(
      (row) => normalizeEmployeeWorkType(row.work_type, row.salary_type) === type,
    );
  },

  getOrdersPerformance: async (
    employeeId: string,
    monthYear: string,
  ): Promise<EmployeePerformanceData> => {
    const employee = await employeePerformanceService.getEmployee(employeeId);
    const sources = await loadEmployeeMonthSources(employeeId, monthYear);

    return finalizePerformance(employee, sources, {
      workType: normalizeEmployeeWorkType(employee.work_type, employee.salary_type),
      ...buildOrdersPerformanceSlice(employee, sources),
    });
  },

  getAttendancePerformance: async (
    employeeId: string,
    monthYear: string,
  ): Promise<EmployeePerformanceData> => {
    const employee = await employeePerformanceService.getEmployee(employeeId);
    const sources = await loadEmployeeMonthSources(employeeId, monthYear);

    return finalizePerformance(employee, sources, {
      workType: normalizeEmployeeWorkType(employee.work_type, employee.salary_type),
      ...buildAttendancePerformanceSlice(employee, sources),
    });
  },

  getEmployeePerformance: async (
    employeeId: string,
    monthYear: string,
  ): Promise<EmployeePerformanceData> => {
    const employee = await employeePerformanceService.getEmployee(employeeId);
    const sources = await loadEmployeeMonthSources(employeeId, monthYear);

    return buildPerformanceForEmployee(employee, sources);
  },

  calculateSalary,

  generatePrompt,

  buildMessage,

  buildDashboardPrompt,

  getDashboardData: async (
    type: DashboardWorkTypeFilter = 'all',
    monthYear: string,
  ): Promise<DashboardEmployeePerformanceRow[]> => {
    const employees = await employeePerformanceService.getEmployees(type);
    const context = await loadDashboardMonthContext(monthYear);

    const rows = employees.map((employee) => {
      const performance = buildPerformanceForEmployee(employee, {
        orderRows: context.ordersByEmployee.get(employee.id) ?? [],
        attendanceRows: context.attendanceByEmployee.get(employee.id) ?? [],
        targetRow: context.targetsByEmployee.get(employee.id) ?? null,
        salaryRow: context.salaryByEmployee.get(employee.id) ?? null,
        previewRow: context.previewByEmployee.get(employee.id) ?? null,
        daysInMonth: context.daysInMonth,
      });

      return {
        ...performance,
        city: employee.city,
        phone: employee.phone,
        joinDate: employee.join_date,
        rank: 0,
      };
    });

    return rankDashboardRows(rows, type);
  },

  getEmployeePerformanceProfile: async (
    employeeId: string,
    monthYear: string,
  ): Promise<EmployeePerformanceProfileResponse> => {
    const employee = await employeePerformanceService.getEmployee(employeeId);
    const [current, previous, previousTwo] = await Promise.all([
      employeePerformanceService.getEmployeePerformance(employeeId, monthYear),
      employeePerformanceService.getEmployeePerformance(employeeId, shiftMonth(monthYear, -1)),
      employeePerformanceService.getEmployeePerformance(employeeId, shiftMonth(monthYear, -2)),
    ]);

    const summary: DashboardEmployeePerformanceRow = {
      ...current,
      city: employee.city,
      phone: employee.phone,
      joinDate: employee.join_date,
      rank: 1,
    };

    return {
      monthYear,
      employee: {
        employeeId: employee.id,
        employeeName: employee.name,
        phone: employee.phone,
        city: employee.city,
        joinDate: employee.join_date,
        workType: summary.workType,
      },
      summary,
      comparisons: {
        orders: {
          current: current.totalOrders,
          previous: previous.totalOrders,
          changePct: computeChangePct(current.totalOrders, previous.totalOrders),
        },
        attendance: {
          current: current.daysPresent,
          previous: previous.daysPresent,
          changePct: computeChangePct(current.daysPresent, previous.daysPresent),
        },
        salary: {
          current: current.salary,
          previous: previous.salary,
          changePct: computeChangePct(current.salary, previous.salary),
        },
      },
      lastThreeMonths: [
        { monthYear, ...current },
        { monthYear: shiftMonth(monthYear, -1), ...previous },
        { monthYear: shiftMonth(monthYear, -2), ...previousTwo },
      ].map((row) => ({
        monthYear: row.monthYear,
        workType: row.workType,
        totalOrders: row.totalOrders,
        daysPresent: row.daysPresent,
        daysAbsent: row.daysAbsent,
        salary: row.salary,
        performanceScore: row.performanceScore,
      })),
    };
  },
};
