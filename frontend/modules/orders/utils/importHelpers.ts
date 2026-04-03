import type { App, DailyData, Employee } from '@modules/orders/types';
import { toCellText } from '@modules/orders/utils/text';

export function ordersImportHeadersMatch(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((h, i) => h === expected[i]);
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
    
    let hasValidData = false;
    for (let idx = 0; idx < dayArr.length; idx++) {
      const d = dayArr[idx];
      const cellValue = line[idx + 1];
      const val = Number(cellValue);
      
      if (Number.isNaN(val)) {
        if (cellValue !== '' && cellValue !== null && cellValue !== undefined) {
          errors.push(`صف ${rowIdx + 2}, يوم ${d}: قيمة غير صحيحة "${cellValue}"`);
        }
        continue;
      }
      
      if (val <= 0) continue;
      
      if (val > 10000) {
        errors.push(`صف ${rowIdx + 2}, يوم ${d}: عدد الطلبات ${val} كبير جداً`);
        continue;
      }
      
      hasValidData = true;
      for (const app of targetApps) {
        newData[`${emp.id}::${app.id}::${d}`] = val;
        imported++;
      }
    }
    
    if (!hasValidData) {
      skipped++;
    }
  }
  
  return { newData, imported, skipped, errors };
}
