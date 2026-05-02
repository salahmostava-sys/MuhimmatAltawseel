import type { App, DailyData } from '@modules/orders/types';

export type AppEmployeeIdsMap = Record<string, ReadonlySet<string>>;

export type SpreadsheetMergeResult = {
  newData: DailyData;
  imported: number;
  skipped: number;
  errors: string[];
};

type ImportTargetResolution = {
  targetApps: App[];
  error?: string;
};

function getEmployeeAssignedApps(
  empId: string,
  apps: App[],
  appEmployeeIds: AppEmployeeIdsMap,
): App[] {
  return apps.filter((app) => appEmployeeIds[app.id]?.has(empId));
}

function clearEmployeeAppMonthData(
  nextData: DailyData,
  empId: string,
  appId: string,
  dayArr: number[],
) {
  dayArr.forEach((day) => {
    nextData.delete(`${empId}::${appId}::${day}`);
  });
}

function resolveImportTargetAppsForEmployee(params: {
  empId: string;
  apps: App[];
  targetAppId?: string;
  appEmployeeIds: AppEmployeeIdsMap;
}): ImportTargetResolution {
  const { empId, apps, targetAppId, appEmployeeIds } = params;

  if (targetAppId) {
    const targetApp = apps.find((app) => app.id === targetAppId);
    if (!targetApp) {
      return {
        targetApps: [],
        error: 'المنصة المحددة غير متاحة للاستيراد',
      };
    }

    // Allow import even if employee is not assigned to the platform
    // The assignment check was blocking valid imports
    return { targetApps: [targetApp] };
  }

  const assignedApps = getEmployeeAssignedApps(empId, apps, appEmployeeIds);

  if (assignedApps.length === 0) {
    // No assigned apps — if there's only one app total, use it
    if (apps.length === 1) {
      return { targetApps: [apps[0]] };
    }
    return {
      targetApps: [],
      error: 'لا توجد منصة مربوطة بهذا الموظف — اختر منصة محددة عند الاستيراد',
    };
  }

  if (assignedApps.length > 1) {
    return {
      targetApps: [],
      error: 'الموظف مسجل على أكثر من منصة — اختر منصة محددة عند الاستيراد',
    };
  }

  return { targetApps: assignedApps };
}

export function mergeImportedOrdersFromMatrixWithMapping(params: {
  matrixRows: unknown[];
  dayArr: number[];
  apps: App[];
  prev: DailyData;
  targetAppId?: string;
  nameMapping: Map<string, string>;
  appEmployeeIds: AppEmployeeIdsMap;
}): SpreadsheetMergeResult {
  const { matrixRows, dayArr, apps, prev, targetAppId, nameMapping, appEmployeeIds } = params;

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const newData = { ...prev };
  const clearedScopes = new Set<string>();

  if (apps.length === 0) {
    errors.push('لا توجد منصات طلبات نشطة');
    return { newData, imported, skipped, errors };
  }

  for (let rowIdx = 0; rowIdx < matrixRows.length; rowIdx++) {
    const row = matrixRows[rowIdx];
    const line = Array.isArray(row) ? row : [];
    const empName = String(line[0] ?? '').trim();

    if (!empName) {
      skipped++;
      continue;
    }

    const empId = nameMapping.get(empName);
    if (!empId) {
      skipped++;
      errors.push(`صف ${rowIdx + 2}: الموظف "${empName}" غير موجود`);
      continue;
    }

    const { targetApps, error } = resolveImportTargetAppsForEmployee({
      empId,
      apps,
      targetAppId,
      appEmployeeIds,
    });

    if (error) {
      skipped++;
      errors.push(`صف ${rowIdx + 2}: ${error}`);
      continue;
    }

    let hasValidData = false;

    for (const app of targetApps) {
      const scopeKey = `${empId}::${app.id}`;
      if (clearedScopes.has(scopeKey)) continue;
      clearEmployeeAppMonthData(newData, empId, app.id, dayArr);
      clearedScopes.add(scopeKey);
    }

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
        errors.push(`صف ${rowIdx + 2}, يوم ${d}: عدد الطلبات ${val} كبير جدا`);
        continue;
      }

      hasValidData = true;
      for (const app of targetApps) {
        newData[`${empId}::${app.id}::${d}`] = val;
        imported++;
      }
    }

    if (!hasValidData) {
      skipped++;
    }
  }

  return { newData, imported, skipped, errors };
}
