import { supabase } from '@services/supabase/client';
import { toServiceError } from '@services/serviceError';

export const bulkDeleteService = {
  /**
   * حذف كل طلبات موظف في شهر معين
   */
  deleteEmployeeMonth: async (employeeId: string, monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const from = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    const { error, count } = await supabase
      .from('daily_orders')
      .delete({ count: 'exact' })
      .eq('employee_id', employeeId)
      .gte('date', from)
      .lte('date', to);

    if (error) throw toServiceError(error, 'bulkDeleteService.deleteEmployeeMonth');
    return count || 0;
  },

  /**
   * حذف طلبات موظف على منصة معينة في شهر معين
   */
  deleteEmployeeAppMonth: async (employeeId: string, appId: string, monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const from = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    const { error, count } = await supabase
      .from('daily_orders')
      .delete({ count: 'exact' })
      .eq('employee_id', employeeId)
      .eq('app_id', appId)
      .gte('date', from)
      .lte('date', to);

    if (error) throw toServiceError(error, 'bulkDeleteService.deleteEmployeeAppMonth');
    return count || 0;
  },

  /**
   * حذف كل طلبات منصة في شهر معين
   */
  deleteAppMonth: async (appId: string, monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const from = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    const { error, count } = await supabase
      .from('daily_orders')
      .delete({ count: 'exact' })
      .eq('app_id', appId)
      .gte('date', from)
      .lte('date', to);

    if (error) throw toServiceError(error, 'bulkDeleteService.deleteAppMonth');
    return count || 0;
  },

  /**
   * حذف كل طلبات يوم معين
   */
  deleteDay: async (date: string) => {
    const { error, count } = await supabase
      .from('daily_orders')
      .delete({ count: 'exact' })
      .eq('date', date);

    if (error) throw toServiceError(error, 'bulkDeleteService.deleteDay');
    return count || 0;
  },
};
