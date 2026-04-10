import { supabase } from '@services/supabase/client';
import { toServiceError } from '@services/serviceError';

export type PerformanceTrendCode = 'up' | 'down' | 'stable';
export type PerformanceAlertType =
  | 'declining'
  | 'inactive_recently'
  | 'below_target'
  | 'low_consistency';

export type PerformanceSeverity = 'high' | 'medium' | 'low';

export interface PerformanceRankingEntry {
  employeeId: string;
  employeeName: string;
  city: string | null;
  totalOrders: number;
  activeDays: number;
  avgOrdersPerDay: number;
  consistencyRatio: number;
  growthPct: number;
  targetAchievementPct: number;
  rank: number;
  trendCode: PerformanceTrendCode;
}

export interface PerformanceAlert {
  employeeId?: string;
  employeeName?: string;
  alertType: PerformanceAlertType;
  severity: PerformanceSeverity;
  totalOrders?: number;
  activeDays?: number;
  growthPct?: number;
  lastActiveDate?: string | null;
  targetAchievementPct?: number;
  consistencyRatio?: number;
}

export interface PerformanceDashboardResponse {
  monthYear: string;
  effectiveEndDate: string;
  leaderboardDate: string;
  summary: {
    totalOrders: number;
    activeRiders: number;
    activeEmployees: number;
    avgOrdersPerRider: number;
    topPerformerToday: { employeeId: string; employeeName: string; totalOrders: number } | null;
    lowPerformerToday: { employeeId: string; employeeName: string; totalOrders: number } | null;
    topPerformerMonth: { employeeId: string; employeeName: string; totalOrders: number; rank: number } | null;
    lowPerformerMonth: { employeeId: string; employeeName: string; totalOrders: number } | null;
  };
  comparison: {
    month: {
      currentOrders: number;
      previousOrders: number;
      growthPct: number;
      currentActiveDays: number;
      previousActiveDays: number;
      activeDaysDelta: number;
    };
    week: {
      currentOrders: number;
      previousOrders: number;
      growthPct: number;
    };
  };
  targets: {
    totalTargetOrders: number;
    targetAchievementPct: number;
  };
  distribution: {
    excellent: number;
    good: number;
    average: number;
    weak: number;
  };
  ordersByApp: Array<{
    appId: string;
    appName: string;
    brandColor: string;
    textColor: string;
    orders: number;
    riders: number;
    targetOrders: number;
    targetAchievementPct: number;
    previousOrders: number;
    growthPct: number;
  }>;
  ordersByCity: Array<{
    city: string;
    orders: number;
  }>;
  dailyTrend: Array<{
    date: string;
    orders: number;
  }>;
  monthlyTrend: Array<{
    monthYear: string;
    totalOrders: number;
    activeRiders: number;
    avgOrdersPerRider: number;
  }>;
  rankings: {
    topPerformers: PerformanceRankingEntry[];
    lowPerformers: PerformanceRankingEntry[];
    mostImproved: PerformanceRankingEntry[];
    mostDeclined: PerformanceRankingEntry[];
  };
  alerts: PerformanceAlert[];
}

export interface RiderProfilePerformanceResponse {
  monthYear: string;
  effectiveEndDate: string;
  employee: {
    employeeId: string;
    employeeName: string;
    phone?: string | null;
    city?: string | null;
    joinDate?: string | null;
  } | null;
  summary: {
    totalOrders: number;
    avgOrdersPerDay: number;
    activeDays: number;
    consistencyRatio: number;
    monthlyTargetOrders: number;
    dailyTargetOrders: number;
    targetAchievementPct: number;
    rank: number;
    rankOutOf: number;
    lastActiveDate?: string | null;
  };
  comparison: {
    month: {
      currentOrders: number;
      previousOrders: number;
      growthPct: number;
      currentAvgOrdersPerDay: number;
      previousAvgOrdersPerDay: number;
      avgGrowthPct: number;
      currentActiveDays: number;
      previousActiveDays: number;
      activeDaysDelta: number;
    };
    week: {
      currentOrders: number;
      previousOrders: number;
      growthPct: number;
    };
  };
  platforms: Array<{
    appId: string;
    appName: string;
    brandColor: string;
    status: string;
  }>;
  platformBreakdown: Array<{
    appId: string;
    appName: string;
    brandColor: string;
    orders: number;
  }>;
  recentDailyOrders: Array<{
    date: string;
    orders: number;
  }>;
  lastThreeMonths: Array<{
    monthYear: string;
    totalOrders: number;
    avgOrdersPerDay: number;
    activeDays: number;
    consistencyRatio: number;
    targetAchievementPct: number;
  }>;
  trend: {
    trendCode: PerformanceTrendCode;
    judgmentCode:
      | 'inactive'
      | 'excellent_stable'
      | 'declining'
      | 'below_target'
      | 'stable'
      | 'average';
  };
  alerts: Array<{
    alertType: PerformanceAlertType;
    severity: PerformanceSeverity;
  }>;
  salary:
    | {
        baseSalary: number;
        allowances: number;
        attendanceDeduction: number;
        advanceDeduction: number;
        externalDeduction: number;
        manualDeduction: number;
        netSalary: number;
        isApproved: boolean;
        paymentMethod?: string | null;
      }
    | null;
}

