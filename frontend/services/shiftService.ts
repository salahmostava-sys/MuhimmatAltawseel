import { supabase } from '@services/supabase/client';
import { toServiceError } from '@services/serviceError';
import type { ShiftFilter } from '@shared/types/shifts';

export const shiftService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('daily_shifts')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw toServiceError(error, 'shiftService.getAll');
    return data ?? [];
  },

  getByMonth: async (monthYear: string, filters: Pick<ShiftFilter, 'employeeId' | 'appId'> = {}) => {
    const [year, month] = monthYear.split('-');
    const from = `${year}-${month}-01`;
    const to = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

    let query = supabase
      .from('daily_shifts')
      .select('*, employees(name, name_en), apps(name, name_en, brand_color)')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });

    if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
    if (filters.appId) query = query.eq('app_id', filters.appId);

    const { data, error } = await query;
    if (error) throw toServiceError(error, 'shiftService.getByMonth');
    return data ?? [];
  },

  getMonthRaw: async (year: number, month: number) => {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = new Date(year, month, 0).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_shifts')
      .select('employee_id, app_id, date, hours_worked')
      .gte('date', from)
      .lte('date', to);
    if (error) throw toServiceError(error, 'shiftService.getMonthRaw');
    return data ?? [];
  },

  upsert: async (employeeId: string, date: string, appId: string, hoursWorked: number, notes?: string) => {
    const { data, error } = await supabase
      .from('daily_shifts')
      .upsert(
        { 
          employee_id: employeeId, 
          date,
          app_id: appId, 
          hours_worked: hoursWorked,
          notes: notes || null
        },
        { onConflict: 'employee_id,app_id,date' }
      )
      .select()
      .single();
    if (error) throw toServiceError(error, 'shiftService.upsert');
    return data;
  },

  bulkUpsert: async (
    rows: { employee_id: string; app_id: string; date: string; hours_worked: number; notes?: string }[],
    chunkSize = 200
  ) => {
    let saved = 0;
    const failed: string[] = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize).map((r) => ({
        employee_id: r.employee_id,
        app_id: r.app_id,
        date: r.date,
        hours_worked: r.hours_worked,
        notes: r.notes ?? null,
      }));
      const { error } = await supabase
        .from('daily_shifts')
        .upsert(chunk, { onConflict: 'employee_id,app_id,date' });
      if (error) throw toServiceError(error, 'shiftService.bulkUpsert');
      saved += chunk.length;
    }
    return { saved, failed };
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('daily_shifts').delete().eq('id', id);
    if (error) throw toServiceError(error, 'shiftService.delete');
  },

  getTotalHoursByEmployee: async (employeeId: string, monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const from = `${year}-${month}-01`;
    const to = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_shifts')
      .select('hours_worked')
      .eq('employee_id', employeeId)
      .gte('date', from)
      .lte('date', to);
    if (error) throw toServiceError(error, 'shiftService.getTotalHoursByEmployee');

    return data?.reduce((sum, row) => sum + (row.hours_worked ?? 0), 0) ?? 0;
  },
};
