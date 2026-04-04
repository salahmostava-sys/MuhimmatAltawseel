import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@shared/components/ui/sonner';
import { TOAST_ERROR_GENERIC, TOAST_SUCCESS_EDIT } from '@shared/lib/toastMessages';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { usePermissions } from '@shared/hooks/usePermissions';
import { defaultQueryRetry } from '@shared/lib/query';
import { orderService } from '@services/orderService';
import { filterRetainedEmployeesForMonth, filterVisibleEmployeesInMonth } from '@shared/lib/employeeVisibility';
import { useMonthlyActiveEmployeeIds } from '@shared/hooks/useMonthlyActiveEmployeeIds';
import type { App, AppTargetRow, DailyData, Employee, OrderRawRow } from '@modules/orders/types';
import type { OrdersEmployeeSortField } from '@modules/orders/types';
import { buildDailyDataMap, getOrdersEmployeeSortPair } from '@modules/orders/utils/gridHelpers';
import { getDaysInMonth, monthYear } from '@modules/orders/utils/dateMonth';
import { ordersQueryKeys } from '@modules/orders/hooks/ordersQueryKeys';

import { useTemporalContext } from '@app/providers/TemporalContext';

export function useMonthSummaryTab() {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const { permissions } = usePermissions('orders');
  const { selectedMonth: globalMonth, setSelectedMonth: setGlobalMonth } = useTemporalContext();
  const qk = ordersQueryKeys(uid);

  // Derived from Global Temporal Context (YYYY-MM)
  const [yearStr, monthStr] = globalMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [data, setData] = useState<DailyData>({});
  const [savingTarget, setSavingTarget] = useState<string | null>(null);
  const [isMonthLocked, setIsMonthLocked] = useState(false);
  const [sortField, setSortField] = useState<OrdersEmployeeSortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const monthKey = monthYear(year, month);
  const { data: activeIdsData } = useMonthlyActiveEmployeeIds(monthKey);
  const activeEmployeeIdsInMonth = activeIdsData?.orderEmployeeIds;

  const {
    data: summaryBaseData,
    error: summaryBaseError,
    isLoading: summaryBaseLoading,
  } = useQuery({
    queryKey: qk.summaryBase,
    enabled,
    queryFn: async () => {
      const [employees, apps] = await Promise.all([
        orderService.getBaseEmployees(),
        orderService.getActiveApps(),
      ]);
      return {
        employees: (employees || []) as Employee[],
        apps: (apps || []) as App[],
      };
    },
    select: (base) => ({
      employees: base.employees,
      apps: base.apps,
    }),
    retry: defaultQueryRetry,
    staleTime: 60_000,
  });

  const { data: summaryMonthMeta, error: summaryMonthMetaError } = useQuery({
    queryKey: ['orders', uid, 'summary', 'month-meta', year, month] as const,
    enabled,
    queryFn: async () => {
      const my = monthYear(year, month);
      const [targetsRows, lockRes] = await Promise.all([
        orderService.getAppTargets(my),
        orderService.getMonthLockStatus(my),
      ]);
      return {
        targets: (targetsRows || []) as AppTargetRow[],
        locked: lockRes.locked,
      };
    },
    retry: defaultQueryRetry,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const {
    data: summaryMonthData = {},
    error: summaryMonthError,
    isLoading: summaryMonthLoading,
  } = useQuery({
    queryKey: qk.summaryMonthRaw(year, month),
    enabled,
    queryFn: async () => {
      const rows = await orderService.getMonthRaw(year, month);
      return (rows || []) as OrderRawRow[];
    },
    select: (rows) => buildDailyDataMap(rows),
    retry: defaultQueryRetry,
    staleTime: 15_000,
  });

  const loading = summaryBaseLoading || summaryMonthLoading;

  const employees = useMemo<Employee[]>(
    () =>
      filterVisibleEmployeesInMonth(
        filterRetainedEmployeesForMonth(summaryBaseData?.employees ?? [], activeEmployeeIdsInMonth),
        activeEmployeeIdsInMonth,
      ),
    [summaryBaseData, activeEmployeeIdsInMonth],
  );
  const apps = useMemo<App[]>(() => summaryBaseData?.apps ?? [], [summaryBaseData]);

  useEffect(() => {
    const t: Record<string, string> = {};
    (summaryMonthMeta?.targets || []).forEach((r) => {
      t[r.app_id] = String(r.target_orders);
    });
    setTargets(t);
  }, [summaryMonthMeta?.targets]);

  useEffect(() => {
    setIsMonthLocked(summaryMonthMeta?.locked ?? false);
  }, [summaryMonthMeta?.locked]);

  useEffect(() => {
    setData(summaryMonthData);
  }, [summaryMonthData]);

  useEffect(() => {
    const error = summaryBaseError || summaryMonthMetaError || summaryMonthError;
    if (!error) return;
    const message = error instanceof Error ? error.message : 'فشل تحميل ملخص الشهر';
    toast.error(TOAST_ERROR_GENERIC, { description: message });
  }, [summaryBaseError, summaryMonthMetaError, summaryMonthError]);

  const saveTarget = async (appId: string, value: string) => {
    if (isMonthLocked) return;
    const targetOrders = Number.parseInt(value, 10) || 0;
    const my = monthYear(year, month);
    setSavingTarget(appId);
    try {
      await orderService.upsertAppTarget(appId, my, targetOrders);
      toast.success(TOAST_SUCCESS_EDIT);
    } catch {
      toast.error(TOAST_ERROR_GENERIC);
    } finally {
      setSavingTarget(null);
    }
  };

  const days = getDaysInMonth(year, month);
  const dayArr = Array.from({ length: days }, (_, i) => i + 1);

  const empTotal = useCallback(
    (empId: string) =>
      dayArr.reduce(
        (s, d) => s + apps.reduce((ss, a) => ss + (data[`${empId}::${a.id}::${d}`] ?? 0), 0),
        0,
      ),
    [dayArr, apps, data],
  );

  const appGrandTotal = (appId: string) =>
    employees.reduce(
      (s, e) => s + dayArr.reduce((ss, d) => ss + (data[`${e.id}::${appId}::${d}`] ?? 0), 0),
      0,
    );

  const grandTotal = employees.reduce((s, e) => s + empTotal(e.id), 0);

  const sortedEmployees = useMemo(() => {
    const sorted = [...employees].sort((a, b) => {
      const [aVal, bVal] = getOrdersEmployeeSortPair(a, b, sortField, empTotal, dayArr, data);
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, 'ar');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const cmp = Number(aVal) - Number(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [employees, sortField, sortDir, data, dayArr, empTotal]);

  const handleSort = (field: OrdersEmployeeSortField) => {
    if (sortField === field) setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const prevMonth = () => {
    let py = year, pm = month - 1;
    if (pm === 0) { pm = 12; py--; }
    setGlobalMonth(`${py}-${String(pm).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    let ny = year, nm = month + 1;
    if (nm === 13) { nm = 1; ny++; }
    setGlobalMonth(`${ny}-${String(nm).padStart(2, '0')}`);
  };

  return {
    year,
    month,
    loading,
    apps,
    employees,
    data,
    targets,
    setTargets,
    savingTarget,
    isMonthLocked,
    sortedEmployees,
    days,
    dayArr,
    grandTotal,
    empTotal,
    appGrandTotal,
    saveTarget,
    handleSort,
    sortField,
    sortDir,
    prevMonth,
    nextMonth,
    permissions,
  };
}
