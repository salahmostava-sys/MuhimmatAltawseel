import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '@services/orderService';
import { filterRetainedEmployeesForMonth, isEmployeeVisibleInMonth } from '@shared/lib/employeeVisibility';
import { isOrderCapableApp } from '@shared/lib/workType';
import { defaultQueryRetry } from '@shared/lib/query';
import type { App, DailyData, Employee, EmployeeAppAssignmentRow, OrderRawRow } from '@modules/orders/types';
import { buildAppEmployeeIdsMap, buildDailyDataMap, filterDailyDataByAppIds } from '@modules/orders/utils/gridHelpers';
import { monthYear } from '@modules/orders/utils/dateMonth';
import { ordersQueryKeys } from '@modules/orders/hooks/ordersQueryKeys';

export function useSpreadsheetQueries(
  uid: string,
  enabled: boolean,
  year: number,
  month: number,
  activeEmployeeIdsInMonth: ReadonlySet<string> | undefined,
) {
  const qk = ordersQueryKeys(uid);

  const {
    data: spreadsheetBaseData,
    error: spreadsheetBaseError,
    isLoading: spreadsheetBaseLoading,
  } = useQuery({
    queryKey: qk.spreadsheetBase,
    enabled,
    queryFn: async () => {
      const [employees, apps, employeeApps] = await Promise.all([
        orderService.getBaseEmployees(),
        orderService.getActiveApps(),
        orderService.getEmployeeAppAssignments(),
      ]);
      return {
        employees: (employees || []) as Employee[],
        apps: (apps || []) as App[],
        employeeApps: (employeeApps || []) as EmployeeAppAssignmentRow[],
      };
    },
    select: (base) => {
      const apps = base.apps.filter(isOrderCapableApp);
      const appIds = new Set(apps.map((app) => app.id));

      return {
        employees: base.employees,
        apps,
        appEmployeeIdsMap: buildAppEmployeeIdsMap(
          base.employeeApps.filter((assignment) => appIds.has(assignment.app_id)),
        ),
      };
    },
    retry: defaultQueryRetry,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const {
    data: spreadsheetMonthRawData = {},
    error: spreadsheetMonthError,
    isLoading: spreadsheetMonthLoading,
  } = useQuery({
    queryKey: qk.spreadsheetMonthRaw(year, month),
    enabled,
    queryFn: async () => {
      const rows = await orderService.getMonthRaw(year, month);
      return (rows || []) as OrderRawRow[];
    },
    select: (rows) => buildDailyDataMap(rows),
    retry: defaultQueryRetry,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: spreadsheetMonthLock = false, error: spreadsheetLockError } = useQuery({
    queryKey: qk.spreadsheetMonthLock(year, month),
    enabled,
    queryFn: () => {
      const my = monthYear(year, month);
      return orderService.getMonthLockStatus(my);
    },
    select: (res) => res.locked,
    retry: defaultQueryRetry,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const loading = spreadsheetBaseLoading || spreadsheetMonthLoading;

  const apps = useMemo<App[]>(() => spreadsheetBaseData?.apps ?? [], [spreadsheetBaseData]);
  const orderAppIds = useMemo(() => new Set(apps.map((app) => app.id)), [apps]);
  const appEmployeeIds = useMemo(
    () => spreadsheetBaseData?.appEmployeeIdsMap ?? {},
    [spreadsheetBaseData],
  );
  const spreadsheetMonthData = useMemo(
    () => filterDailyDataByAppIds(spreadsheetMonthRawData as DailyData, orderAppIds),
    [orderAppIds, spreadsheetMonthRawData],
  );
  const employees = useMemo<Employee[]>(
    () => {
      const baseEmps = spreadsheetBaseData?.employees ?? [];
      return filterRetainedEmployeesForMonth(baseEmps, activeEmployeeIdsInMonth).filter((emp) =>
        isEmployeeVisibleInMonth(emp, activeEmployeeIdsInMonth),
      );
    },
    [spreadsheetBaseData, activeEmployeeIdsInMonth],
  );

  return {
    qk,
    spreadsheetBaseData,
    spreadsheetBaseError,
    spreadsheetMonthData,
    spreadsheetMonthError,
    spreadsheetMonthLock,
    spreadsheetLockError,
    loading,
    apps,
    appEmployeeIds,
    employees,
  };
}
