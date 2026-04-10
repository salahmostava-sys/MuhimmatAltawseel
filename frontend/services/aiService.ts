/**
 * AI Backend Service — Connects React frontend to the FastAPI analytics engine.
 *
 * Base URL is configured via VITE_AI_BACKEND_URL env variable (required).
 * If not set, AI features are silently disabled (no requests sent).
 */

const AI_BASE_URL = import.meta.env.VITE_AI_BACKEND_URL as string | undefined;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DayRecord {
  date: string;
  orders: number;
  app_name?: string | null;
  employee_id?: string | null;
  employee_name?: string | null;
}

export interface DailyForecast {
  date: string;
  predicted_orders: number;
}

export interface OrdersPrediction {
  daily_forecast: DailyForecast[];
  monthly_total_predicted: number;
  trend: 'up' | 'down' | 'stable';
  trend_percent: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface DriverRank {
  employee_id: string;
  employee_name: string;
  total_orders: number;
  daily_avg: number;
  trend: 'up' | 'down' | 'stable';
  trend_percent: number;
  consistency_score: number;
}

export interface PlatformRank {
  app_name: string;
  total_orders: number;
  share_percent: number;
  growth_percent: number;
  avg_daily: number;
}

export interface SmartAlert {
  type: 'low_demand' | 'high_demand' | 'driver_drop' | 'driver_spike';
  severity: 'warning' | 'critical' | 'info';
  message: string;
  value: number;
  entity: string | null;
}

export interface SalaryAnalysisResponse {
  expected_salary: number;
  risk: 'underpaid' | 'normal' | 'overpaid';
  diff_percent: number;
}

// ─── New AI Systems Types ───────────────────────────────────────────────────

export interface SalaryForecastRequest {
  current_orders: number;
  days_passed: number;
  avg_order_value?: number;
  base_salary?: number;
  working_days_per_month?: number;
}

export interface SalaryForecastResponse {
  predicted_monthly_salary: number;
  current_daily_avg: number;
  projected_monthly_orders: number;
  confidence: 'high' | 'medium' | 'low';
  trend: 'on_track' | 'above_target' | 'below_target';
  days_remaining: number;
}

export interface EmployeeRecord {
  employee_id: string;
  employee_name: string;
  total_orders: number;
  attendance_days: number;
  error_count: number;
  late_days: number;
  salary: number;
  avg_orders_per_day: number;
}

export interface EmployeeRank {
  employee_id: string;
  employee_name: string;
  composite_score: number;
  rank: number;
  total_orders: number;
  attendance_rate: number;
  error_rate: number;
  performance_tier: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

export interface BestEmployeeResponse {
  employees: EmployeeRank[];
  best_employee: EmployeeRank | null;
}

export interface Anomaly {
  type: 'low_salary' | 'order_drop' | 'high_deductions' | 'attendance_issue';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  value: number;
  threshold: number;
  recommendation: string;
}

export interface AnomalyDetectionRequest {
  employee_id: string;
  employee_name: string;
  current_salary: number;
  expected_salary_range: [number, number];
  monthly_orders: number;
  previous_month_orders: number;
  deductions: number;
  deduction_reasons?: string[];
}

export interface AnomalyDetectionResponse {
  anomalies: Anomaly[];
  overall_risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function postAI<T>(path: string, body: unknown): Promise<T> {
  if (!AI_BASE_URL) throw new Error('AI backend not configured (VITE_AI_BACKEND_URL is not set)');
  const res = await fetch(`${AI_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const aiService = {
  /** Predict order volumes for the next N days. */
  predictOrders: (history: DayRecord[], forecastDays = 7) =>
    postAI<OrdersPrediction>('/predict-orders', {
      history,
      forecast_days: forecastDays,
    }),

  /** Get top-performing drivers ranked by orders and consistency. */
  bestDrivers: (history: DayRecord[], topN = 5) =>
    postAI<{ drivers: DriverRank[] }>('/best-driver', {
      history,
      top_n: topN,
    }),

  /** Rank delivery platforms by volume and growth. */
  topPlatforms: (history: DayRecord[]) =>
    postAI<{ platforms: PlatformRank[] }>('/top-platform', { history }),

  /** Generate smart operational alerts from data patterns. */
  smartAlerts: (
    history: DayRecord[],
    thresholds?: {
      low_demand_drop_percent?: number;
      high_demand_spike_percent?: number;
      driver_drop_percent?: number;
    },
  ) => postAI<{ alerts: SmartAlert[] }>('/smart-alerts', { history, thresholds }),

  /** Analyze salary against enterprise benchmarks. */
  analyzeSalary: (base_salary: number, orders: number, bonus: number) =>
    postAI<SalaryAnalysisResponse>('/analyze', {
      base_salary,
      orders,
      bonus,
    }),

  // ─── New AI Systems ────────────────────────────────────────────────────────

  /** Predict monthly salary based on current performance. */
  predictSalary: (data: SalaryForecastRequest) =>
    postAI<SalaryForecastResponse>('/predict-salary', data),

  /** Rank employees using composite scoring algorithm. */
  bestEmployees: (employees: EmployeeRecord[], topN = 5) =>
    postAI<BestEmployeeResponse>('/best-employee', {
      employees,
      top_n: topN,
    }),

  /** Detect anomalies in salary, orders, and deductions. */
  detectAnomalies: (data: AnomalyDetectionRequest) =>
    postAI<AnomalyDetectionResponse>('/detect-anomalies', data),

  /** Health check. */
  health: async () => {
    if (!AI_BASE_URL) throw new Error('AI backend not configured');
    const res = await fetch(`${AI_BASE_URL}/health`);
    return res.json() as Promise<{ status: string; version: string }>;
  },

  /** Whether the AI backend URL is configured. */
  isConfigured: () => !!AI_BASE_URL,
};
