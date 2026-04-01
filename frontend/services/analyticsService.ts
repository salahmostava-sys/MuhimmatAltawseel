import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { supabase } from '@services/supabase/client';
import { handleSupabaseError } from '@services/serviceError';
import {
  buildRiderPredictions,
  type RiderPredictionContext,
} from '@shared/lib/analytics/riderPredictionAnalytics';
import type { RiderPrediction } from '@services/predictionService';

export const analyticsService = {
  getEmployeeName: async (employeeId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('employees')
      .select('name')
      .eq('id', employeeId)
      .maybeSingle();

    if (error) handleSupabaseError(error, 'analyticsService.getEmployeeName');

    return data?.name ?? null;
  },

  getRiderPredictionContext: async (referenceDate = new Date()): Promise<RiderPredictionContext> => {
    const monthEnd = format(endOfMonth(referenceDate), 'yyyy-MM-dd');
    const fetchStart = format(startOfMonth(subMonths(referenceDate, 12)), 'yyyy-MM-dd');

    const [employeesRes, ordersRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id, name')
        .in('sponsorship_status', ['sponsored', 'not_sponsored']),
      supabase
        .from('daily_orders')
        .select('employee_id, date, orders_count')
        .gte('date', fetchStart)
        .lte('date', monthEnd),
    ]);

    if (employeesRes.error) handleSupabaseError(employeesRes.error, 'analyticsService.getRiderPredictionContext.employees');
    if (ordersRes.error) handleSupabaseError(ordersRes.error, 'analyticsService.getRiderPredictionContext.orders');

    return {
      employees: employeesRes.data ?? [],
      orders: ordersRes.data ?? [],
    };
  },

  getRiderPredictions: async (referenceDate = new Date()): Promise<RiderPrediction[]> => {
    const context = await analyticsService.getRiderPredictionContext(referenceDate);
    if (context.employees.length === 0) return [];
    return buildRiderPredictions(context, referenceDate);
  },
};
