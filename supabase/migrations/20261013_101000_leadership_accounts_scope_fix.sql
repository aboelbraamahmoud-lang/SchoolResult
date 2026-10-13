-- 6.10.38: principal and academic vice-principal are SCHOOL-WIDE, not department-bound.
-- Apply after the original school_staff_accounts table exists. Safe to rerun.
BEGIN;
ALTER TABLE public.school_staff_accounts
  DROP CONSTRAINT IF EXISTS school_staff_accounts_role_check;
ALTER TABLE public.school_staff_accounts
  DROP CONSTRAINT IF EXISTS staff_coordinator_dept;
ALTER TABLE public.school_staff_accounts
  ADD CONSTRAINT school_staff_accounts_role_check
  CHECK (role IN ('admin','coordinator','vice_principal','principal'));
ALTER TABLE public.school_staff_accounts
  ADD CONSTRAINT staff_coordinator_dept
  CHECK (role <> 'coordinator' OR cardinality(departments) > 0);
-- Leadership departments are intentionally empty: server-side leadership reads
-- use the owning school's full, whitelisted workspace, not a department filter.
UPDATE public.school_staff_accounts
  SET departments = ARRAY[]::text[], updated_at = now()
  WHERE role IN ('vice_principal','principal') AND cardinality(departments) > 0;
COMMIT;
