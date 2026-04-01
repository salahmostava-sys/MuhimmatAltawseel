import { appService } from '@services/appService';
import { dashboardService } from '@services/dashboardService';
import { buildAppEmployees, buildAppsOverview, getMonthBounds } from '@modules/apps/lib/appsModel';
import type {
  AppData,
  AppEmployee,
  AppEmployeeAssignmentRow,
  AppEmployeeOrderRow,
  AppMonthlyOrderRow,
} from '@modules/apps/types';
import type { Json } from '@services/supabase/types';

export const appsPageService = {
  getAppsOverview: async (monthYear: string): Promise<AppData[]> => {
    const [apps, orderRows] = await Promise.all([
      appService.getMonthlyApps(monthYear),
      dashboardService.getMonthOrders(monthYear),
    ]);

    return buildAppsOverview(
      apps as Array<{
        id: string;
        name: string;
        name_en: string | null;
        brand_color: string;
        text_color: string;
        is_active: boolean;
        is_active_this_month?: boolean;
        custom_columns?: Json | null;
      }>,
      orderRows as AppMonthlyOrderRow[],
    );
  },

  getAppEmployees: async (
    appId: string,
    monthYear: string,
    referenceDate = new Date(),
  ): Promise<AppEmployee[]> => {
    const { startDate, endDate, daysInMonth, daysPassed } = getMonthBounds(monthYear, referenceDate);

    const [assignments, orderRows, targetOrders] = await Promise.all([
      appService.getActiveEmployeeAppsWithEmployees(appId),
      appService.getMonthlyOrdersForApp(appId, startDate, endDate),
      appService.getAppTargetForMonth(appId, monthYear),
    ]);

    return buildAppEmployees({
      assignments: assignments as AppEmployeeAssignmentRow[],
      orderRows: orderRows as AppEmployeeOrderRow[],
      targetOrders,
      daysInMonth,
      daysPassed,
    });
  },
};
