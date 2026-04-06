import { supabase } from './supabase/client';
import { throwIfError } from './serviceError';
import type { SalaryDraftPatch } from '@modules/salaries/types/salary.types';

export interface SalaryDraft {
  id: string;
  user_id: string;
  month_year: string;
  employee_id: string;
  draft_data: SalaryDraftPatch;
  created_at: string;
  updated_at: string;
}

const rowIdToEmployeeId = (rowId: string, monthYear: string) => {
  const suffix = `-${monthYear}`;
  return rowId.endsWith(suffix) ? rowId.slice(0, -suffix.length) : rowId;
};

export const salaryDraftService = {
  /**
   * Get all drafts for a specific month
   */
  getDraftsForMonth: async (monthYear: string): Promise<Record<string, SalaryDraftPatch>> => {
    const { data, error } = await supabase
      .from('salary_drafts')
      .select('employee_id, draft_data')
      .eq('month_year', monthYear);

    throwIfError(error, 'salaryDraftService.getDraftsForMonth');

    const draftMap: Record<string, SalaryDraftPatch> = {};
    (data || []).forEach((draft) => {
      const rowId = `${draft.employee_id}-${monthYear}`;
      draftMap[rowId] = draft.draft_data as SalaryDraftPatch;
    });

    return draftMap;
  },

  /**
   * Save or update a draft for a specific employee
   */
  saveDraft: async (
    monthYear: string,
    employeeId: string,
    draftData: SalaryDraftPatch
  ): Promise<void> => {
    const { error } = await supabase
      .from('salary_drafts')
      .upsert(
        {
          month_year: monthYear,
          employee_id: employeeId,
          draft_data: draftData,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        },
        {
          onConflict: 'user_id,month_year,employee_id',
        }
      );

    throwIfError(error, 'salaryDraftService.saveDraft');
  },

  /**
   * Save multiple drafts at once (batch operation)
   */
  saveDraftsBatch: async (
    monthYear: string,
    drafts: Record<string, SalaryDraftPatch>
  ): Promise<void> => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const records = Object.entries(drafts).map(([rowId, draftData]) => {
      const employeeId = rowIdToEmployeeId(rowId, monthYear);
      return {
        user_id: userId,
        month_year: monthYear,
        employee_id: employeeId,
        draft_data: draftData,
      };
    });

    if (records.length === 0) return;

    const { error } = await supabase
      .from('salary_drafts')
      .upsert(records, {
        onConflict: 'user_id,month_year,employee_id',
      });

    throwIfError(error, 'salaryDraftService.saveDraftsBatch');
  },

  /**
   * Replace the current user's drafts for a month without a delete-then-save gap.
   */
  syncDraftsForMonth: async (
    monthYear: string,
    drafts: Record<string, SalaryDraftPatch>
  ): Promise<void> => {
    const desiredEmployeeIds = Object.keys(drafts).map((rowId) => rowIdToEmployeeId(rowId, monthYear));

    if (desiredEmployeeIds.length > 0) {
      await salaryDraftService.saveDraftsBatch(monthYear, drafts);
    }

    const { data, error } = await supabase
      .from('salary_drafts')
      .select('employee_id')
      .eq('month_year', monthYear);

    throwIfError(error, 'salaryDraftService.syncDraftsForMonth.select');

    const desiredEmployeeIdSet = new Set(desiredEmployeeIds);
    const staleEmployeeIds = (data || [])
      .map((draft) => String(draft.employee_id || ''))
      .filter((employeeId) => employeeId && !desiredEmployeeIdSet.has(employeeId));

    if (staleEmployeeIds.length === 0) return;

    const { error: deleteError } = await supabase
      .from('salary_drafts')
      .delete()
      .eq('month_year', monthYear)
      .in('employee_id', staleEmployeeIds);

    throwIfError(deleteError, 'salaryDraftService.syncDraftsForMonth.delete');
  },

  /**
   * Delete a specific draft
   */
  deleteDraft: async (monthYear: string, employeeId: string): Promise<void> => {
    const { error } = await supabase
      .from('salary_drafts')
      .delete()
      .eq('month_year', monthYear)
      .eq('employee_id', employeeId);

    throwIfError(error, 'salaryDraftService.deleteDraft');
  },

  /**
   * Delete all drafts for a specific month
   */
  clearDraftsForMonth: async (monthYear: string): Promise<void> => {
    const { error } = await supabase
      .from('salary_drafts')
      .delete()
      .eq('month_year', monthYear);

    throwIfError(error, 'salaryDraftService.clearDraftsForMonth');
  },

  /**
   * Subscribe to draft changes for real-time collaboration
   */
  subscribeToDraftChanges: (
    monthYear: string,
    onDraftChange: (payload: { employee_id: string; draft_data: SalaryDraftPatch; user_id: string }) => void
  ) => {
    return supabase
      .channel(`salary_drafts:${monthYear}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'salary_drafts',
          filter: `month_year=eq.${monthYear}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const record = payload.new as { employee_id: string; draft_data: SalaryDraftPatch; user_id: string };
            onDraftChange(record);
          }
        }
      )
      .subscribe();
  },
};
