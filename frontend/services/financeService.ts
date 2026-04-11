import { supabase } from '@services/supabase/client';
import { handleSupabaseError } from '@services/serviceError';

export type TransactionType = 'revenue' | 'expense';

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  category: string;
  description: string | null;
  amount: number;
  month_year: string;
  date: string;
  is_auto: boolean;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  category: string;
  description?: string;
  amount: number;
  month_year: string;
  date: string;
  notes?: string;
}

export const financeService = {
  getByMonth: async (monthYear: string) => {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .eq('month_year', monthYear)
      .order('date', { ascending: false });
    if (error) handleSupabaseError(error, 'financeService.getByMonth');
    return (data ?? []) as FinanceTransaction[];
  },

  create: async (input: CreateTransactionInput) => {
    const { data, error } = await supabase
      .from('finance_transactions')
      .insert({
        type: input.type,
        category: input.category,
        description: input.description || null,
        amount: input.amount,
        month_year: input.month_year,
        date: input.date,
        notes: input.notes || null,
        is_auto: false,
      })
      .select()
      .single();
    if (error) handleSupabaseError(error, 'financeService.create');
    return data;
  },

  update: async (id: string, input: Partial<CreateTransactionInput>) => {
    const { error } = await supabase
      .from('finance_transactions')
      .update(input)
      .eq('id', id);
    if (error) handleSupabaseError(error, 'financeService.update');
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('finance_transactions')
      .delete()
      .eq('id', id);
    if (error) handleSupabaseError(error, 'financeService.delete');
  },

  /** Sync approved salaries as auto-expenses for a month */
  syncSalariesAsExpenses: async (monthYear: string) => {
    // Get approved salary total
    const { data: salaries, error: salErr } = await supabase
      .from('salary_records')
      .select('net_salary')
      .eq('month_year', monthYear)
      .eq('is_approved', true);
    if (salErr) handleSupabaseError(salErr, 'financeService.syncSalariesAsExpenses.fetch');

    const totalSalaries = (salaries ?? []).reduce((s, r) => s + (Number(r.net_salary) || 0), 0);
    if (totalSalaries <= 0) return;

    // Upsert auto salary expense
    const { error } = await supabase
      .from('finance_transactions')
      .upsert({
        type: 'expense' as const,
        category: 'رواتب',
        description: `إجمالي رواتب شهر ${monthYear}`,
        amount: totalSalaries,
        month_year: monthYear,
        date: `${monthYear}-28`,
        is_auto: true,
        reference_type: 'salaries',
        notes: `${(salaries ?? []).length} موظف — تم المزامنة تلقائياً`,
      }, { onConflict: 'id' })
      .select('id')
      .single();

    // If upsert fails (no existing auto record), try insert fresh
    if (error) {
      // Delete old auto salary entries for this month first
      await supabase
        .from('finance_transactions')
        .delete()
        .eq('month_year', monthYear)
        .eq('is_auto', true)
        .eq('reference_type', 'salaries');

      const { error: insertErr } = await supabase
        .from('finance_transactions')
        .insert({
          type: 'expense',
          category: 'رواتب',
          description: `إجمالي رواتب شهر ${monthYear}`,
          amount: totalSalaries,
          month_year: monthYear,
          date: `${monthYear}-28`,
          is_auto: true,
          reference_type: 'salaries',
          notes: `${(salaries ?? []).length} موظف — تم المزامنة تلقائياً`,
        });
      if (insertErr) handleSupabaseError(insertErr, 'financeService.syncSalariesAsExpenses.insert');
    }
  },

  /** Get monthly summary */
  getMonthlySummary: async (monthYear: string) => {
    const rows = await financeService.getByMonth(monthYear);
    const revenue = rows.filter(r => r.type === 'revenue').reduce((s, r) => s + r.amount, 0);
    const expenses = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    return { revenue, expenses, balance: revenue - expenses, transactions: rows };
  },
};
