-- 6.6.0: keep archive listings lightweight; fetch archive bodies only on demand.
create or replace function public.school_archive_list() returns jsonb
language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'at',a.at,'reason',a.reason,'year',a.year,'pinned',a.pinned,'bytes',a.bytes) order by a.at desc,a.id),'[]'::jsonb)
 from public.school_archives a where a.owner_id=(select auth.uid());
$$;

create or replace function public.school_archive_get(p_id text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'LOGIN_REQUIRED' using errcode='42501'; end if;
 if p_id is null or length(p_id)<1 or length(p_id)>200 then raise exception 'INVALID_REQUEST'; end if;
 select to_jsonb(a)-'owner_id' into result from public.school_archives a where a.owner_id=uid and a.id=p_id;
 if result is null then raise exception 'ARCHIVE_NOT_FOUND' using errcode='P0002'; end if;
 return result;
end; $$;

revoke all on function public.school_archive_list(),public.school_archive_get(text) from public,anon;
grant execute on function public.school_archive_list(),public.school_archive_get(text) to authenticated,service_role;
