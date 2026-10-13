-- SchoolResult 6.10.36: principal and academic vice-principal are read-only staff roles.
-- Run once after the original school staff migration; current owner/admin writes remain unchanged.
BEGIN;
ALTER TABLE public.school_staff_accounts DROP CONSTRAINT IF EXISTS school_staff_accounts_role_check;
ALTER TABLE public.school_staff_accounts DROP CONSTRAINT IF EXISTS staff_coordinator_dept;
ALTER TABLE public.school_staff_accounts ADD CONSTRAINT school_staff_accounts_role_check
  CHECK(role IN ('admin','coordinator','vice_principal','principal'));
ALTER TABLE public.school_staff_accounts ADD CONSTRAINT staff_coordinator_dept
  CHECK(role <> 'coordinator' OR cardinality(departments)>0);
-- Keep RLS enabled, no new direct staff table access. Privileged reads still pass through
-- school-staff Edge Function (service_role, authenticated getUser, active account, role).
COMMIT;
