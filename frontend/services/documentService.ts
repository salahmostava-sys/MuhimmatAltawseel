import { supabase } from './supabase/client';
import { handleSupabaseError } from './serviceError';

export interface EmployeeDoc {
  id: string;
  name: string;
  job_title: string | null;
  status: string;
  residency_expiry: string | null;
  probation_end_date: string | null;
  health_insurance_expiry: string | null;
  license_expiry: string | null;
}

export const documentService = {
  getActiveEmployeeDocs: async (): Promise<EmployeeDoc[]> => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, job_title, status, residency_expiry, probation_end_date, health_insurance_expiry, license_expiry')
      .eq('status', 'active')
      .order('name');
    if (error) handleSupabaseError(error, 'documentService.getActiveEmployeeDocs');
    return (data ?? []) as EmployeeDoc[];
  },
};
