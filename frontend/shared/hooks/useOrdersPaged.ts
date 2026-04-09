import { orderService } from '@services/orderService';
import type { BranchKey } from '@shared/components/table/GlobalTableFilters';
import { useAuthedPagedQuery } from '@shared/hooks/useAuthedPagedQuery';
import type { PagedResult } from '@shared/types/pagination';

/** صف ناتج عن `orderService.getMonthPaged` مع العلاقات المضمّنة. */
export type OrdersMonthPagedRow = {
  employee_id: string;
  app_id: string;
  date: string;
  orders_count: number;
  employees?: { id: string; name: string; city?: string | null } | null;
  apps?: { id: string; name: string } | null;
};

export type OrdersPagedFilters = {
  driverId?: string;
  /** عدة منصات؛ يُترك فارغاً لعدم التصفية حسب المنصة. */
  platformAppIds?: string[];
  branch?: BranchKey;
  search?: string;
};

export function useOrdersMonthPaged(params: {
  monthYear: string;
  page: number;
  pageSize: number;
  filters: OrdersPagedFilters;
  enabled?: boolean;
}) {
  const { monthYear, page, pageSize, filters, enabled = true } = params;
  const driverId = filters.driverId && filters.driverId !== 'all' ? filters.driverId : undefined;
  const appIds =
    filters.platformAppIds && filters.platformAppIds.length > 0 ? filters.platformAppIds : undefined;
  const branch = filters.branch && filters.branch !== 'all' ? filters.branch : undefined;
  const search = filters.search?.trim() ? filters.search.trim() : undefined;

  return useAuthedPagedQuery<PagedResult<OrdersMonthPagedRow>>({
    enabled,
    buildQueryKey: (uid) =>
      [
        'orders',
        uid,
        'month-paged',
        monthYear,
        page,
        pageSize,
        driverId ?? null,
        appIds?.join(',') ?? null,
        branch ?? null,
        search ?? null,
      ] as const,
    queryFn: async (): Promise<PagedResult<OrdersMonthPagedRow>> => {
      const res = await
        orderService.getMonthPaged({
          monthYear,
          page,
          pageSize,
          filters: { employeeId: driverId, appIds, branch, search },
        });
      return res as PagedResult<OrdersMonthPagedRow>;
    },
    errorTitle: 'تعذر تحميل الطلبات',
  });
}

