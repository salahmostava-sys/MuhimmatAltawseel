-- Fix all foreign keys referencing auth.users(id) that lack ON DELETE behaviour.
-- Without this, deleting a user from auth.users via the admin Edge Function fails
-- with "Database error deleting user" because of RESTRICT (the default).
--
-- Strategy: ON DELETE SET NULL — preserve the row, just clear the user reference.

-- ── employee_scheme.assigned_by ──
ALTER TABLE public.employee_scheme
  DROP CONSTRAINT IF EXISTS employee_scheme_assigned_by_fkey;
ALTER TABLE public.employee_scheme
  ADD CONSTRAINT employee_scheme_assigned_by_fkey
  FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── vehicle_assignments.created_by ──
ALTER TABLE public.vehicle_assignments
  DROP CONSTRAINT IF EXISTS vehicle_assignments_created_by_fkey;
ALTER TABLE public.vehicle_assignments
  ADD CONSTRAINT vehicle_assignments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── maintenance_logs.created_by ──
ALTER TABLE public.maintenance_logs
  DROP CONSTRAINT IF EXISTS maintenance_logs_created_by_fkey;
ALTER TABLE public.maintenance_logs
  ADD CONSTRAINT maintenance_logs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── attendance.created_by ──
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_created_by_fkey;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── daily_orders.created_by ──
ALTER TABLE public.daily_orders
  DROP CONSTRAINT IF EXISTS daily_orders_created_by_fkey;
ALTER TABLE public.daily_orders
  ADD CONSTRAINT daily_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── advances.approved_by ──
ALTER TABLE public.advances
  DROP CONSTRAINT IF EXISTS advances_approved_by_fkey;
ALTER TABLE public.advances
  ADD CONSTRAINT advances_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── external_deductions.approved_by ──
ALTER TABLE public.external_deductions
  DROP CONSTRAINT IF EXISTS external_deductions_approved_by_fkey;
ALTER TABLE public.external_deductions
  ADD CONSTRAINT external_deductions_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── salary_records.approved_by ──
ALTER TABLE public.salary_records
  DROP CONSTRAINT IF EXISTS salary_records_approved_by_fkey;
ALTER TABLE public.salary_records
  ADD CONSTRAINT salary_records_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── pl_records.created_by ──
ALTER TABLE public.pl_records
  DROP CONSTRAINT IF EXISTS pl_records_created_by_fkey;
ALTER TABLE public.pl_records
  ADD CONSTRAINT pl_records_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── alerts.resolved_by ──
ALTER TABLE public.alerts
  DROP CONSTRAINT IF EXISTS alerts_resolved_by_fkey;
ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── audit_log.user_id ──
ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── account_assignments.created_by ──
ALTER TABLE public.account_assignments
  DROP CONSTRAINT IF EXISTS account_assignments_created_by_fkey;
ALTER TABLE public.account_assignments
  ADD CONSTRAINT account_assignments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── locked_months.locked_by ──
ALTER TABLE public.locked_months
  DROP CONSTRAINT IF EXISTS locked_months_locked_by_fkey;
ALTER TABLE public.locked_months
  ADD CONSTRAINT locked_months_locked_by_fkey
  FOREIGN KEY (locked_by) REFERENCES auth.users(id) ON DELETE SET NULL;
