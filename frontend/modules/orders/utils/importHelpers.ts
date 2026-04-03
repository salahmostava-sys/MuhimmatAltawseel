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
): { newData: DailyData; imported: number } {
  let imported = 0;
  const newData = { ...prev };
  const targetApps = targetAppId ? apps.filter((a) => a.id === targetAppId) : apps;
  
  for (const row of matrixRows) {
    const line = Array.isArray(row) ? row : [];
    const empName = toCellText(line[0]);
    const emp = employees.find((employee) => employee.name === empName);
    if (!emp) continue;
    for (let idx = 0; idx < dayArr.length; idx++) {
      const d = dayArr[idx];
      const val = Number(line[idx + 1]);
      if (val <= 0) continue;
      for (const app of targetApps) {
        newData[`${emp.id}::${app.id}::${d}`] = val;
        imported++;
      }
    }
  }
  return { newData, imported };
}
