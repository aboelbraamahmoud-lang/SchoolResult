-- Applied in SchoolResult production on 2026-11-08.
-- PostgREST authenticated requests default to 8s; large school workspace saves
-- and pinned snapshots occasionally exceeded that and failed with SQLSTATE 57014.
-- Do NOT raise timeouts for unrelated queries or loosen RLS/permissions.
-- Supabase documentation: https://supabase.com/docs/guides/database/postgres/timeouts
ALTER FUNCTION public.school_save(bigint, jsonb, uuid, jsonb) SET statement_timeout TO '30s';
ALTER FUNCTION public.school_snapshot(jsonb) SET statement_timeout TO '30s';
ALTER FUNCTION public.school_staff_admin_save(bigint, jsonb, uuid, jsonb) SET statement_timeout TO '30s';
NOTIFY pgrst, 'reload config';
