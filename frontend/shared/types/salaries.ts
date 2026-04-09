/**
 * Convenience re-exports for salary-related Supabase row types.
 *
 * The canonical source remains `services/supabase/types.ts` (auto-generated).
 * Import from here instead of reaching deep into `Database["public"]["Tables"]`.
 */

import type { Database } from '@services/supabase/types';

// ─── Table Row types ─────────────────────────────────────────────────────────

export type SalaryRecordRow = Database['public']['Tables']['salary_records']['Row'];
export type SalaryRecordInsert = Database['public']['Tables']['salary_records']['Insert'];
export type SalaryRecordUpdate = Database['public']['Tables']['salary_records']['Update'];

export type SalarySchemeRow = Database['public']['Tables']['salary_schemes']['Row'];
export type SalarySchemeInsert = Database['public']['Tables']['salary_schemes']['Insert'];

export type SalarySchemeTierRow = Database['public']['Tables']['salary_scheme_tiers']['Row'];
export type SalarySchemeTierInsert = Database['public']['Tables']['salary_scheme_tiers']['Insert'];

export type SchemeMonthSnapshotRow = Database['public']['Tables']['scheme_month_snapshots']['Row'];

export type AdvanceRow = Database['public']['Tables']['advances']['Row'];
export type AdvanceInsert = Database['public']['Tables']['advances']['Insert'];

export type AdvanceInstallmentRow = Database['public']['Tables']['advance_installments']['Row'];

export type ExternalDeductionRow = Database['public']['Tables']['external_deductions']['Row'];
export type ExternalDeductionInsert = Database['public']['Tables']['external_deductions']['Insert'];

export type LockedMonthRow = Database['public']['Tables']['locked_months']['Row'];

// ─── Enum types ──────────────────────────────────────────────────────────────

export type AdvanceStatus = Database['public']['Enums']['advance_status'];
export type InstallmentStatus = Database['public']['Enums']['installment_status'];
export type ApprovalStatus = Database['public']['Enums']['approval_status'];
export type DeductionType = Database['public']['Enums']['deduction_type'];
export type SchemeStatus = Database['public']['Enums']['scheme_status'];
