import { supabase } from '@services/supabase/client';
import { handleSupabaseError } from '@services/serviceError';

export interface EmployeeProfileInstallment {
  id: string;
  month_year: string;
  amount: number;
  status: string;
  deducted_at?: string | null;
}

export interface EmployeeProfileAdvance {
  id: string;
  amount: number;
  monthly_amount: number;
  disbursement_date: string;
  first_deduction_month: string;
  status: string;
  note?: string | null;
  advance_installments?: EmployeeProfileInstallment[];
}

export interface EmployeeProfileSalaryRecord {
  id: string;
  month_year: string;
  base_salary: number;
  allowances: number;
  attendance_deduction: number;
  advance_deduction: number;
  external_deduction: number;
  manual_deduction: number;
  net_salary: number;
  is_approved: boolean;
}

export interface EmployeeProfileApp {
  id: string;
  app_id: string;
  status: string;
  username?: string | null;
  apps?: { name: string } | null;
}

export interface EmployeeProfileDailyOrder {
  id: string;
  date: string;
  orders_count: number;
  app_id: string;
  apps?: { name: string; brand_color?: string | null } | null;
}

export interface EmployeeProfileRelatedData {
  advances: EmployeeProfileAdvance[];
  salaries: EmployeeProfileSalaryRecord[];
  employeeApps: EmployeeProfileApp[];
  dailyOrders: EmployeeProfileDailyOrder[];
}

export const employeeProfileService = {
  getRelatedData: async (employeeId: string): Promise<EmployeeProfileRelatedData> => {
    const [advancesRes, salariesRes, appsRes, ordersRes] = await Promise.all([
      supabase
        .from('advances')
        .select('*, advance_installments(*)')
        .eq('employee_id', employeeId)
        .order('disbursement_date', { ascending: false }),
      supabase
        .from('salary_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('month_year', { ascending: false }),
      supabase
        .from('employee_apps')
        .select('*, apps(name)')
        .eq('employee_id', employeeId),
      supabase
        .from('daily_orders')
        .select('id, date, orders_count, app_id, apps(name, brand_color)')
        .eq('employee_id', employeeId)
        .order('date', { ascending: false }),
    ]);

    if (advancesRes.error) handleSupabaseError(advancesRes.error, 'employeeProfileService.getRelatedData.advances');
    if (salariesRes.error) handleSupabaseError(salariesRes.error, 'employeeProfileService.getRelatedData.salaries');
    if (appsRes.error) handleSupabaseError(appsRes.error, 'employeeProfileService.getRelatedData.employeeApps');
    if (ordersRes.error) handleSupabaseError(ordersRes.error, 'employeeProfileService.getRelatedData.dailyOrders');

    return {
      advances: (advancesRes.data ?? []) as EmployeeProfileAdvance[],
      salaries: (salariesRes.data ?? []) as EmployeeProfileSalaryRecord[],
      employeeApps: (appsRes.data ?? []) as EmployeeProfileApp[],
      dailyOrders: (ordersRes.data ?? []) as EmployeeProfileDailyOrder[],
    };
  },
};
