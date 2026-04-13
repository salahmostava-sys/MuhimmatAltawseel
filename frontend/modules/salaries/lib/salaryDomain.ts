import {
  salaryService,
  type PricingRule,
  type SalaryPreviewPlatformBreakdown,
  type SalarySchemeTier,
} from '@services/salaryService';
import { salaryDataService } from '@services/salaryDataService';
import { salaryDraftService } from '@services/salaryDraftService';
import {
  filterRetainedEmployeesForSalaryMonth,
  isExcludedSponsorshipStatus,
} from '@shared/lib/employeeVisibility';
import {
  getPrimaryPlatformActivityCount,
  hasPlatformActivity,
  isAdministrativeJobTitle,
  toCityArabicLabel,
} from '@modules/salaries/model/salaryUtils';
import { logError } from '@shared/lib/logger';
import type { SlipLanguage } from '@shared/lib/salarySlipTranslations';
import type {
  AppWithSchemeRow,
  OrderWithAppRow,
  PlatformSalaryMetric,
  PreparedSalaryState,
  SalaryDraftPatch,
  SalaryBaseContextData,
  SalaryRow,
  SalaryRowSnapshot,
  SchemeData,
} from '@modules/salaries/types/salary.types';
import type { WorkType } from '@shared/types/shifts';

export const wasFixedSchemeAlreadyCalculated = (
  platformNames: string[],
  appSchemeMap: Record<string, SchemeData | null>,
  platformSalaries: Record<string, number>,
  currentPlatform: string,
  schemeId: string
) => {
  return platformNames.some(
    (prev) =>
      prev !== currentPlatform &&
      appSchemeMap[prev]?.id === schemeId &&
      platformSalaries[prev] !== undefined
  );
};

export const calculatePlatformSalary = ({
  platformName,
  orders,
  attendanceDays,
  platformNames,
  appNameToId,
  rulesMap,
  appSchemeMap,
  platformSalaries,
}: {
  platformName: string;
  orders: number;
  attendanceDays: number;
  platformNames: string[];
  appNameToId: Record<string, string>;
  rulesMap: Record<string, PricingRule[]>;
  appSchemeMap: Record<string, SchemeData | null>;
  platformSalaries: Record<string, number>;
}) => {
  const appId = appNameToId[platformName];
  const appRules = appId ? rulesMap[appId] || [] : [];
  const ruleResult = salaryService.applyPricingRules(appRules, orders);
  if (ruleResult.matchedRule) {
    return Math.round(ruleResult.salary);
  }

  const scheme = appSchemeMap[platformName];
  if (!scheme) {
    return 0;
  }

  if (scheme.scheme_type === 'fixed_monthly') {
    const alreadyCalculated = wasFixedSchemeAlreadyCalculated(
      platformNames,
      appSchemeMap,
      platformSalaries,
      platformName,
      scheme.id
    );
    if (alreadyCalculated) return 0;
    return salaryService.calculateFixedMonthlySalary(scheme.monthly_amount || 0, attendanceDays);
  }

  if (orders === 0) {
    return 0;
  }
  if (!scheme.salary_scheme_tiers) {
    return 0;
  }
  const calculatedSalary = salaryService.calculateTierSalary(
    orders,
    scheme.salary_scheme_tiers as SalarySchemeTier[],
    scheme.target_orders,
    scheme.target_bonus
  );
  return calculatedSalary;
};

type SavedSalaryRecord = {
  is_approved: boolean;
  net_salary: number;
  base_salary?: number | null;
  allowances?: number | null;
  attendance_deduction?: number | null;
  advance_deduction?: number | null;
  external_deduction?: number | null;
  manual_deduction?: number | null;
  payment_method?: string | null;
  sheet_snapshot?: SalaryRowSnapshot | null;
};

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizePaymentMethod = (
  value: unknown,
  fallback: SalaryRow['paymentMethod'],
): SalaryRow['paymentMethod'] => {
  if (value === 'bank' || value === 'cash') return value;
  return fallback;
};

const readSavedSnapshot = (value: unknown): Partial<SalaryRowSnapshot> | null =>
  isRecordObject(value) ? (value as Partial<SalaryRowSnapshot>) : null;

