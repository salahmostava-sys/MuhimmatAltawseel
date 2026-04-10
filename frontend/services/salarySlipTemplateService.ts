import { supabase } from './supabase/client';

export interface SalarySlipTemplate {
  id?: string;
  name: string;
  header_html: string;
  footer_html: string;
  selected_columns: import('./supabase/types').Json;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export const salarySlipTemplateService = {
  /** Get all templates. */
  async getAll(): Promise<SalarySlipTemplate[]> {
    const { data, error } = await supabase
      .from('salary_slip_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /** Get the default template. */
  async getDefault(): Promise<SalarySlipTemplate | null> {
    const { data, error } = await supabase
      .from('salary_slip_templates')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /** Create a new template. */
  async create(template: Omit<SalarySlipTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<SalarySlipTemplate> {
    // If setting as default, unset others first (optional, but good practice if not handled by DB triggers)
    if (template.is_default) {
      await supabase
        .from('salary_slip_templates')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('salary_slip_templates')
      .insert(template)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Update an existing template. */
  async update(id: string, updates: Partial<SalarySlipTemplate>): Promise<SalarySlipTemplate> {
    if (updates.is_default) {
      await supabase
        .from('salary_slip_templates')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('salary_slip_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Delete a template. */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('salary_slip_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /** Set a template as default. */
  async setDefault(id: string): Promise<void> {
    // Transaction-like behavior
    await supabase
      .from('salary_slip_templates')
      .update({ is_default: false })
      .neq('id', id);

    const { error } = await supabase
      .from('salary_slip_templates')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
  }
};
