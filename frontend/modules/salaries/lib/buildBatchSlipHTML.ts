import { getSlipTranslations } from '@shared/lib/salarySlipTranslations';
import { buildSalarySlipHTML } from '@modules/salaries/lib/buildSalarySlipHTML';
import { buildSlipFieldsFromRow, buildSlipEmployeeInfo } from '@modules/salaries/lib/buildSalarySlipFields';
import { getDisplayedBaseSalary } from '@modules/salaries/model/salaryUtils';
import type { SalaryRow } from '@modules/salaries/types/salary.types';

export function buildBatchSlipHTML(row: SalaryRow, batchMonth: string, projectName: string): string {
  const t = getSlipTranslations(row.preferredLanguage);

  const platformRows = row.registeredApps
    .filter((app) => (row.platformOrders[app] || 0) > 0)
    .map((app) => ({
      name: app,
      orders: row.platformOrders[app] || 0,
      salary: row.platformSalaries[app] || 0,
    }));

  // FIX #5: use getDisplayedBaseSalary so admin employees with engineBaseSalary
  // but no platform orders get the correct salary in batch PDF export.
  const totalPlatformSalary = getDisplayedBaseSalary(row);
  const totalEarnings = totalPlatformSalary + row.incentives + row.sickAllowance;
  const allDeductionVals = [
    row.advanceDeduction,
    row.externalDeduction,
    row.violations,
    ...Object.values(row.customDeductions || {}),
  ];
  const totalDeductions = allDeductionVals.reduce((sum, deduction) => sum + deduction, 0);
  const netSalary = totalEarnings - totalDeductions;
  const remaining = netSalary - row.transfer;

  const computed = {
    totalPlatformSalary,
    totalAdditions: row.incentives + row.sickAllowance,
    totalWithSalary: totalEarnings,
    totalDeductions,
    netSalary,
    remaining,
  };

  const fields = buildSlipFieldsFromRow(row, computed, t);
  const monthField = fields.find((field) => field.key === 'month');
  if (monthField) {
    monthField.value = batchMonth;
  }

  const employeeInfo = buildSlipEmployeeInfo(row, batchMonth, projectName);

  return buildSalarySlipHTML({
    employee: employeeInfo,
    fields,
    platforms: platformRows,
    projectName,
  });
}
