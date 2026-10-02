-- 6.6.0: remove privileges left behind by older grants. TRUNCATE bypasses row policies and must not be available to app users.
revoke all privileges on table public.school_workspaces, public.school_archives from authenticated;
grant select, insert, update, delete on table public.school_workspaces, public.school_archives to authenticated;
revoke all privileges on table public.school_workspaces, public.school_archives from anon;
