/**
 * Shared employee lookup utilities.
 * Extracted from services that had identical getEmployees implementations.
 */
import { supabase } from '@services/supabase/client';
import { handleSupabaseError } from '@services/serviceError';

export type ActiveEmployeeWithJobTitle = { id: string; name: string; job_title: string | null };

/**
 * Fetches active employees with id, name, and job_title.
 * Used by hrReviewService and leaveService (previously duplicated).
 */
export async function getActiveEmployeesWithJobTitle(): Promise<ActiveEmployeeWithJobTitle[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, job_title')
    .eq('status', 'active')
    .order('name');
  if (error) handleSupabaseError(error, 'getActiveEmployeesWithJobTitle');
  return (data ?? []) as ActiveEmployeeWithJobTitle[];
}