const getFallbackSavedCustomDeductions = (manualDeduction: number) => {
  if (manualDeduction <= 0) return {};
  return { 'saved___خصم يدوي محفوظ': manualDeduction };
};

export const buildSalaryDraftPatch = (row: SalaryRow): SalaryDraftPatch => ({
  platformOrders: row.platformOrders,
  incentives: row.incentives,
  sickAllowance: row.sickAllowance,
  violations: row.violations,
  customDeductions: row.customDeductions,
  transfer: row.transfer,
  advanceDeduction: row.advanceDeduction,
  externalDeduction: row.externalDeduction,
  platformIncome: row.platformIncome,
  engineBaseSalary: row.engineBaseSalary,
  paymentMethod: row.paymentMethod,
});

export const buildSalaryRowSnapshot = (row: SalaryRow): SalaryRowSnapshot => ({
  bankAccount: row.bankAccount,
  hasIban: row.hasIban,
  paymentMethod: row.paymentMethod,
  platformOrders: row.platformOrders,
  platformSalaries: row.platformSalaries,
  platformMetrics: row.platformMetrics,
  incentives: row.incentives,
  sickAllowance: row.sickAllowance,
  violations: row.violations,
  customDeductions: row.customDeductions,
  transfer: row.transfer,
  advanceDeduction: row.advanceDeduction,
  externalDeduction: row.externalDeduction,
  platformIncome: row.platformIncome,
  engineBaseSalary: row.engineBaseSalary,
});

const valuesMatch = (left: unknown, right: unknown) => {
  if (left === right) return true;
  if (!left && !right) return true;
  if (
    left &&
    right &&
    typeof left === 'object' &&
    typeof right === 'object'
  ) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return false;
};

const rowDiffersFromDraft = (row: SalaryRow, patch: SalaryDraftPatch) =>
  Object.entries(patch).some(([key, value]) =>
    !valuesMatch((row as unknown as Record<string, unknown>)[key], value),
  );

export const buildSavedMap = (savedRecords: Array<{ employee_id: string } & SavedSalaryRecord> | null | undefined) => {
  const savedMap: Record<string, SavedSalaryRecord> = {};
  savedRecords?.forEach((r) => {
    savedMap[r.employee_id] = {
      is_approved: r.is_approved,
      net_salary: Number(r.net_salary || 0),
      base_salary: Number(r.base_salary || 0),
      allowances: Number(r.allowances || 0),
      attendance_deduction: Number(r.attendance_deduction || 0),
      advance_deduction: Number(r.advance_deduction || 0),
      external_deduction: Number(r.external_deduction || 0),
      manual_deduction: Number(r.manual_deduction || 0),
      payment_method: r.payment_method ?? null,
      sheet_snapshot: r.sheet_snapshot ?? null,
    };
  });
  return savedMap;
};

type PreviewMapEntry = {
  base_salary: number;
  advance_deduction: number;
  external_deduction: number;
  total_shift_days: number;
  platform_breakdown: Record<string, PlatformSalaryMetric>;
};

const toWorkType = (value: unknown): WorkType => {
  if (value === 'shift' || value === 'hybrid') return value;
  return 'orders';
};

const normalizePreviewPlatformBreakdown = (value: unknown) => {
  const breakdown: Record<string, PlatformSalaryMetric> = {};
  if (!Array.isArray(value)) return breakdown;

  (value as SalaryPreviewPlatformBreakdown[]).forEach((item) => {
    const appName = String(item.app_name || '').trim();
    if (!appName) return;

    breakdown[appName] = {
      appName,
      workType: toWorkType(item.work_type),
      calculationMethod: item.calculation_method ?? null,
      ordersCount: Number(item.orders_count || 0),
      shiftDays: Number(item.shift_days || 0),
      salary: Number(item.earnings || 0),
    };
  });

  return breakdown;
};

