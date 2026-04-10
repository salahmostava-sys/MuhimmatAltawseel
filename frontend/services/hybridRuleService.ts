import { supabase } from '@services/supabase/client';
import { toServiceError } from '@services/serviceError';
import type { AppHybridRule } from '@shared/types/shifts';
import type { TablesInsert } from '@services/supabase/types';

export const hybridRuleService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('app_hybrid_rules')
      .select('*, apps(name, name_en)')
      .order('created_at', { ascending: false });
    if (error) throw toServiceError(error, 'hybridRuleService.getAll');
    return data ?? [];
  },

  getByAppId: async (appId: string) => {
    const { data, error } = await supabase
      .from('app_hybrid_rules')
      .select('*')
      .eq('app_id', appId)
      .maybeSingle();
    if (error) throw toServiceError(error, 'hybridRuleService.getByAppId');
    return data;
  },

  upsert: async (rule: Omit<AppHybridRule, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('app_hybrid_rules')
      .upsert(rule as any, { onConflict: 'app_id' })
      .select()
      .single();
    if (error) throw toServiceError(error, 'hybridRuleService.upsert');
    return data;
  },

  delete: async (appId: string) => {
    const { error } = await supabase
      .from('app_hybrid_rules')
      .delete()
      .eq('app_id', appId);
    if (error) throw toServiceError(error, 'hybridRuleService.delete');
  },
};
