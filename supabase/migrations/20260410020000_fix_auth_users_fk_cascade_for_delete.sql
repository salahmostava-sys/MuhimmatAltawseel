-- Fix foreign keys referencing auth.users that block user deletion.
-- Change bare REFERENCES (default RESTRICT) to ON DELETE SET NULL
-- so that deleting a user from auth.users does not fail.

-- 1) platform_accounts.created_by
ALTER TABLE public.platform_accounts
  DROP CONSTRAINT IF EXISTS platform_accounts_created_by_fkey;

ALTER TABLE public.platform_accounts
  ADD CONSTRAINT platform_accounts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) locked_months.locked_by
ALTER TABLE public.locked_months
  DROP CONSTRAINT IF EXISTS locked_months_locked_by_fkey;

ALTER TABLE public.locked_months
  ADD CONSTRAINT locked_months_locked_by_fkey
  FOREIGN KEY (locked_by) REFERENCES auth.users(id) ON DELETE SET NULL;