export const buildPreviewMap = (previewData: Array<Record<string, unknown>> | null | undefined) => {
  const previewMap: Record<string, PreviewMapEntry> = {};
  (previewData || []).forEach((row) => {
    const employeeId = String(row.employee_id || '');
    if (!employeeId) return;
    previewMap[employeeId] = {
      base_salary: Number(row.base_salary || 0),
      advance_deduction: Number(row.advance_deduction || 0),
      external_deduction: Number(row.external_deduction || 0),
      total_shift_days: Number(row.total_shift_days || 0),
      platform_breakdown: normalizePreviewPlatformBreakdown(row.platform_breakdown),
    };
  });
  return previewMap;
};

export const buildAttendanceDaysMap = (rows: Array<{ employee_id: string }> | null | undefined) => {
  const attendanceDaysMap: Record<string, number> = {};
  rows?.forEach((r) => {
    attendanceDaysMap[r.employee_id] = (attendanceDaysMap[r.employee_id] || 0) + 1;
  });
  return attendanceDaysMap;
};

export const buildFuelCostMap = (rows: Array<{ employee_id: string; fuel_cost: number | string }> | null | undefined) => {
  const fuelCostMap: Record<string, number> = {};
  rows?.forEach((r) => {
    fuelCostMap[r.employee_id] = (fuelCostMap[r.employee_id] || 0) + Number(r.fuel_cost);
  });
  return fuelCostMap;
};

export const buildOrdersMap = (rows: OrderWithAppRow[] | null | undefined) => {
  const ordMap: Record<string, Record<string, number>> = {};
  (rows || []).forEach((r) => {
    // Supabase returns foreign key relationship as object (not array)
    const appName = r.apps?.name;
    if (!appName) return;
    if (!ordMap[r.employee_id]) ordMap[r.employee_id] = {};
    ordMap[r.employee_id][appName] = (ordMap[r.employee_id][appName] || 0) + r.orders_count;
  });
  return ordMap;
};

type SalaryMonthVisibilityEmployee = {
  id: string;
  job_title?: string | null;
  sponsorship_status?: string | null;
};

const hasMonthlyPlatformPreviewActivity = (
  employeeId: string,
  previewMap: Record<string, PreviewMapEntry>,
) =>
  Object.values(previewMap[employeeId]?.platform_breakdown || {}).some(
    (metric) => (metric.ordersCount || 0) > 0 || (metric.shiftDays || 0) > 0,
  );

export const shouldIncludeEmployeeInSalaryMonth = (
  employee: SalaryMonthVisibilityEmployee,
  ordMap: Record<string, Record<string, number>>,
  attendanceDaysMap: Record<string, number>,
  previewMap: Record<string, PreviewMapEntry>,
  savedEmployeeIds?: ReadonlySet<string>,
) => {
  const hasOrders = Object.values(ordMap[employee.id] || {}).some((count) => count > 0);
  const hasAttendance = (attendanceDaysMap[employee.id] || 0) > 0;
  const hasPreviewActivity = hasMonthlyPlatformPreviewActivity(employee.id, previewMap);
  const hasMonthlyActivity = hasOrders || hasAttendance || hasPreviewActivity;
  if (hasMonthlyActivity) return true;
  if (savedEmployeeIds?.has(employee.id)) return true;
  if (isExcludedSponsorshipStatus(employee.sponsorship_status ?? null)) return false;
  return isAdministrativeJobTitle(employee.job_title ?? null);
};

export const filterSalaryMonthEmployees = <T extends SalaryMonthVisibilityEmployee>(
  employees: readonly T[],
  ordMap: Record<string, Record<string, number>>,
  attendanceDaysMap: Record<string, number>,
  previewMap: Record<string, PreviewMapEntry>,
  savedEmployeeIds?: ReadonlySet<string>,
) =>
  employees.filter((employee) =>
    shouldIncludeEmployeeInSalaryMonth(
      employee,
      ordMap,
      attendanceDaysMap,
      previewMap,
      savedEmployeeIds,
    ),
  );

export const resolveRowStatus = (
  saved: { is_approved: boolean; net_salary: number } | undefined,
  pendingInstallmentsCount: number,
  deductedInstallmentsCount: number
): SalaryRow['status'] => {
  if (!saved?.is_approved) return 'pending';
  if (deductedInstallmentsCount > 0 || pendingInstallmentsCount === 0) {
    return pendingInstallmentsCount === 0 ? 'paid' : 'approved';
  }
  return 'approved';
};

