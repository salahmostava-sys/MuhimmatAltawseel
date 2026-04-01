import { supabase } from '@services/supabase/client';
import { handleSupabaseError } from '@services/serviceError';

export interface PagePermission {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const permissionsService = {
  getUserPermission: async (userId: string, pageKey: string): Promise<PagePermission | null> => {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('can_view, can_edit, can_delete')
      .eq('user_id', userId)
      .eq('permission_key', pageKey)
      .maybeSingle();

    if (error) handleSupabaseError(error, 'permissionsService.getUserPermission');

    if (!data) return null;

    return {
      can_view: data.can_view,
      can_edit: data.can_edit,
      can_delete: data.can_delete,
    };
  },
};
