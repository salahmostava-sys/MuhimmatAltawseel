import {
  salaryService,
  type PricingRule,
  type SalaryPreviewPlatformBreakdown,
  type SalarySchemeTier,
} from '@services/salaryService';
import { salaryDataService } from '@services/salaryDataService';
import { filterVisibleEmployeesForSalaryMonth } from '@shared/lib/employeeVisibility';
import {
  getPrimaryPlatformActivityCount,
  hasPlatformActivity,
  toCityArabicLabel,
} from '@modules/salaries/model/salaryUtils';
import { logError } from '@shared/lib/logger';
import type { SlipLanguage } from '@shared/lib/salarySlipTranslations';
import type {
  AppWithSchemeRow,
  OrderWithAppRow,
  PlatformSalaryMetric,
  PreparedSalaryState,
  SalaryBaseContextData,
  SalaryRow,
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

export const buildSavedMap = (savedRecords: Array<{ employee_id: string; is_approved: boolean; net_salary: number }> | null | undefined) => {
  const savedMap: Record<string, { is_approved: boolean; net_salary: number }> = {};
  savedRecords?.forEach((r) => {
    savedMap[r.employee_id] = { is_approved: r.is_approved, net_salary: r.net_salary };
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
  savedMap: Record<string, { is_approved: boolean; net_salary: number }>;
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
    const preview = previewMap[employeeId];

    const platformOrders: Record<string, number> = {};
    const platformSalaries: Record<string, number> = {};
    const platformMetrics: Record<string, PlatformSalaryMetric> = {};
    for (const platformName of platformNames) {
      const previewMetric = preview?.platform_breakdown[platformName];
      if (previewMetric) {
        platformMetrics[platformName] = previewMetric;
        platformOrders[platformName] = getPrimaryPlatformActivityCount(previewMetric);
        platformSalaries[platformName] = Math.round(previewMetric.salary);
        continue;
      }

      const orders = empOrders[platformName] || 0;
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

      const fallbackMetric: PlatformSalaryMetric = {
        appName: platformName,
        workType: appWorkTypeMap[platformName] || 'orders',
        calculationMethod: null,
        ordersCount: orders,
        shiftDays: 0,
        salary,
      };

      platformMetrics[platformName] = fallbackMetric;
      platformOrders[platformName] = getPrimaryPlatformActivityCount(fallbackMetric);
      platformSalaries[platformName] = salary;
    }

    const registeredApps = platformNames.filter((platformName) => hasPlatformActivity(platformMetrics[platformName]));

    const saved = savedMap[employeeId];
    const pendingInstallmentsCount = (advInstIds[employeeId] || []).length;
    const deductedInstallmentsCount = (deductedInstIds[employeeId] || []).length;
    const status = resolveRowStatus(saved, pendingInstallmentsCount, deductedInstallmentsCount);
    const hasIban = !!emp.iban;
    const rawCity = (emp.city as string | null | undefined) ?? null;
    const cityKey: 'makkah' | 'jeddah' | null = rawCity === 'makkah' || rawCity === 'jeddah' ? rawCity : null;
    const preferredLanguage = ((emp as { preferred_language?: SlipLanguage | null }).preferred_language || 'ar') as SlipLanguage;
    const phone = (emp as { phone?: string | null }).phone || null;
    const workDays = Math.max(attendanceDays, preview.total_shift_days || 0);

    newRows.push({
      id: `${employeeId}-${selectedMonth}`,
      employeeId,
      employeeName: String(emp.name || ''),
      jobTitle: String(emp.job_title || 'مندوب توصيل'),
      nationalId: String(emp.national_id || '—'),
      city: toCityArabicLabel(rawCity),
      cityKey,
      bankAccount: emp.iban ? String(emp.iban).slice(-6) : '',
      hasIban,
      paymentMethod: hasIban ? 'bank' : 'cash',
      registeredApps,
      platformOrders,
      platformSalaries,
      platformMetrics,
      incentives: 0,
      sickAllowance: 0,
      violations: 0,
      customDeductions: {},
      transfer: 0,
      advanceDeduction: preview.advance_deduction,
      advanceInstallmentIds: advInstIds[employeeId] || [],
      advanceRemaining: advRemainingMap[employeeId] || 0,
      externalDeduction: preview.external_deduction,
      status,
      preferredLanguage,
      phone,
      workDays,
      fuelCost: fuelCostMap[employeeId] || 0,
      platformIncome: 0,
      engineBaseSalary: preview.base_salary,
    });
  }

  return newRows;
};

import { salaryDraftService } from '@services/salaryDraftService';

export const hydrateRowsWithDraft = async (rows: SalaryRow[], monthYear: string) => {
  try {
    const draftMap = await salaryDraftService.getDraftsForMonth(monthYear);
    return rows.map((row) => {
      const patch = draftMap[row.id];
      return patch ? { ...row, ...patch, isDirty: true } : row;
    });
  } catch (e) {
    logError('[Salaries] Failed to load drafts from server', e, { level: 'warn' });
    return rows;
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
  const savedMap = buildSavedMap(savedRecords as Array<{ employee_id: string; is_approved: boolean; net_salary: number }> | null | undefined);
  const previewMap = buildPreviewMap((previewData || []) as Array<Record<string, unknown>>);
  const { advInstIds, deductedInstIds, advRemainingMap } = await buildAdvanceInstallmentMaps(
    selectedMonth,
    (allAdvances as Array<{ id: string; employee_id: string }> | null | undefined) || []
  );

  const monthStartIso = `${selectedMonth}-01`;
  const employees = filterVisibleEmployeesForSalaryMonth(
    (empRows || []) as { id: string; sponsorship_status?: string | null; probation_end_date?: string | null }[],
    monthStartIso,
    activeEmployeeIdsInMonth
  );
  if (employees.some((emp) => !previewMap[emp.id])) {
    throw new Error('PREVIEW_BACKEND: تعذر تحميل نتائج المعاينة من الخادم لكل الموظفين');
  }

  const attendanceDaysMap = buildAttendanceDaysMap(attendanceRows as Array<{ employee_id: string }> | null | undefined);
  const fuelCostMap = buildFuelCostMap(fuelRes as Array<{ employee_id: string; fuel_cost: number | string }> | null | undefined);
  const ordMap = buildOrdersMap(orders as OrderWithAppRow[] | null);
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
  const hydratedRows = await hydrateRowsWithDraft(newRows, selectedMonth);
  const appsWithoutPricingRules = appsFromApi.filter((a) => !rulesMap[a.id] || rulesMap[a.id].length === 0).map((a) => a.name);
  const appsWithoutScheme = appsFromApi.filter((a) => !a.salary_schemes).map((a) => a.name);

  return {
    appNameToId,
    rulesMap,
    appsWithoutPricingRules,
    appsWithoutScheme,
    builtEmpPlatformScheme,
    hydratedRows,
  };
}