export const buildEmpPlatformSchemeMap = (
  employeeIds: string[],
  platformNames: string[],
  appSchemeMap: Record<string, SchemeData | null>
) => {
  const out: Record<string, Record<string, SchemeData | null>> = {};
  for (const employeeId of employeeIds) {
    out[employeeId] = {};
    for (const platformName of platformNames) {
      out[employeeId][platformName] = appSchemeMap[platformName] ?? null;
    }
  }
  return out;
};

export const buildAdvanceInstallmentMaps = async (
  selectedMonth: string,
  allAdvances: Array<{ id: string; employee_id: string }> | null | undefined
) => {
  const advInstIds: Record<string, string[]> = {};
  const deductedInstIds: Record<string, string[]> = {};
  const advRemainingMap: Record<string, number> = {};
  if (!allAdvances || allAdvances.length === 0) {
    return { advInstIds, deductedInstIds, advRemainingMap };
  }

  const advanceIds = allAdvances.map((a) => a.id);
  const advIdToEmpMap: Record<string, string> = {};
  for (const advance of allAdvances) advIdToEmpMap[advance.id] = advance.employee_id;

  const advInstData = await salaryDataService.getMonthInstallmentsForAdvances(selectedMonth, advanceIds);
  const allPendingInsts = await salaryDataService.getPendingInstallmentsForAdvances(advanceIds);

  allPendingInsts?.forEach((inst) => {
    const empId = advIdToEmpMap[inst.advance_id];
    if (!empId) return;
    advRemainingMap[empId] = (advRemainingMap[empId] || 0) + Number(inst.amount);
  });

  advInstData?.forEach((inst) => {
    const empId = advIdToEmpMap[inst.advance_id];
    if (!empId) return;
    if (inst.status === 'pending' || inst.status === 'deferred') {
      if (!advInstIds[empId]) advInstIds[empId] = [];
      advInstIds[empId].push(inst.id);
      return;
    }
    if (inst.status === 'deducted') {
      if (!deductedInstIds[empId]) deductedInstIds[empId] = [];
      deductedInstIds[empId].push(inst.id);
    }
  });

  return { advInstIds, deductedInstIds, advRemainingMap };
};

const resolvePlatformPreviewMetric = ({
  previewMetric,
}: {
  previewMetric?: PlatformSalaryMetric | null;
}): PlatformSalaryMetric | null => {
  return previewMetric ?? null;
};

