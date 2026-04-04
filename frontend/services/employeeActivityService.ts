import { format } from 'date-fns';
import { supabase } from '@services/supabase/client';
import { handleSupabaseError } from '@services/serviceError';

export type MonthlyActiveEmployeeIdsResult = {
  monthKey: string;
  employeeIds: Set<string>;
  orderEmployeeIds: Set<string>;
};

export function toMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function monthStartEnd(monthKey: string): { start: string; end: string } {
  const [yearText, monthText] = monthKey.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = format(new Date(year, monthIndex, 1), 'yyyy-MM-dd');
  const end = format(new Date(year, monthIndex + 1, 0), 'yyyy-MM-dd');
  return { start, end };
}

export const employeeActivityService = {
  getMonthlyActiveEmployeeIds: async (monthKey: string): Promise<MonthlyActiveEmployeeIdsResult> => {
    const { start, end } = monthStartEnd(monthKey);

    const [ordersRes, shiftsRes, attendanceRes, salariesRes] = await Promise.all([
      supabase
        .from('daily_orders')
        .select('employee_id')
        .gte('date', start)
        .lte('date', end),
      supabase
        .from('daily_shifts')
        .select('employee_id')
        .gte('date', start)
        .lte('date', end),
      supabase
        .from('attendance')
        .select('employee_id')
        .gte('date', start)
        .lte('date', end),
      supabase
        .from('salary_records')
        .select('employee_id')
        .eq('month_year', monthKey),
    ]);

    if (ordersRes.error) handleSupabaseError(ordersRes.error, 'employeeActivityService.getMonthlyActiveEmployeeIds.orders');
    if (shiftsRes.error) handleSupabaseError(shiftsRes.error, 'employeeActivityService.getMonthlyActiveEmployeeIds.shifts');
    if (attendanceRes.error) handleSupabaseError(attendanceRes.error, 'employeeActivityService.getMonthlyActiveEmployeeIds.attendance');
    if (salariesRes.error) handleSupabaseError(salariesRes.error, 'employeeActivityService.getMonthlyActiveEmployeeIds.salaries');

    const employeeIds = new Set<string>();
    const orderEmployeeIds = new Set<string>();

    (ordersRes.data ?? []).forEach((row) => {
      if (!row.employee_id) return;
      employeeIds.add(row.employee_id);
      orderEmployeeIds.add(row.employee_id);
    });

    (shiftsRes.data ?? []).forEach((row) => {
      if (row.employee_id) employeeIds.add(row.employee_id);
    });

    (attendanceRes.data ?? []).forEach((row) => {
      if (row.employee_id) employeeIds.add(row.employee_id);
    });

    (salariesRes.data ?? []).forEach((row) => {
      if (row.employee_id) employeeIds.add(row.employee_id);
    });

    return {
      monthKey,
      employeeIds,
      orderEmployeeIds,
    };
  },
};