export interface OrderImportBatch {
  id: string;
  month_year: string;
  source_type: 'manual' | 'excel' | 'api';
  file_name: string | null;
  status: 'pending' | 'completed' | 'failed';
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  error_count: number;
  error_summary: Array<{ row?: number; reason: string; details?: string }> | null;
  started_at: string;
  completed_at: string | null;
}

type GenericTableClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

const sb = supabase as unknown as GenericTableClient & typeof supabase;

export const performanceService = {
  getDashboard: async (monthYear: string): Promise<PerformanceDashboardResponse> => {
    const { data, error } = await supabase.rpc('performance_dashboard_rpc', {
      p_month_year: monthYear,
    });

    if (error) {
      throw toServiceError(error, 'performanceService.getDashboard');
    }

    return (data ?? {}) as unknown as PerformanceDashboardResponse;
  },

  getRiderProfile: async (
    employeeId: string,
    monthYear: string,
  ): Promise<RiderProfilePerformanceResponse> => {
    const { data, error } = await supabase.rpc('rider_profile_performance_rpc', {
      p_employee_id: employeeId,
      p_month_year: monthYear,
    });

    if (error) {
      throw toServiceError(error, 'performanceService.getRiderProfile');
    }

    return (data ?? {}) as unknown as RiderProfilePerformanceResponse;
  },

  upsertEmployeeTarget: async (params: {
    employeeId: string;
    monthYear: string;
    monthlyTargetOrders: number;
    dailyTargetOrders: number;
  }) => {
    const { data, error } = await sb
      .from('employee_targets')
      .upsert(
        {
          employee_id: params.employeeId,
          month_year: params.monthYear,
          monthly_target_orders: params.monthlyTargetOrders,
          daily_target_orders: params.dailyTargetOrders,
        },
        { onConflict: 'employee_id,month_year' },
      )
      .select()
      .single();

    if (error) {
      throw toServiceError(error, 'performanceService.upsertEmployeeTarget');
    }

    return data;
  },

  getImportHistory: async (monthYear: string): Promise<OrderImportBatch[]> => {
    const { data, error } = await sb
      .from('order_import_batches')
      .select(
        'id, month_year, source_type, file_name, status, total_rows, imported_rows, skipped_rows, error_count, error_summary, started_at, completed_at',
      )
      .eq('month_year', monthYear)
      .order('started_at', { ascending: false })
      .limit(8);

    if (error) {
      const message =
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : '';
      if (message.includes('order_import_batches')) {
        return [];
      }
      throw toServiceError(error, 'performanceService.getImportHistory');
    }

    return (data ?? []) as OrderImportBatch[];
  },

  deleteImportBatch: async (batchId: string) => {
    const { error } = await sb
      .from('order_import_batches')
      .delete()
      .eq('id', batchId);

    if (error) {
      throw toServiceError(error, 'performanceService.deleteImportBatch');
    }
  },

  captureSalaryMonthSnapshot: async (monthYear: string) => {
    const { data, error } = await supabase.rpc('capture_salary_month_snapshot', {
      p_month_year: monthYear,
    });

    if (error) {
      throw toServiceError(error, 'performanceService.captureSalaryMonthSnapshot');
    }

    return data;
  },
};
