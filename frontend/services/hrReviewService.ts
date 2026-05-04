import { supabase } from '@services/supabase/client';
import { handleSupabaseError } from '@services/serviceError';
import { getActiveEmployeesWithJobTitle } from '@services/employeeLookupService';

export interface HrReview {
  id: string;
  employee_id: string;
  month_year: string;
  reviewer_id: string | null;
  attendance_score: number;
  performance_score: number;
  behavior_score: number;
  commitment_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employees?: { name: string; job_title: string | null } | null;
}

export interface HrReviewPayload {
  employee_id: string;
  month_year: string;
  reviewer_id?: string | null;
  attendance_score: number;
  performance_score: number;
  behavior_score: number;
  commitment_score: number;
  notes?: string | null;
}

export const getOverallScore = (r: Pick<HrReview, 'attendance_score' | 'performance_score' | 'behavior_score' | 'commitment_score'>): number =>
  parseFloat(((r.attendance_score + r.performance_score + r.behavior_score + r.commitment_score) / 4).toFixed(1));

export const getGrade = (overall: number): { label: string; color: string } => {
  if (overall >= 9)  return { label: 'ممتاز',    color: 'text-emerald-600' };
  if (overall >= 7)  return { label: 'جيد جداً', color: 'text-blue-600' };
  if (overall >= 5)  return { label: 'جيد',      color: 'text-yellow-600' };
  if (overall >= 3)  return { label: 'مقبول',    color: 'text-orange-600' };
  return                    { label: 'ضعيف',     color: 'text-red-600' };
};

export const hrReviewService = {
  getByMonth: async (monthYear: string): Promise<HrReview[]> => {
    const { data, error } = await supabase
      .from('hr_performance_reviews')
      .select('*, employees(name, job_title)')
      .eq('month_year', monthYear)
      .order('created_at', { ascending: false });
    if (error) handleSupabaseError(error, 'hrReviewService.getByMonth');
    return (data ?? []) as HrReview[];
  },

  create: async (payload: HrReviewPayload): Promise<HrReview> => {
    const { data, error } = await supabase
      .from('hr_performance_reviews')
      .insert({ ...payload, updated_at: new Date().toISOString() } as never)
      .select('*, employees(name, job_title)')
      .single();
    if (error) handleSupabaseError(error, 'hrReviewService.create');
    return data as HrReview;
  },

  update: async (id: string, payload: Partial<HrReviewPayload>): Promise<void> => {
    const { error } = await supabase
      .from('hr_performance_reviews')
      .update({ ...payload, updated_at: new Date().toISOString() } as never)
      .eq('id', id);
    if (error) handleSupabaseError(error, 'hrReviewService.update');
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('hr_performance_reviews').delete().eq('id', id);
    if (error) handleSupabaseError(error, 'hrReviewService.delete');
  },

  getEmployees: getActiveEmployeesWithJobTitle,
};
