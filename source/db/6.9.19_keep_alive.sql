-- SchoolResult 6.9.19 — harmless read-only health endpoint for Supabase keep-alive.
-- Run once in Supabase SQL Editor before enabling the scheduled GitHub workflow.

create table if not exists public.school_health (
  id smallint primary key check (id = 1),
  service text not null default 'schoolresult'
);

insert into public.school_health(id,service)
values (1,'schoolresult')
on conflict (id) do update set service = excluded.service;

alter table public.school_health enable row level security;

revoke all on table public.school_health from public, anon, authenticated;
grant select on table public.school_health to anon, authenticated;

drop policy if exists school_health_public_read on public.school_health;
create policy school_health_public_read
on public.school_health
for select
to anon, authenticated
using (id = 1);

comment on table public.school_health is
'Read-only non-sensitive health row used by SchoolResult scheduled keep-alive. No school or user data is stored here.';