export const buildSalaryRows = ({
  employees,
  selectedMonth,
  platformNames,
  appNameToId,
  appWorkTypeMap,
  rulesMap,
  appSchemeMap,
  ordMap,
  attendanceDaysMap,
  savedMap,
  previewMap,
  advInstIds,
  deductedInstIds,
  advRemainingMap,
  fuelCostMap,
}: {
  employees: Array<Record<string, unknown>>;
  selectedMonth: string;
  platformNames: string[];
  appNameToId: Record<string, string>;
  appWorkTypeMap: Record<string, WorkType>;
  rulesMap: Record<string, PricingRule[]>;
  appSchemeMap: Record<string, SchemeData | null>;
  ordMap: Record<string, Record<string, number>>;
  attendanceDaysMap: Record<string, number>;
  savedMap: Record<string, SavedSalaryRecord>;
  previewMap: Record<string, PreviewMapEntry>;
  advInstIds: Record<string, string[]>;
  deductedInstIds: Record<string, string[]>;
  advRemainingMap: Record<string, number>;
  fuelCostMap: Record<string, number>;
}) => {
  const newRows: SalaryRow[] = [];
  for (const emp of employees) {
    const employeeId = String(emp.id);
    const empOrders = ordMap[employeeId] || {};
    const attendanceDays = attendanceDaysMap[employeeId] || 0;
    const preview = previewMap[employeeId] ?? {
      base_salary: 0,
      advance_deduction: 0,
      external_deduction: 0,
      total_shift_days: 0,
      platform_breakdown: {},
    };

    const platformOrders: Record<string, number> = {};
    const platformSalaries: Record<string, number> = {};
    const platformMetrics: Record<string, PlatformSalaryMetric> = {};
    for (const platformName of platformNames) {
      const previewMetric = resolvePlatformPreviewMetric({
        previewMetric: preview?.platform_breakdown[platformName],
      });

      // Use preview for activity counts but ALWAYS calculate salary locally.
      // The DB RPC uses a hardcoded 150/day fallback which doesn't match the actual scheme.
      const orders = previewMetric
        ? getPrimaryPlatformActivityCount(previewMetric)
        : (empOrders[platformName] || 0);

      const salary = calculatePlatformSalary({
        platformName,
        orders,
        attendanceDays,
        platformNames,
        appNameToId,
        rulesMap,
        appSchemeMap,
        platformSalaries,
      });

      const metric: PlatformSalaryMetric = {
        appName: platformName,
        workType: previewMetric?.workType || appWorkTypeMap[platformName] || 'orders',
        calculationMethod: previewMetric?.calculationMethod || null,
        ordersCount: previewMetric?.ordersCount ?? orders,
        shiftDays: previewMetric?.shiftDays ?? 0,
        salary,
      };

      platformMetrics[platformName] = metric;
      platformOrders[platformName] = orders;
      platformSalaries[platformName] = salary;
    }

    const saved = savedMap[employeeId];
    const savedSnapshot = readSavedSnapshot(saved?.sheet_snapshot);
    const pendingInstallmentsCount = (advInstIds[employeeId] || []).length;
    const deductedInstallmentsCount = (deductedInstIds[employeeId] || []).length;
    const status = resolveRowStatus(saved, pendingInstallmentsCount, deductedInstallmentsCount);
    const hasIban = !!emp.iban;
    const rawCity = (emp.city as string | null | undefined) ?? null;
    const cityKey: 'makkah' | 'jeddah' | null = rawCity === 'makkah' || rawCity === 'jeddah' ? rawCity : null;
    const preferredLanguage = (emp as { preferred_language?: SlipLanguage | null }).preferred_language || 'ar';
    const phone = (emp as { phone?: string | null }).phone || null;
    const workDays = Math.max(attendanceDays, preview.total_shift_days || 0);
    const fallbackPaymentMethod = hasIban ? 'bank' : 'cash';
    const baseRow: SalaryRow = {
      id: `${employeeId}-${selectedMonth}`,
      employeeId,
      employeeName: String(emp.name || ''),
      jobTitle: String(emp.job_title || 'مندوب توصيل'),
      nationalId: String(emp.national_id || '•'),
      city: toCityArabicLabel(rawCity),
      cityKey,
      bankAccount: emp.iban ? String(emp.iban).slice(-6) : '',
      hasIban,
      paymentMethod: normalizePaymentMethod(saved?.payment_method, fallbackPaymentMethod),
      registeredApps: platformNames.filter((platformName) => hasPlatformActivity(platformMetrics[platformName])),
      platformOrders,
      platformSalaries,
      platformMetrics,
      incentives: Number(saved?.allowances || 0),
      sickAllowance: 0,
      violations: Number(saved?.attendance_deduction || 0),
      customDeductions: getFallbackSavedCustomDeductions(Number(saved?.manual_deduction || 0)),
      transfer: 0,
      advanceDeduction: Number(saved?.advance_deduction ?? preview.advance_deduction ?? 0),
      advanceInstallmentIds: advInstIds[employeeId] || [],
      advanceRemaining: advRemainingMap[employeeId] || 0,
      externalDeduction: Number(saved?.external_deduction ?? preview.external_deduction ?? 0),
      status,
      preferredLanguage,
      phone,
      workDays,
      fuelCost: fuelCostMap[employeeId] || 0,
      platformIncome: 0,
      engineBaseSalary: Number(saved?.base_salary ?? preview.base_salary ?? 0),
      preferEngineBaseSalary: !!saved && !savedSnapshot && Number(saved.base_salary || 0) > 0,
    };

    const mergedRow = savedSnapshot
      ? {
          ...baseRow,
          ...savedSnapshot,
          paymentMethod: normalizePaymentMethod(savedSnapshot.paymentMethod, baseRow.paymentMethod),
          status,
          preferredLanguage,
          phone,
          city: toCityArabicLabel(rawCity),
          cityKey,
          advanceInstallmentIds: advInstIds[employeeId] || [],
          advanceRemaining: advRemainingMap[employeeId] || 0,
          workDays,
          fuelCost: fuelCostMap[employeeId] || 0,
          preferEngineBaseSalary: false,
        }
      : baseRow;

    mergedRow.registeredApps = platformNames.filter((platformName) =>
      hasPlatformActivity(mergedRow.platformMetrics[platformName]),
    );

    newRows.push(mergedRow);
  }

  return newRows;
};

