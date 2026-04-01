export interface CustomColumn {
  key: string;
  label: string;
}

export interface AppData {
  id: string;
  name: string;
  name_en: string | null;
  brand_color: string;
  text_color: string;
  is_active: boolean;
  is_active_this_month: boolean;
  employeeCount: number;
  ordersCount: number;
  custom_columns: CustomColumn[];
}

export interface AppFormValues {
  name: string;
  name_en: string;
  brand_color: string;
  text_color: string;
  is_active: boolean;
  custom_columns: CustomColumn[];
}

export interface AppEmployee {
  id: string;
  name: string;
  monthOrders: number;
  targetShare: number | null;
  projectedMonthEnd: number | null;
  onTrack: boolean | null;
}

export interface AppMonthlyOrderRow {
  app_id: string | null;
  employee_id: string | null;
  orders_count: number | null;
}

export interface AppEmployeeAssignmentRow {
  employee_id: string;
  employees: {
    id: string;
    name: string;
    status: string;
    sponsorship_status: string | null;
  } | null;
}

export interface AppEmployeeOrderRow {
  employee_id: string | null;
  orders_count: number | null;
}
