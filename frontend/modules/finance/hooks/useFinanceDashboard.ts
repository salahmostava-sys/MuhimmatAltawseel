import { useQuery } from '@tanstack/react-query';
import { salaryService, SalaryPreviewRow } from '@services/salaryService';
import { dashboardService } from '@services/dashboardService';

export interface PlatformRevenueRate {
  app_id: string;
  rate: number;
}

export interface FinanceDashboardData {
  expectedPayroll: number;
  totalDeductions: number;
  ordersByApp: Record<string, { appName: string; totalOrders: number; brandColor: string }>;
  apps: { id: string; name: string; brand_color: string }[];
}

type ActiveAppRow = {
  id: string;
  name: string;
  brand_color: string;
};

type MonthOrderRow = {
  app_id: string | null;
  orders_count: number | null;
  apps?: { name?: string | null; brand_color?: string | null } | null;
};

export function useFinanceDashboard(monthYear: string, enabled: boolean) {
  return useQuery({
    queryKey: ['finance-dashboard', monthYear],
    enabled,
    queryFn: async (): Promise<FinanceDashboardData> => {
      const [salaryPreview, ordersData, appsData] = await Promise.all([
        salaryService.getSalaryPreviewForMonth(monthYear),
        dashboardService.getMonthOrders(monthYear),
        dashboardService.getActiveApps(),
      ]);

      let expectedPayroll = 0;
      let totalDeductions = 0;

      for (const row of salaryPreview) {
        expectedPayroll += row.net_salary || 0;
        totalDeductions += (row.external_deduction || 0) + (row.advance_deduction || 0);
      }

      const ordersByApp: Record<string, { appName: string; totalOrders: number; brandColor: string }> = {};
      
      (appsData as ActiveAppRow[]).forEach((app) => {
        ordersByApp[app.id] = { appName: app.name, totalOrders: 0, brandColor: app.brand_color };
      });

      (ordersData as MonthOrderRow[]).forEach((record) => {
        if (!record.app_id || !record.apps) return;
        const appId = record.app_id;
        if (!ordersByApp[appId]) {
          ordersByApp[appId] = {
            appName: record.apps.name ?? '—',
            totalOrders: 0,
            brandColor: record.apps.brand_color ?? '#6366f1',
          };
        }
        ordersByApp[appId].totalOrders += record.orders_count ?? 0;
      });

      return {
        expectedPayroll,
        totalDeductions,
        ordersByApp,
        apps: appsData,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
