import { supabase } from '@services/supabase/client';
import { format, endOfMonth } from 'date-fns';
import { handleSupabaseError } from '@services/serviceError';
import { filterOperationallyVisibleEmployees } from '@shared/lib/employeeVisibility';

export interface DashboardKPIs {
  totalOrders: number;
  totalSalaries: number;
  activeAdvances: number;
  activeEmployees: number;
  presentToday: number;
  absentToday: number;
}

export interface AppOrderSummary {
  appId: string;
  appName: string;
  brandColor: string;
  textColor: string;
  totalOrders: number;
  employeeCount: number;
}

export interface AttendanceTrendPoint {
  date: string;
  present: number;
  absent: number;
  leave: number;
}

export interface SupervisorPerformanceRow {
  supervisor_id: string;
  supervisor_name: string;
  target_orders: number;
  actual_orders: number;
  achievement_percent: number;
}

export const dashboardService = {
  /** Server-side aggregated overview (RPC) */
  getOverviewRpc: async (monthYear: string, today: string) => {
    // Validate inputs to prevent injection
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      throw new Error('Invalid monthYear format. Expected YYYY-MM');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
      throw new Error('Invalid today format. Expected YYYY-MM-DD');
    }

    const attempts: Array<Record<string, unknown>> = [
      { p_month_year: monthYear, p_today: today },                    // current signature
      { p_monthly_year: monthYear, p_today: today },                  // legacy signature (without company)
      { p_cip: null, p_monthly_year: monthYear, p_today: today },     // typo/older variant seen in deployments
    ];

    const fnNames = ['dashboard_overview_rpc', 'dashboard_overview'];

    let lastError: unknown = null;
    for (const fnName of fnNames) {
      for (const params of attempts) {
        const { data, error } = await supabase.rpc(fnName, params);
        if (!error) return data;
        lastError = error;

        const message = String((error as { message?: string })?.message ?? '');
        const isFunctionSignatureMismatch =
          message.includes('Could not find the function public.dashboard_overview_rpc') ||
          message.includes('Could not find the function public.dashboard_overview');
        if (!isFunctionSignatureMismatch) break;
      }
    }

    handleSupabaseError(lastError, 'dashboardService.getOverviewRpc');
    return null;
  },

  /** Active apps with basic metadata */
  getActiveApps: async () => {
    const { data, error } = await supabase
      .from('apps')
      .select('id, name, brand_color, text_color')
      .eq('is_active', true);
    if (error) handleSupabaseError(error, 'dashboardService.getActiveApps');
    return data ?? [];
  },

  /** Active employee count */
  getActiveEmployeeCount: async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, sponsorship_status, probation_end_date')
      .eq('status', 'active');
    if (error) handleSupabaseError(error, 'dashboardService.getActiveEmployeeCount');
    return filterOperationallyVisibleEmployees(data ?? []).length;
  },

  /** Approved salary totals for a given month (YYYY-MM) */
  getMonthSalaryTotal: async (monthYear: string) => {
    const { data, error } = await supabase
      .from('salary_records')
      .select('net_salary')
      .eq('month_year', monthYear)
      .eq('is_approved', true);
    if (error) handleSupabaseError(error, 'dashboardService.getMonthSalaryTotal');
    return (data ?? []).reduce((sum, r) => sum + (r.net_salary ?? 0), 0);
  },

  /** Total active advance amount */
  getActiveAdvancesTotal: async () => {
    const { data, error } = await supabase
      .from('advances')
      .select('amount')
      .eq('status', 'active');
    if (error) handleSupabaseError(error, 'dashboardService.getActiveAdvancesTotal');
    return (data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0);
  },

  /** Today's attendance breakdown */
  getAttendanceToday: async (date: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('status')
      .eq('date', date);
    if (error) handleSupabaseError(error, 'dashboardService.getAttendanceToday');
    const present = data?.filter(r => r.status === 'present').length ?? 0;
    const absent  = data?.filter(r => r.status === 'absent').length  ?? 0;
    const leave   = data?.filter(r => r.status === 'leave').length   ?? 0;
    return { present, absent, leave };
  },

  /** Orders per month with employee+app detail (for platform breakdown) */
  getMonthOrders: async (monthYear: string) => {
    const start = `${monthYear}-01`;
    const end   = format(endOfMonth(new Date(`${monthYear}-01`)), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('daily_orders')
      .select('date, employee_id, app_id, orders_count, apps(id, name, brand_color, text_color), employees(name)')
      .gte('date', start)
      .lte('date', end);
    if (error) handleSupabaseError(error, 'dashboardService.getMonthOrders');
    return data ?? [];
  },

  /** Simple orders count for a previous month (for trend comparison) */
  getMonthOrdersCount: async (monthYear: string) => {
    const start = `${monthYear}-01`;
    const end   = format(endOfMonth(new Date(`${monthYear}-01`)), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('daily_orders')
      .select('orders_count')
      .gte('date', start)
      .lte('date', end);
    if (error) handleSupabaseError(error, 'dashboardService.getMonthOrdersCount');
    return data?.reduce((sum, r) => sum + (r.orders_count ?? 0), 0) ?? 0;
  },

  /** Attendance trend for the last N days */
  getAttendanceTrend: async (from: string, to: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('date, status')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true });

    if (error) handleSupabaseError(error, 'dashboardService.getAttendanceTrend');

    const grouped: Record<string, AttendanceTrendPoint> = {};
    data?.forEach(r => {
      if (!grouped[r.date]) grouped[r.date] = { date: r.date, present: 0, absent: 0, leave: 0 };
      if (r.status === 'present') grouped[r.date].present++;
      else if (r.status === 'absent') grouped[r.date].absent++;
      else if (r.status === 'leave') grouped[r.date].leave++;
    });
    return Object.values(grouped);
  },

  /** Latest audit log entries */
  getRecentActivity: async (limit = 6) => {
    const { data, error } = await supabase
      .from('audit_log')
      .select('action, table_name, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) handleSupabaseError(error, 'dashboardService.getRecentActivity');
    return data ?? [];
  },

  /** Active employee-app assignments (for platform employee map) */
  getEmployeeAppAssignments: async () => {
    const { data, error } = await supabase
      .from('employee_apps')
      .select('app_id, employee_id, apps(name, brand_color, text_color)')
      .eq('status', 'active');
    if (error) handleSupabaseError(error, 'dashboardService.getEmployeeAppAssignments');
    return data ?? [];
  },

  /** System settings (project name, logo, subtitle) */
  getSystemSettings: async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('project_name_ar, project_name_en, project_subtitle_ar, project_subtitle_en, logo_url, updated_at')
      .limit(1)
      .maybeSingle();
    if (error) handleSupabaseError(error, 'dashboardService.getSystemSettings');
    return data;
  },

  /** Employee city + license + sponsorship distribution (for map/stats) */
  getEmployeeDistribution: async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, city, license_status, sponsorship_status, probation_end_date')
      .eq('status', 'active');
    if (error) handleSupabaseError(error, 'dashboardService.getEmployeeDistribution');
    return filterOperationallyVisibleEmployees(data ?? []);
  },

  /** Active vehicles count */
  getActiveVehiclesCount: async () => {
    const { count, error } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
    if (error) handleSupabaseError(error, 'dashboardService.getActiveVehiclesCount');
    return count ?? 0;
  },

  /** Unresolved alerts count */
  getUnresolvedAlertsCount: async () => {
    const { count, error } = await supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('is_resolved', false);
    if (error) handleSupabaseError(error, 'dashboardService.getUnresolvedAlertsCount');
    return count ?? 0;
  },

  /** App monthly targets */
  getAppTargets: async (monthYear: string) => {
    const { data, error } = await supabase
      .from('app_targets')
      .select('app_id, target_orders')
      .eq('month_year', monthYear);
    if (error) handleSupabaseError(error, 'dashboardService.getAppTargets');
    return data ?? [];
  },

  /** Supervisor targets vs actual orders (based on rider assignments for month dates). */
  getSupervisorPerformance: async (monthYear: string): Promise<SupervisorPerformanceRow[]> => {
    const start = `${monthYear}-01`;
    const end = format(endOfMonth(new Date(`${monthYear}-01`)), 'yyyy-MM-dd');

    // New tables may not be in local generated TS types yet.
    const sb = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string, opts?: Record<string, unknown>) => {
          eq: (column: string, value: unknown) => Promise<{ data: unknown[] | null; error: unknown }>;
          lte: (column: string, value: unknown) => {
            or: (clause: string) => Promise<{ data: unknown[] | null; error: unknown }>;
          };
          gte: (column: string, value: unknown) => {
            lte: (column: string, value2: unknown) => Promise<{ data: unknown[] | null; error: unknown }>;
          };
          in?: (column: string, values: string[]) => Promise<{ data: unknown[] | null; error: unknown }>;
        };
      };
    };

    const [targetsRes, profilesRes, assignmentsRes, ordersRes] = await Promise.all([
      sb.from('supervisor_targets').select('supervisor_id, target_orders').eq('month_year', monthYear),
      supabase.from('profiles').select('id, name').eq('is_active', true),
      sb
        .from('supervisor_employee_assignments')
        .select('supervisor_id, employee_id, start_date, end_date')
        .lte('start_date', end)
        .or(`end_date.is.null,end_date.gte.${start}`),
      sb.from('daily_orders').select('employee_id, date, orders_count').gte('date', start).lte('date', end),
    ]);

    if (targetsRes.error) handleSupabaseError(targetsRes.error, 'dashboardService.getSupervisorPerformance.targets');
    if (profilesRes.error) handleSupabaseError(profilesRes.error, 'dashboardService.getSupervisorPerformance.profiles');
    if (assignmentsRes.error) handleSupabaseError(assignmentsRes.error, 'dashboardService.getSupervisorPerformance.assignments');
    if (ordersRes.error) handleSupabaseError(ordersRes.error, 'dashboardService.getSupervisorPerformance.orders');

    const targets = (targetsRes.data ?? []) as Array<{ supervisor_id: string; target_orders: number }>;
    const profiles = (profilesRes.data ?? []) as Array<{ id: string; name: string | null }>;
    const assignments = (assignmentsRes.data ?? []) as Array<{
      supervisor_id: string;
      employee_id: string;
      start_date: string;
      end_date: string | null;
    }>;
    const orders = (ordersRes.data ?? []) as Array<{ employee_id: string; date: string; orders_count: number }>;

    const profileNameById = new Map<string, string>(profiles.map((p) => [p.id, p.name || 'مشرف']));
    const targetBySupervisor = new Map<string, number>();
    for (const t of targets) targetBySupervisor.set(t.supervisor_id, Number(t.target_orders) || 0);

    const assignmentsByEmployee = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const bucket = assignmentsByEmployee.get(a.employee_id);
      if (bucket) bucket.push(a);
      else assignmentsByEmployee.set(a.employee_id, [a]);
    }
    for (const [, bucket] of assignmentsByEmployee) {
      bucket.sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
    }

    const actualBySupervisor = new Map<string, number>();
    for (const o of orders) {
      const bucket = assignmentsByEmployee.get(o.employee_id);
      if (!bucket || bucket.length === 0) continue;
      const matched = bucket.find((a) => a.start_date <= o.date && (!a.end_date || a.end_date >= o.date));
      if (!matched) continue;
      actualBySupervisor.set(
        matched.supervisor_id,
        (actualBySupervisor.get(matched.supervisor_id) ?? 0) + (Number(o.orders_count) || 0)
      );
    }

    const supervisorIds = new Set<string>([
      ...Array.from(targetBySupervisor.keys()),
      ...Array.from(actualBySupervisor.keys()),
    ]);

    const rows: SupervisorPerformanceRow[] = Array.from(supervisorIds).map((id) => {
      const target = targetBySupervisor.get(id) ?? 0;
      const actual = actualBySupervisor.get(id) ?? 0;
      const pct = target > 0 ? Number(((actual / target) * 100).toFixed(1)) : 0;
      return {
        supervisor_id: id,
        supervisor_name: profileNameById.get(id) ?? 'مشرف',
        target_orders: target,
        actual_orders: actual,
        achievement_percent: pct,
      };
    });

    rows.sort((a, b) => b.achievement_percent - a.achievement_percent || b.actual_orders - a.actual_orders);
    return rows;
  },

  /**
   * Main dashboard data — all 11 queries in one parallel call.
   */
  fetchMainData: async (today: string, currentMonth: string, prevStart: string, prevEnd: string, sixDaysAgo: string) => {
    const [empRes, attRes, ordersRes, prevOrdersRes, weekAttRes, auditRes, empDetailsRes, vehiclesRes, alertsRes, appsRes, targetsRes, pricingRes] = await Promise.all([
      supabase.from('employees').select('id, sponsorship_status, probation_end_date').eq('status', 'active'),
      supabase.from('attendance').select('status').eq('date', today),
      supabase.from('daily_orders').select('employee_id, app_id, orders_count, apps(id, name, brand_color, text_color), employees(name, city)').gte('date', currentMonth + '-01').lte('date', today),
      supabase.from('daily_orders').select('orders_count').gte('date', prevStart).lte('date', prevEnd),
      supabase.from('attendance').select('date, status').gte('date', sixDaysAgo).lte('date', today),
      supabase.from('audit_log').select('action, table_name, created_at, user_id').order('created_at', { ascending: false }).limit(6),
      supabase.from('employees').select('id, city, license_status, sponsorship_status, probation_end_date').eq('status', 'active'),
      supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
      supabase.from('apps').select('id, name, brand_color, text_color').eq('is_active', true),
      supabase.from('app_targets').select('app_id, target_orders').eq('month_year', currentMonth),
      supabase.from('pricing_rules').select('app_id, rule_type, rate_per_order, fixed_salary, is_active, priority, min_orders, max_orders').eq('is_active', true),
    ]);
    if (empRes.error) handleSupabaseError(empRes.error, 'dashboardService.fetchMainData.empRes');
    if (attRes.error) handleSupabaseError(attRes.error, 'dashboardService.fetchMainData.attRes');
    if (ordersRes.error) handleSupabaseError(ordersRes.error, 'dashboardService.fetchMainData.ordersRes');
    if (prevOrdersRes.error) handleSupabaseError(prevOrdersRes.error, 'dashboardService.fetchMainData.prevOrdersRes');
    if (weekAttRes.error) handleSupabaseError(weekAttRes.error, 'dashboardService.fetchMainData.weekAttRes');
    if (auditRes.error) handleSupabaseError(auditRes.error, 'dashboardService.fetchMainData.auditRes');
    if (empDetailsRes.error) handleSupabaseError(empDetailsRes.error, 'dashboardService.fetchMainData.empDetailsRes');
    if (vehiclesRes.error) handleSupabaseError(vehiclesRes.error, 'dashboardService.fetchMainData.vehiclesRes');
    if (alertsRes.error) handleSupabaseError(alertsRes.error, 'dashboardService.fetchMainData.alertsRes');
    if (appsRes.error) handleSupabaseError(appsRes.error, 'dashboardService.fetchMainData.appsRes');
    if (targetsRes.error) handleSupabaseError(targetsRes.error, 'dashboardService.fetchMainData.targetsRes');
    if (pricingRes.error) handleSupabaseError(pricingRes.error, 'dashboardService.fetchMainData.pricingRes');
    const visibleActiveEmployees = filterOperationallyVisibleEmployees(empRes.data ?? []);
    const visibleEmployeeDetails = filterOperationallyVisibleEmployees(empDetailsRes.data ?? []);
    return {
      activeEmployeeCount: visibleActiveEmployees.length,
      attendanceToday: attRes.data ?? [],
      ordersCurrentMonth: ordersRes.data ?? [],
      ordersPreviousRange: prevOrdersRes.data ?? [],
      attendanceWeek: weekAttRes.data ?? [],
      auditLog: auditRes.data ?? [],
      employeeDetails: visibleEmployeeDetails,
      activeVehiclesCount: vehiclesRes.count ?? 0,
      unresolvedAlertsCount: alertsRes.count ?? 0,
      apps: appsRes.data ?? [],
      appTargets: targetsRes.data ?? [],
      pricingRules: pricingRes.data ?? [],
    };
  },

  /**
   * Historical chart data — apps + employees list + N-month orders.
   */
  fetchHistoricalData: async (months: { start: string; end: string }[]) => {
    const [appsRes, empRes, ...monthOrdersResults] = await Promise.all([
      supabase.from('apps').select('id, name, brand_color, text_color').eq('is_active', true),
      supabase.from('employees').select('id, name, sponsorship_status, probation_end_date').eq('status', 'active'),
      ...months.map(m =>
        supabase.from('daily_orders').select('employee_id, orders_count, app_id').gte('date', m.start).lte('date', m.end)
      ),
    ]);
    if (appsRes.error) handleSupabaseError(appsRes.error, 'dashboardService.fetchHistoricalData.appsRes');
    if (empRes.error) handleSupabaseError(empRes.error, 'dashboardService.fetchHistoricalData.empRes');
    monthOrdersResults.forEach((result, idx) => {
      if (result.error) handleSupabaseError(result.error, `dashboardService.fetchHistoricalData.monthOrdersResults.${idx}`);
    });
    const visibleEmployees = filterOperationallyVisibleEmployees(empRes.data ?? []);
    return {
      apps: appsRes.data ?? [],
      employees: visibleEmployees.map((e) => ({ id: e.id, name: (e as { name: string }).name })),
      monthOrders: monthOrdersResults.map(r => r.data ?? []),
    };
  },

  /** All KPIs in one parallel fetch */
  getKPIs: async (monthYear: string, today: string) => {
    const [empRes, attRes, advRes, salRes] = await Promise.all([
      supabase.from('employees').select('id, sponsorship_status, probation_end_date').eq('status', 'active'),
      supabase.from('attendance').select('status').eq('date', today),
      supabase.from('advances').select('amount').eq('status', 'active'),
      supabase.from('salary_records').select('net_salary').eq('month_year', monthYear).eq('is_approved', true),
    ]);

    if (empRes.error) handleSupabaseError(empRes.error, 'dashboardService.getKPIs.empRes');
    if (attRes.error) handleSupabaseError(attRes.error, 'dashboardService.getKPIs.attRes');
    if (advRes.error) handleSupabaseError(advRes.error, 'dashboardService.getKPIs.advRes');
    if (salRes.error) handleSupabaseError(salRes.error, 'dashboardService.getKPIs.salRes');
    const visibleActiveEmployees = filterOperationallyVisibleEmployees(empRes.data ?? []);

    const kpis: DashboardKPIs = {
      activeEmployees: visibleActiveEmployees.length,
      presentToday:   attRes.data?.filter(r => r.status === 'present').length ?? 0,
      absentToday:    attRes.data?.filter(r => r.status === 'absent').length  ?? 0,
      activeAdvances: advRes.data?.reduce((s, r) => s + (r.amount ?? 0), 0) ?? 0,
      totalSalaries:  salRes.data?.reduce((s, r) => s + (r.net_salary ?? 0), 0) ?? 0,
      totalOrders:    0, // filled separately via getMonthOrders
    };

    return { kpis };
  },
};
