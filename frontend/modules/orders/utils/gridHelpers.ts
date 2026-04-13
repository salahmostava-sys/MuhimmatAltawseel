import type { App, DailyData, Employee, EmployeeAppAssignmentRow, OrderRawRow, OrdersEmployeeSortField } from '@modules/orders/types';

export const buildAppEmployeeIdsMap = (rows: EmployeeAppAssignmentRow[]): Record<string, Set<string>> => {
  const map: Record<string, Set<string>> = {};
  rows.forEach((row) => {
    if (!map[row.app_id]) map[row.app_id] = new Set();
    map[row.app_id].add(row.employee_id);
  });
  return map;
};

export function collectEmployeeIdsWithOrdersOnApp(data: DailyData, appId: string): Set<string> {
  const ids = new Set<string>();
  for (const key of Object.keys(data)) {
    const parts = key.split('::');
    if (parts.length !== 3) continue;
    const [empId, rowAppId] = parts;
    if (rowAppId !== appId) continue;
    if ((data[key] ?? 0) > 0) ids.add(empId);
  }
  return ids;
}

export const buildDailyDataMap = (rows: OrderRawRow[]): DailyData => {
  const mapped: DailyData = {};
  rows.forEach((row) => {
    // Parse day directly from ISO date string to avoid timezone issues with new Date()
    const day = parseInt(row.date.slice(8, 10), 10);
    const key = `${row.employee_id}::${row.app_id}::${day}`;
    // Use latest value (not sum) — daily_orders has unique constraint on employee_id+app_id+date
    // Summing caused doubled counts when the same row appeared in query results
    mapped[key] = row.orders_count ?? 0;
  });
  return mapped;
};

export const filterDailyDataByAppIds = (data: DailyData, appIds: ReadonlySet<string>): DailyData => {
  if (appIds.size === 0) return {};

  const filtered: DailyData = {};
  Object.entries(data).forEach(([key, value]) => {
    const [, appId] = key.split('::');
    if (appId && appIds.has(appId)) {
      filtered[key] = value;
    }
  });
  return filtered;
};

export const calculatePlatformTotals = (
  apps: App[],
  filteredEmployees: Employee[],
  _dayArr: number[],
  data: DailyData,
): Record<string, number> => {
  // O(data keys) scan instead of O(employees × days × apps) triple loop
  const appIds = new Set(apps.map((app) => app.id));
  const empIds = new Set(filteredEmployees.map((emp) => emp.id));
  const totals: Record<string, number> = {};
  for (const id of appIds) totals[id] = 0;

  for (const [key, val] of Object.entries(data)) {
    const parts = key.split('::');
    if (parts.length !== 3) continue;
    const [empId, appId] = parts;
    if (appIds.has(appId) && empIds.has(empId)) {
      totals[appId] = (totals[appId] ?? 0) + val;
    }
  }
  return totals;
};

export function getOrdersEmployeeSortPair(
  a: Employee,
  b: Employee,
  sortField: OrdersEmployeeSortField,
  empTotal: (id: string) => number,
  dayArr: number[],
  data: DailyData,
): [number | string, number | string] {
  if (sortField === 'name') {
    return [a.name, b.name];
  }
  if (sortField === 'total') {
    return [empTotal(a.id), empTotal(b.id)];
  }
  const appId = sortField.replace('app:', '');
  const aSum = dayArr.reduce((s, d) => s + (data[`${a.id}::${appId}::${d}`] ?? 0), 0);
  const bSum = dayArr.reduce((s, d) => s + (data[`${b.id}::${appId}::${d}`] ?? 0), 0);
  return [aSum, bSum];
}
