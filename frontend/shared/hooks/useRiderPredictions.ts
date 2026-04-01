import { useQuery } from '@tanstack/react-query';
import { authQueryUserId, useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { predictRiderMonth, type RiderPrediction } from '@services/predictionService';
import { supabase } from '@services/supabase/client';
import { startOfMonth, endOfMonth, subMonths, getDate, getDaysInMonth, format } from 'date-fns';

export function useRiderPredictions() {
  const { enabled, userId } = useAuthQueryGate();
  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');

  return useQuery({
    queryKey: ['rider-predictions', authQueryUserId(userId), currentMonth] as const,
    enabled,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<RiderPrediction[]> => {
      const daysPassedThisMonth = getDate(now);
      const daysRemainingThisMonth = getDaysInMonth(now) - daysPassedThisMonth;
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
      const fetchStart = format(startOfMonth(subMonths(now, 12)), 'yyyy-MM-dd');

      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('id, name')
        .in('sponsorship_status', ['sponsored', 'not_sponsored']);
      if (empErr) throw empErr;
      if (!employees || employees.length === 0) return [];

      const { data: ordersRows, error: ordErr } = await supabase
        .from('daily_orders')
        .select('employee_id, date, orders_count')
        .gte('date', fetchStart)
        .lte('date', monthEnd);
      if (ordErr) throw ordErr;

      const allOrders = ordersRows ?? [];

      const monthTotal = (empId: string, offset: number) => {
        const s = format(startOfMonth(subMonths(now, offset)), 'yyyy-MM-dd');
        const e = format(endOfMonth(subMonths(now, offset)), 'yyyy-MM-dd');
        return allOrders
          .filter((o) => o.employee_id === empId && o.date >= s && o.date <= e)
          .reduce((sum, o) => sum + (Number(o.orders_count) || 0), 0);
      };

      const predictions: RiderPrediction[] = employees.map((emp) => {
        const empOrders = allOrders.filter(
          (o) => o.employee_id === emp.id && o.date >= monthStart && o.date <= monthEnd
        );

        const ordersThisMonthSoFar = empOrders.reduce(
          (s, o) => s + (Number(o.orders_count) || 0),
          0
        );

        const dailyMap: Record<string, number> = {};
        empOrders.forEach((o) => {
          dailyMap[o.date] = (dailyMap[o.date] || 0) + (Number(o.orders_count) || 0);
        });

        const dailyOrdersLast14 = Array.from(
          { length: Math.min(14, daysPassedThisMonth) },
          (_, i) => {
            const dayNum = daysPassedThisMonth - (13 - i);
            if (dayNum < 1) return 0;
            const d = `${format(now, 'yyyy-MM')}-${String(dayNum).padStart(2, '0')}`;
            return dailyMap[d] || 0;
          }
        );

        return predictRiderMonth({
          riderId: emp.id,
          riderName: emp.name,
          ordersThisMonthSoFar,
          dailyOrdersLast14,
          daysPassedThisMonth,
          daysRemainingThisMonth,
          ordersLastMonth: monthTotal(emp.id, 1),
          ordersMonth2Ago: monthTotal(emp.id, 2),
          ordersMonth3Ago: monthTotal(emp.id, 3),
          ordersSameMonthLastYear: monthTotal(emp.id, 12),
        });
      });

      return predictions.sort((a, b) => b.predictedTotal - a.predictedTotal);
    },
  });
}
