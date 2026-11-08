-- SchoolResult: specialist accounts use principal/vice-principal read-only school reports.
BEGIN;
ALTER TABLE public.school_staff_accounts
  DROP CONSTRAINT IF EXISTS school_staff_accounts_role_check;
ALTER TABLE public.school_staff_accounts
  ADD CONSTRAINT school_staff_accounts_role_check
  CHECK (role IN ('admin', 'coordinator', 'vice_principal', 'principal', 'psychologist', 'social_worker'));
-- Preserve all RLS restrictions and the coordinator-only department constraint.
-- Existing accounts, grades, students, and reports are untouched.
COMMIT;
