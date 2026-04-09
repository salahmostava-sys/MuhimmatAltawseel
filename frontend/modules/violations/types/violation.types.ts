export type VehicleSuggestion = {
  id: string;
  plate_number: string;
  plate_number_en: string | null;
  brand: string | null;
  type: string;
};
export type AssignmentJoinRow = {
  id: string;
  employee_id: string;
  vehicles?: { plate_number?: string | null } | null;
  employees?: { name?: string | null; national_id?: string | null } | null;
};

export type DeductionRow = {
  id: string;
  employee_id: string;
  amount: number | string | null;
};

export type ViolationDataRow = {
  id: string;
  employee_id: string;
  note: string | null;
  incident_date: string | null;
  amount: number | string | null;
  apply_month: string;
  approval_status: string;
  linked_advance_id?: string | null;
  employees?: { name?: string | null; national_id?: string | null } | null;
};

export type ResultRow = {
  employee_name: string;
  national_id: string | null;
  violation_details: string;
  violation_date: string;
  amount: number;
  status: 'recorded' | 'not_recorded';
  external_deduction_id: string | null;
  employee_id: string;
  assignment_id: string;
};

export type ViolationRecord = {
  id: string;
  employee_id: string;
  employee_name: string;
  national_id: string | null;
  violation_details: string;
  incident_date: string | null;
  amount: number;
  apply_month: string;
  status: string; // approval_status
  /** مربوط بجدول السلف عند التحويل — المصدر الرسمي لحالة السلفة */
  linked_advance_id: string | null;
};

export type ViolationForm = {
  plate_number: string;
  selected_vehicle_id: string | null;
  violation_datetime: string;
  violation_date_only: string; // for date-only mode
  amount: string;
  note: string;
  place: string;
  use_time: boolean;
};

export type ViolationSortFieldKey =
  | 'employee_name'
  | 'violation_details'
  | 'incident_date'
  | 'amount'
  | 'status'
  | 'advance_status';

export type VehicleAssignmentForViolation = {
  start_at?: string | null;
  start_date: string;
  returned_at?: string | null;
  end_date?: string | null;
};

export type ViolationAdvanceStatusCellProps = Readonly<{
  v: ViolationRecord;
  convertedAdv: boolean;
}>;