const readLocalSalaryDraftMap = (storageKey?: string): Record<string, SalaryDraftPatch> => {
  if (!storageKey || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, SalaryDraftPatch>;
  } catch (e) {
    logError('[Salaries] Failed to read drafts from localStorage', e, { level: 'warn' });
    return {};
  }
};

export const hydrateRowsWithDraft = async (
  rows: SalaryRow[],
  monthYear: string,
  storageKey?: string,
) => {
  const localDraftMap = readLocalSalaryDraftMap(storageKey);
  const applyDraftPatch = (row: SalaryRow, patch?: SalaryDraftPatch) => {
    if (!patch) return row;
    const normalizedPatch = {
      ...buildSalaryDraftPatch(row),
      ...patch,
    };
    if (!rowDiffersFromDraft(row, normalizedPatch)) {
      return row;
    }
    return { ...row, ...normalizedPatch, isDirty: true };
  };

  try {
    const serverDraftMap = await salaryDraftService.getDraftsForMonth(monthYear);
    return rows.map((row) => applyDraftPatch(row, serverDraftMap[row.id] ?? localDraftMap[row.id]));
  } catch (e) {
    logError('[Salaries] Failed to load drafts from server', e, { level: 'warn' });
    return rows.map((row) => applyDraftPatch(row, localDraftMap[row.id]));
  }
};

export const buildAppMaps = (appsWithScheme: AppWithSchemeRow[] | null | undefined) => {
  const appSchemeMap: Record<string, SchemeData | null> = {};
  const appNameToId: Record<string, string> = {};
  const appWorkTypeMap: Record<string, WorkType> = {};
  (appsWithScheme || []).forEach((app) => {
    appSchemeMap[app.name] = app.salary_schemes ?? null;
    appNameToId[app.name] = app.id;
    appWorkTypeMap[app.name] = toWorkType(app.work_type);
  });
  return { appSchemeMap, appNameToId, appWorkTypeMap };
};

export const fetchPricingRulesMap = async (appNameToId: Record<string, string>) => {
  const appIds = Object.values(appNameToId);
  const rulesByApp = await Promise.all(
    appIds.map(async (appId) => {
      const rules = await salaryService.getPricingRules(appId);
      return { appId, rules: rules || [] };
    })
  );
  const rulesMap: Record<string, PricingRule[]> = {};
  rulesByApp.forEach(({ appId, rules }) => {
    rulesMap[appId] = rules;
  });
  return rulesMap;
};

export const getManualDeductionTotal = (row: SalaryRow) =>
  Object.values(row.customDeductions || {}).reduce((sum, value) => sum + value, 0);

export const getTotalDeductions = (row: SalaryRow) =>
  row.advanceDeduction + row.externalDeduction + row.violations + getManualDeductionTotal(row);

