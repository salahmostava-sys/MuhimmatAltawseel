import { supabase } from '@services/supabase/client';
import { handleSupabaseError } from '@services/serviceError';
import { getActiveEmployeesWithJobTitle } from '@services/employeeLookupService';

export type LeaveType = 'annual' | 'sick' | 'emergency' | 'unpaid' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  employee_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  days_count: number;
  status: LeaveStatus;
  reason: string | null;
  reviewer_id: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  employees?: { name: string; national_id: string | null; job_title: string | null } | null;
}

export interface LeaveCreatePayload {
  employee_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string | null;
  created_by?: string | null;
}

export const leaveTypeLabel: Record<LeaveType, string> = {
  annual:    'سنوية',
  sick:      'مرضية',
  emergency: 'طارئة',
  unpaid:    'بدون راتب',
  other:     'أخرى',
};

export const leaveStatusLabel: Record<LeaveStatus, string> = {
  pending:  'بانتظار الموافقة',
  approved: 'موافق عليها',
  rejected: 'مرفوضة',
};

export const leaveService = {
  getAll: async (): Promise<LeaveRequest[]> => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, employees(name, national_id, job_title)')
      .order('created_at', { ascending: false });
    if (error) handleSupabaseError(error, 'leaveService.getAll');
    return (data ?? []) as LeaveRequest[];
  },

  create: async (payload: LeaveCreatePayload): Promise<LeaveRequest> => {
    const { data, error } = await supabase
      .from('leave_requests')
      .insert(payload as never)
      .select('*, employees(name, national_id, job_title)')
      .single();
    if (error) handleSupabaseError(error, 'leaveService.create');
    return data as LeaveRequest;
  },

  updateStatus: async (
    id: string,
    status: LeaveStatus,
    reviewerId: string | null,
    reviewNote?: string | null,
  ): Promise<void> => {
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        reviewer_id: reviewerId,
        review_note: reviewNote ?? null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id);
    if (error) handleSupabaseError(error, 'leaveService.updateStatus');
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('leave_requests').delete().eq('id', id);
    if (error) handleSupabaseError(error, 'leaveService.delete');
  },

  getEmployees: getActiveEmployeesWithJobTitle,
};
