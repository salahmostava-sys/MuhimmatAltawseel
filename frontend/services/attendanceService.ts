import { supabase } from '@services/supabase/client';
import { handleSupabaseError } from '@services/serviceError';
import { filterEmployeesForAttendanceMonth, filterOperationallyVisibleEmployees } from '@shared/lib/employeeVisibility';

export const attendanceService = {
  getDailyAttendanceBase: async () => {
    const [employeesRes, appsRes, employeeAppsRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id, name, salary_type, job_title, sponsorship_status, probation_end_date')
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('apps')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('employee_apps')
        .select('employee_id, app_id'),
    ]);

    let employeeRows:
      Array<{
        id: string;
        name: string;
        salary_type?: string | null;
        job_title?: string | null;
        sponsorship_status?: string | null;
        probation_end_date?: string | null;
      }> = [];

    if (employeesRes.error) {
      const fallbackRes = await supabase
        .from('employees')
        .select('id, name, sponsorship_status, probation_end_date')
        .eq('status', 'active')
        .order('name');

      if (fallbackRes.error) handleSupabaseError(fallbackRes.error, 'attendanceService.getDailyAttendanceBase.employeesFallback');
      employeeRows = fallbackRes.data ?? [];
    } else {
      employeeRows = employeesRes.data ?? [];
    }

    if (appsRes.error) handleSupabaseError(appsRes.error, 'attendanceService.getDailyAttendanceBase.apps');
    if (employeeAppsRes.error) handleSupabaseError(employeeAppsRes.error, 'attendanceService.getDailyAttendanceBase.employeeApps');

    return {
      employees: employeeRows,
      apps: appsRes.data ?? [],
      employeeApps: employeeAppsRes.data ?? [],
    };
  },

  getDailyAttendanceRecords: async (date: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', date);

    if (error) handleSupabaseError(error, 'attendanceService.getDailyAttendanceRecords');
    return data ?? [];
  },

  checkIn: async (employeeId: string, checkinAt?: string) => {
    const { data, error } = await supabase.rpc('check_in' as never, {
      p_employee_id: employeeId,
      p_checkin_at: checkinAt ?? new Date().toISOString(),
    } as never);
    if (error) handleSupabaseError(error, 'attendanceService.checkIn');
    return data;
  },

  checkOut: async (employeeId: string, checkoutAt?: string) => {
    const { data, error } = await supabase.rpc('check_out' as never, {
      p_employee_id: employeeId,
      p_checkout_at: checkoutAt ?? new Date().toISOString(),
    } as never);
    if (error) handleSupabaseError(error, 'attendanceService.checkOut');
    return data;
  },

  getAttendanceStatusRange: async (from: string, to: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('date, status')
      .gte('date', from)
      .lte('date', to);
    if (error) handleSupabaseError(error, 'attendanceService.getAttendanceStatusRange');
    return data ?? [];
  },

  getActiveEmployeesCount: async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, sponsorship_status, probation_end_date')
      .eq('status', 'active');
    if (error) handleSupabaseError(error, 'attendanceService.getActiveEmployeesCount');
    return filterOperationallyVisibleEmployees(data ?? []).length;
  },

  upsertDailyAttendance: async (payload: {
    employee_id: string;
    date: string;
    status: 'present' | 'absent' | 'leave' | 'sick' | 'late';
    check_in: string | null;
    check_out: string | null;
    note: string | null;
  }) => {
    // Keep compatibility with existing grid editor flow.
    // For explicit check-in/out actions, prefer attendanceService.checkIn/checkOut RPCs.
    const { error } = await supabase.from('attendance').upsert([payload], {
      onConflict: 'employee_id,date',
    });
    if (error) handleSupabaseError(error, 'attendanceService.upsertDailyAttendance');
  },

  getMonthlyEmployeesAndAttendance: async (startDate: string, endDate: string) => {
    const [employeesRes, attendanceRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id, name, national_id, salary_type, base_salary, sponsorship_status, probation_end_date')
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('attendance')
        .select('employee_id, status')
        .gte('date', startDate)
        .lte('date', endDate),
    ]);
    if (employeesRes.error) handleSupabaseError(employeesRes.error, 'attendanceService.getMonthlyEmployeesAndAttendance.employees');
    if (attendanceRes.error) handleSupabaseError(attendanceRes.error, 'attendanceService.getMonthlyEmployeesAndAttendance.attendance');
    return {
      employees: filterEmployeesForAttendanceMonth(employeesRes.data ?? [], startDate),
      attendanceRows: attendanceRes.data ?? [],
    };
  },

  getAttendanceByMonth: async (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const from = `${year}-${month}-01`;
    const to = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance')
      .select('employee_id, status')
      .gte('date', from)
      .lte('date', to)
      .in('status', ['present', 'late']);

    if (error) handleSupabaseError(error, 'attendanceService.getAttendanceByMonth');
    return data ?? [];
  },

  getAttendanceByEmployeeMonth: async (employeeId: string, monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const from = `${year}-${month}-01`;
    const to = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true });

    if (error) handleSupabaseError(error, 'attendanceService.getAttendanceByEmployeeMonth');
    return data ?? [];
  },
};

export default attendanceService;
