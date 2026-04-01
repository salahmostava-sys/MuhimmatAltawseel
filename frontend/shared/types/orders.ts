/**
 * Convenience re-exports for order-related Supabase row types.
 *
 * The canonical source remains `services/supabase/types.ts` (auto-generated).
 * Import from here instead of reaching deep into `Database["public"]["Tables"]`.
 */

import type { Database } from '@services/supabase/types';

// ─── Table Row types ─────────────────────────────────────────────────────────

export type DailyOrderRow = Database['public']['Tables']['daily_orders']['Row'];
export type DailyOrderInsert = Database['public']['Tables']['daily_orders']['Insert'];
export type DailyOrderUpdate = Database['public']['Tables']['daily_orders']['Update'];

export type AppRow = Database['public']['Tables']['apps']['Row'];
export type AppInsert = Database['public']['Tables']['apps']['Insert'];
export type AppUpdate = Database['public']['Tables']['apps']['Update'];

export type AppTargetRow = Database['public']['Tables']['app_targets']['Row'];

export type PlatformAccountRow = Database['public']['Tables']['platform_accounts']['Row'];
export type PlatformAccountInsert = Database['public']['Tables']['platform_accounts']['Insert'];

export type AccountAssignmentRow = Database['public']['Tables']['account_assignments']['Row'];
