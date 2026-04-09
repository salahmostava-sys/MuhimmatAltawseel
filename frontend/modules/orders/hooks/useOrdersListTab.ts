import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@shared/components/ui/sonner';
import { TOAST_ERROR_GENERIC, TOAST_SUCCESS_ACTION } from '@shared/lib/toastMessages';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { defaultQueryRetry } from '@shared/lib/query';
import { isOrderCapableApp } from '@shared/lib/workType';
import { orderService } from '@services/orderService';
import { filterRetainedEmployeesForMonth, filterVisibleEmployeesInMonth } from '@shared/lib/employeeVisibility';
import { useMonthlyActiveEmployeeIds } from '@shared/hooks/useMonthlyActiveEmployeeIds';
import { useOrdersMonthPaged, type OrdersMonthPagedRow } from '@shared/hooks/useOrdersPaged';
import { createDefaultGlobalFilters, type GlobalTableFilterState } from '@shared/components/table/GlobalTableFilters';
import type { PagedResult } from '@shared/types/pagination';
import type { App, Employee } from '@modules/orders/types';
import { monthYear } from '@modules/orders/utils/dateMonth';
import { loadXlsx } from '@modules/orders/utils/xlsx';
import { toCityArabic } from '@modules/orders/utils/cityLabel';

import { useTemporalContext } from '@app/providers/TemporalContext';

export function useOrdersListTab() {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  const { selectedMonth: globalMonth, setSelectedMonth: setGlobalMonth } = useTemporalContext();

  // Derived from Global Temporal Context (YYYY-MM)
  const [yearStr, monthStr] = globalMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const monthKey = monthYear(year, month);
  const { data: activeIdsData } = useMonthlyActiveEmployeeIds(monthKey);
  const activeEmployeeIdsInMonth = activeIdsData?.orderEmployeeIds;

  const [filters, setFilters] = useState<GlobalTableFilterState>(() => createDefaultGlobalFilters());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data: baseData } = useQuery({
    queryKey: ['orders', uid, 'list', 'base'] as const,
    queryFn: async () => {
      const [empRows, apps] = await Promise.all([
        orderService.getBaseEmployees(),
        orderService.getActiveApps(),
      ]);
      return {
        employees: filterVisibleEmployeesInMonth(
          filterRetainedEmployeesForMonth(
            (empRows || []) as unknown as { id: string; status?: string | null; sponsorship_status?: string | null }[],
            activeEmployeeIdsInMonth,
          ),
          activeEmployeeIdsInMonth,
        ) as unknown as Employee[],
        apps: ((apps || []) as App[]).filter(isOrderCapableApp),
      };
    },
    enabled: enabled && !!activeIdsData,
    staleTime: 60_000,
    retry: defaultQueryRetry,
  });

  const orderAppIds = useMemo(() => (baseData?.apps ?? []).map((app) => app.id), [baseData?.apps]);
  const effectivePlatformAppIds = useMemo(() => {
    if (orderAppIds.length === 0) return [];
    if (filters.platformAppIds.length === 0) return orderAppIds;
    const allowed = new Set(orderAppIds);
    return filters.platformAppIds.filter((appId) => allowed.has(appId));
  }, [filters.platformAppIds, orderAppIds]);

  useEffect(() => {
    setPage(1);
  }, [filters, monthKey]);

  const paged = useOrdersMonthPaged({
    monthYear: monthKey,
    page,
    pageSize,
    enabled: enabled && !!activeIdsData && !!baseData && orderAppIds.length > 0,
    filters: {
      branch: filters.branch,
      driverId: filters.driverId,
      platformAppIds: effectivePlatformAppIds,
      search: filters.search,
    },
  });

  const pageData = paged.data as PagedResult<OrdersMonthPagedRow> | undefined;
  const total = pageData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows: OrdersMonthPagedRow[] = pageData?.rows ?? [];

  const handleExportMonth = async () => {
    try {
      const XLSX = await loadXlsx();
      const raw = await orderService.getMonthRaw(year, month);
      const empMap = Object.fromEntries((baseData?.employees ?? []).map((e) => [e.id, e]));
      const appMap = Object.fromEntries((baseData?.apps ?? []).map((a) => [a.id, a]));
      const allowedAppIds = new Set(Object.keys(appMap));
      const out = (raw || []).filter((r) => allowedAppIds.has(r.app_id)).map((r) => ({
        التاريخ: r.date,
        المندوب: empMap[r.employee_id]?.name ?? r.employee_id,
        الفرع: toCityArabic(empMap[r.employee_id]?.city, ''),
        المنصة: appMap[r.app_id]?.name ?? r.app_id,
        الطلبات: r.orders_count,
      }));
      const ws = XLSX.utils.json_to_sheet(out);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      XLSX.writeFile(wb, `orders_${monthKey}.xlsx`);
      toast.success(TOAST_SUCCESS_ACTION, { description: `orders_${monthKey}.xlsx` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'تعذر تصدير البيانات';
      toast.error(TOAST_ERROR_GENERIC, { description: msg });
    }
  };

  return {
    year,
    month,
    globalMonth,
    setGlobalMonth,
    monthKey,
    filters,
    setFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    baseData,
    paged,
    total,
    totalPages,
    rows,
    handleExportMonth,
  };
}
