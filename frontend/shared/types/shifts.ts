export type WorkType = 'orders' | 'shift' | 'hybrid';

export interface DailyShift {
  id: string;
  employee_id: string;
  app_id: string;
  date: string;
  hours_worked: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppHybridRule {
  id: string;
  app_id: string;
  min_hours_for_shift: number;
  shift_rate: number;
  fallback_to_orders: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppWithWorkType {
  id: string;
  name: string;
  name_en: string | null;
  logo_url?: string | null;
  work_type: WorkType;
  is_active: boolean;
}

export interface ShiftFilter {
  employeeId?: string;
  appId?: string;
  date?: string;
  monthYear?: string;
}