export const buildPlatformSetupWarnings = ({
  apps,
  rulesMap,
  rows,
}: {
  apps: AppWithSchemeRow[];
  rulesMap: Record<string, PricingRule[]>;
  rows: SalaryRow[];
}) => {
  const relevantAppNames = new Set(
    rows.flatMap((row) => row.registeredApps)
  );

  if (relevantAppNames.size === 0) {
    return {
      appsWithoutPricingRules: [],
      appsWithoutScheme: [],
    };
  }

  const relevantApps = apps.filter((app) => relevantAppNames.has(app.name));

  return {
    appsWithoutPricingRules: relevantApps
      .filter((app) => {
        const needsPricingRule = app.work_type === 'shift' || app.work_type === 'hybrid';
        if (!needsPricingRule) return false;
        return !rulesMap[app.id] || rulesMap[app.id].length === 0;
      })
      .map((app) => app.name),
    appsWithoutScheme: relevantApps
      .filter((app) => {
        const needsScheme = app.work_type === 'orders' || app.work_type === 'hybrid' || !app.work_type;
        if (!needsScheme) return false;
        return !app.salary_schemes;
      })
      .map((app) => app.name),
  };
};

export async function prepareSalaryState({
  salaryBaseContext,
  selectedMonth,
  activeEmployeeIdsInMonth,
  salariesDraftKey: _salariesDraftKey,
}: {
  salaryBaseContext: SalaryBaseContextData;
  selectedMonth: string;
  activeEmployeeIdsInMonth: ReadonlySet<string> | undefined;
  salariesDraftKey?: string;
}): Promise<PreparedSalaryState> {
  const { monthlyContext, previewData } = salaryBaseContext;
  const { employees: empRows, orders, appsWithSchemeRes, attendanceRows, fuelRes, savedRecords, allAdvances } = monthlyContext;
  const savedMap = buildSavedMap(
    savedRecords as Array<{ employee_id: string } & SavedSalaryRecord> | null | undefined,
  );
  const previewMap = buildPreviewMap((previewData || []) as Array<Record<string, unknown>>);
  const { advInstIds, deductedInstIds, advRemainingMap } = await buildAdvanceInstallmentMaps(
    selectedMonth,
    (allAdvances as Array<{ id: string; employee_id: string }> | null | undefined) || []
  );

  const monthStartIso = `${selectedMonth}-01`;
  const attendanceDaysMap = buildAttendanceDaysMap(attendanceRows as Array<{ employee_id: string }> | null | undefined);
  const fuelCostMap = buildFuelCostMap(fuelRes as Array<{ employee_id: string; fuel_cost: number | string }> | null | undefined);
  const ordMap = buildOrdersMap(orders as OrderWithAppRow[] | null);
  const savedEmployeeIds = new Set(Object.keys(savedMap));
  const visibleEmployees = filterRetainedEmployeesForSalaryMonth(
    (empRows || []) as {
      id: string;
      status?: string | null;
      job_title?: string | null;
      sponsorship_status?: string | null;
      probation_end_date?: string | null;
    }[],
    monthStartIso,
    activeEmployeeIdsInMonth
  );
  const employees = filterSalaryMonthEmployees(
    visibleEmployees,
    ordMap,
    attendanceDaysMap,
    previewMap,
    savedEmployeeIds,
  );
  const appsFromApi = (appsWithSchemeRes as AppWithSchemeRow[] | null) || [];
  const { appSchemeMap, appNameToId, appWorkTypeMap } = buildAppMaps(appsFromApi);
  const platformNames = appsFromApi.map((a) => a.name);
  const rulesMap = await fetchPricingRulesMap(appNameToId);
  const builtEmpPlatformScheme = buildEmpPlatformSchemeMap(employees.map((emp) => emp.id), platformNames, appSchemeMap);
  const newRows = buildSalaryRows({
    employees: employees as Array<Record<string, unknown>>,
    selectedMonth,
    platformNames,
    appNameToId,
    appWorkTypeMap,
    rulesMap,
    appSchemeMap,
    ordMap,
    attendanceDaysMap,
    savedMap,
    previewMap,
    advInstIds,
    deductedInstIds,
    advRemainingMap,
    fuelCostMap,
  });
  const hydratedRows = await hydrateRowsWithDraft(newRows, selectedMonth, _salariesDraftKey);
  const { appsWithoutPricingRules, appsWithoutScheme } = buildPlatformSetupWarnings({
    apps: appsFromApi,
    rulesMap,
    rows: hydratedRows,
  });

  return {
    appNameToId,
    rulesMap,
    appsWithoutPricingRules,
    appsWithoutScheme,
    builtEmpPlatformScheme,
    hydratedRows,
  };
}
