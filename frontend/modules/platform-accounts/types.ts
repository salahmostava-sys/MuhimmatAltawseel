import type { PlatformApp, PlatformEmployee } from '@services/platformAccountService';
import type { AccountAssignment } from '@services/accountAssignmentService';

export type PlatformAppOption = PlatformApp;
export type PlatformEmployeeOption = PlatformEmployee;
export type PlatformAssignment = AccountAssignment;

export type AssignmentWithName = PlatformAssignment & { employee_name?: string };

export interface AssignmentHistoryGroup {
  month: string;
  count: number;
  hasMultipleAssignments: boolean;
  assignments: AssignmentWithName[];
}

export interface AssignmentEmployeePreview {
  nationalId: string | null;
  residencyExpiryLabel: string | null;
}

export interface PlatformAccountView {
  id: string;
  app_id: string;
  employee_id?: string | null;
  app_name?: string;
  app_color?: string;
  app_text_color?: string;
  account_username: string;
  account_id_on_platform: string | null;
  iqama_number: string | null;
  iqama_expiry_date: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
  current_employee?: PlatformEmployeeOption | null;
  assignments?: AssignmentWithName[];
  assignments_this_month_count?: number;
}

export type SortKey =
  | 'account_username'
  | 'account_id_on_platform'
  | 'iqama_number'
  | 'iqama_expiry_date'
  | 'current_employee'
  | 'assignments_month'
  | 'status';

export type SortDir = 'asc' | 'desc';

export interface AccountDialogForm {
  employee_id: string | null;
  app_id: string;
  account_username: string;
  account_id_on_platform: string;
  iqama_number: string;
  iqama_expiry_date: string;
  status: 'active' | 'inactive';
  notes: string;
}

export interface AssignDialogForm {
  employee_id: string;
  start_date: string;
  notes: string;
}

export interface IqamaBadge {
  label: string;
  cls: string;
}
