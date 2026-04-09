export const EXCLUDED_SPONSORSHIP_STATUSES = ['absconded', 'terminated'] as const;
export type ExcludedSponsorshipStatus = (typeof EXCLUDED_SPONSORSHIP_STATUSES)[number];

export type EmployeeLike = {
  id: string;
  status?: string | null;
  sponsorship_status?: string | null;
  probation_end_date?: string | null;
};

export function isExcludedSponsorshipStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (EXCLUDED_SPONSORSHIP_STATUSES as readonly string[]).includes(status);
}

/**
 * Visibility rule:
 * - Hide absconded/terminated by default.
 * - Keep visible if employee has activity in the target month (activeEmployeeIdsInMonth contains id).
 */
export function isEmployeeVisibleInMonth(
  employee: EmployeeLike,
  activeEmployeeIdsInMonth: ReadonlySet<string> | null | undefined
): boolean {
  if (!isExcludedSponsorshipStatus(employee.sponsorship_status ?? null)) return true;
  /** أثناء تحميل نشاط الشهر لا نخفي المستبعدين لتفادي قائمة فارغة مؤقتاً */
  if (activeEmployeeIdsInMonth === undefined) return true;
  return !!activeEmployeeIdsInMonth.has(employee.id);
}

export function filterVisibleEmployeesInMonth<T extends EmployeeLike>(
  employees: readonly T[],
  activeEmployeeIdsInMonth: ReadonlySet<string> | null | undefined
): T[] {
  return employees.filter((e) => isEmployeeVisibleInMonth(e, activeEmployeeIdsInMonth));
}

export function isEmployeeRetainedForMonth<T extends EmployeeLike>(
  employee: T,
  activeEmployeeIdsInMonth: ReadonlySet<string> | null | undefined
): boolean {
  if (employee.status === 'active') return true;
  if (activeEmployeeIdsInMonth === undefined) return false;
  return !!activeEmployeeIdsInMonth?.has(employee.id);
}

export function filterRetainedEmployeesForMonth<T extends EmployeeLike>(
  employees: readonly T[],
  activeEmployeeIdsInMonth: ReadonlySet<string> | null | undefined
): T[] {
  return employees.filter((e) => isEmployeeRetainedForMonth(e, activeEmployeeIdsInMonth));
}

/**
 * الرواتب الشهرية: المستبعد من الهروب/إنهاء الخدمة يُدرَج في الشهر إذا كان ما زال ضمن
 * نافذة ذلك الشهر حسب `probation_end_date` (انظر `isAttendanceRosterVisibleInMonth`)،
 * دون اشتراط وجود طلبات أو حضور. يبقى النشاط الشهري كدعم عند حالات الحواف.
 */
export function isEmployeeVisibleForSalaryMonth<T extends EmployeeLike>(
  employee: T,
  monthStartIso: string,
  activeEmployeeIdsInMonth: ReadonlySet<string> | null | undefined
): boolean {
  if (!isExcludedSponsorshipStatus(employee.sponsorship_status ?? null)) return true;
  if (activeEmployeeIdsInMonth === undefined) return true;
  if (isAttendanceRosterVisibleInMonth(employee, monthStartIso)) return true;
  return !!activeEmployeeIdsInMonth?.has(employee.id);
}

export function filterVisibleEmployeesForSalaryMonth<T extends EmployeeLike>(
  employees: readonly T[],
  monthStartIso: string,
  activeEmployeeIdsInMonth: ReadonlySet<string> | null | undefined
): T[] {
  return employees.filter((e) => isEmployeeVisibleForSalaryMonth(e, monthStartIso, activeEmployeeIdsInMonth));
}

export function filterRetainedEmployeesForSalaryMonth<T extends EmployeeLike>(
  employees: readonly T[],
  monthStartIso: string,
  activeEmployeeIdsInMonth: ReadonlySet<string> | null | undefined
): T[] {
  return employees.filter(
    (e) =>
      isEmployeeRetainedForMonth(e, activeEmployeeIdsInMonth) &&
      isEmployeeVisibleForSalaryMonth(e, monthStartIso, activeEmployeeIdsInMonth),
  );
}

function toDateOnlyIso(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.length >= 10) return trimmed.slice(0, 10);
  return null;
}

/**
 * Unified operational visibility:
 * - Any non-excluded sponsorship status => visible.
 * - absconded/terminated => hidden once effective date starts.
 * - Effective date uses `probation_end_date` (existing business field).
 * - If effective date is missing/invalid, hide immediately (safe default).
 */
export function isOperationallyVisibleEmployee(
  employee: Pick<EmployeeLike, 'sponsorship_status' | 'probation_end_date'>,
  asOfDate: Date = new Date()
): boolean {
  if (!isExcludedSponsorshipStatus(employee.sponsorship_status ?? null)) return true;
  const effectiveDateIso = toDateOnlyIso(employee.probation_end_date ?? null);
  if (!effectiveDateIso) return false;
  const todayIso = asOfDate.toISOString().slice(0, 10);
  return todayIso < effectiveDateIso;
}

export function filterOperationallyVisibleEmployees<T extends EmployeeLike>(
  employees: readonly T[],
  asOfDate: Date = new Date()
): T[] {
  return employees.filter((e) => isOperationallyVisibleEmployee(e, asOfDate));
}

/**
 * قائمة الحضور اليومية: يظهر المندوب في هروب/إنهاء خدمة حتى يُحدَّد تاريخ فعّال في `probation_end_date`.
 * من تاريخ الهروب/إنهاء الخدمة (شامل) لا يظهر في الحضور.
 */
export function isAttendanceRosterVisibleOnDate(
  employee: Pick<EmployeeLike, 'sponsorship_status' | 'probation_end_date'>,
  asOfDate: Date
): boolean {
  if (!isExcludedSponsorshipStatus(employee.sponsorship_status ?? null)) return true;
  const effectiveDateIso = toDateOnlyIso(employee.probation_end_date ?? null);
  if (!effectiveDateIso) return true;
  const asOfIso = asOfDate.toISOString().slice(0, 10);
  return asOfIso < effectiveDateIso;
}

export function filterAttendanceRosterEmployees<T extends EmployeeLike>(
  employees: readonly T[],
  asOfDate: Date
): T[] {
  return employees.filter((e) => isAttendanceRosterVisibleOnDate(e, asOfDate));
}

/**
 * السجل الشهري: يُدرَج المندوب إذا كان لا يزال ضمن القائمة التشغيلية في أي يوم داخل الشهر
 * (أي تاريخ الخروج بعد أول يوم من الشهر).
 */
export function isAttendanceRosterVisibleInMonth(
  employee: Pick<EmployeeLike, 'sponsorship_status' | 'probation_end_date'>,
  monthStartIso: string
): boolean {
  if (!isExcludedSponsorshipStatus(employee.sponsorship_status ?? null)) return true;
  const effectiveDateIso = toDateOnlyIso(employee.probation_end_date ?? null);
  if (!effectiveDateIso) return true;
  /** يُستبعد من الشهر فقط إذا انتهت الخدمة قبل أول يوم من الشهر؛ من ينتهي داخل الشهر يبقى لترحيل الطلبات للرواتب */
  return effectiveDateIso >= monthStartIso;
}

export function filterEmployeesForAttendanceMonth<T extends EmployeeLike>(
  employees: readonly T[],
  monthStartIso: string
): T[] {
  return employees.filter((e) => isAttendanceRosterVisibleInMonth(e, monthStartIso));
}

