/**
 * Convenience re-exports for employee-related Supabase row types.
 *
 * The canonical source remains `services/supabase/types.ts` (auto-generated).
 * Import from here instead of reaching deep into `Database["public"]["Tables"]`.
 */

import type { Database } from '@services/supabase/types';

// ─── Table Row types ─────────────────────────────────────────────────────────

export type EmployeeRow = Database['public']['Tables']['employees']['Row'];
export type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
export type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

export type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
export type AttendanceInsert = Database['public']['Tables']['attendance']['Insert'];

export type EmployeeAppRow = Database['public']['Tables']['employee_apps']['Row'];

export type EmployeeTierRow = Database['public']['Tables']['employee_tiers']['Row'];
export type EmployeeTierInsert = Database['public']['Tables']['employee_tiers']['Insert'];

export type EmployeeSchemeRow = Database['public']['Tables']['employee_scheme']['Row'];

export type DepartmentRow = Database['public']['Tables']['departments']['Row'];
export type PositionRow = Database['public']['Tables']['positions']['Row'];

// ─── Enum types ──────────────────────────────────────────────────────────────

export type EmployeeStatus = Database['public']['Enums']['employee_status'];
export type SalaryType = Database['public']['Enums']['salary_type'];
export type EmployeeWorkType = 'orders' | 'attendance' | 'hybrid';
export type CityEnum = Database['public']['Enums']['city_enum'];
export type AttendanceStatus = Database['public']['Enums']['attendance_status'];
export type SponsorshipStatus = Database['public']['Enums']['sponsorship_status_enum'];
export type LicenseStatus = Database['public']['Enums']['license_status_enum'];
