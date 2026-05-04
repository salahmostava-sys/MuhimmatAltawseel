import type { App, DailyData, Employee } from '@modules/orders/types';
import { toCellText } from '@modules/orders/utils/text';

export function ordersImportHeadersMatch(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((h, i) => h === expected[i]);
}

type CellValidationResult = {
  valid: boolean;
  value: number;
  error?: string;
};

function validateCell(cellValue: unknown, rowIdx: number, day: number): CellValidationResult {
  const val = Number(cellValue);

  if (Number.isNaN(val)) {
    if (cellValue !== '' && cellValue !== null && cellValue !== undefined) {
      return { valid: false, value: 0, error: `صف ${rowIdx + 2}, يوم ${day}: قيمة غير صحيحة "${cellValue}"` };
    }
    return { valid: false, value: 0 };
  }

  if (val <= 0) return { valid: false, value: 0 };

  if (val > 10000) {
    return { valid: false, value: 0, error: `صف ${rowIdx + 2}, يوم ${day}: عدد الطلبات ${val} كبير جداً` };
  }

  return { valid: true, value: val };
}

function processRowCells(
  line: unknown[],
  dayArr: number[],
  rowIdx: number,
  empId: string,
  targetApps: App[],
  newData: DailyData,
): { imported: number; hasValidData: boolean; errors: string[] } {
  let imported = 0;
  let hasValidData = false;
  const errors: string[] = [];

  for (let idx = 0; idx < dayArr.length; idx++) {
    const d = dayArr[idx];
    const cellValue = line[idx + 1];
    const result = validateCell(cellValue, rowIdx, d);

    if (result.error) errors.push(result.error);
    if (!result.valid) continue;

    hasValidData = true;
    for (const app of targetApps) {
      newData[`${empId}::${app.id}::${d}`] = result.value;
      imported++;
    }
  }

  return { imported, hasValidData, errors };
}

export function mergeImportedOrdersFromMatrix(
  matrixRows: unknown[],
  dayArr: number[],
  employees: Employee[],
  apps: App[],
  prev: DailyData,
  targetAppId?: string,
): { newData: DailyData; imported: number; skipped: number; errors: string[] } {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const newData = { ...prev };
  const targetApps = targetAppId ? apps.filter((a) => a.id === targetAppId) : apps;
  
  if (targetApps.length === 0) {
    errors.push('لا توجد منصات نشطة');
    return { newData, imported, skipped, errors };
  }

  for (let rowIdx = 0; rowIdx < matrixRows.length; rowIdx++) {
    const row = matrixRows[rowIdx];
    const line = Array.isArray(row) ? row : [];
    const empName = toCellText(line[0]);
    
    if (!empName) {
      skipped++;
      continue;
    }

    const emp = employees.find((employee) => employee.name === empName);
    if (!emp) {
      skipped++;
      errors.push(`صف ${rowIdx + 2}: الموظف "${empName}" غير موجود`);
      continue;
    }
    
    const result = processRowCells(line, dayArr, rowIdx, emp.id, targetApps, newData);
    imported += result.imported;
    errors.push(...result.errors);
    
    if (!result.hasValidData) {
      skipped++;
    }
  }
  
  return { newData, imported, skipped, errors };
}
