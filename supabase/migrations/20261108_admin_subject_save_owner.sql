-- 2026-11-08: applied to Supabase production. Idempotent source of truth for future deployments.
-- Authorized, active staff admin writes to school owner's workspace with the existing optimistic revision check.
-- No new public functions, grants, or RLS bypass exposed.
CREATE OR REPLACE FUNCTION private.school_save_impl(p_expected bigint, p_workspace jsonb, p_write_id uuid, p_archives jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); mapped_owner uuid; current_row public.school_workspaces%rowtype; point jsonb; new_revision bigint;
begin
 if uid is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'LOGIN_REQUIRED' using errcode='42501'; end if;
 if p_expected is null or p_expected<0 or p_write_id is null or jsonb_typeof(p_workspace) is distinct from 'object' or jsonb_typeof(p_workspace->'rows') is distinct from 'array' or jsonb_typeof(p_archives) is distinct from 'array' then raise exception 'INVALID_REQUEST'; end if;

 -- Active staff administrators write to the school owner workspace they load.
 select a.owner_id into mapped_owner from public.school_staff_accounts a
 where a.user_id=uid and a.role='admin' and a.active is true limit 1;
 if mapped_owner is not null then uid:=mapped_owner; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
 select * into current_row from public.school_workspaces where owner_id=uid for update;
 if current_row.write_id=p_write_id then return jsonb_build_object('revision',current_row.revision,'savedAt',current_row.saved_at,'writeId',current_row.write_id); end if;
 if coalesce(current_row.revision,0)<>p_expected then raise exception 'CLOUD_CONFLICT' using errcode='P0001'; end if;
 new_revision:=coalesce(current_row.revision,0)+1;
 insert into public.school_workspaces(owner_id,workspace,revision,write_id,saved_at) values(uid,p_workspace,new_revision,p_write_id,now())
 on conflict(owner_id) do update set workspace=excluded.workspace,revision=excluded.revision,write_id=excluded.write_id,saved_at=excluded.saved_at;
 for point in select value from jsonb_array_elements(p_archives) loop
   if jsonb_typeof(point) is distinct from 'object' or point->>'id' is null or length(point->>'id')<1 or length(point->>'id')>200 or jsonb_typeof(point->'workspace') is distinct from 'object' or jsonb_typeof(point->'workspace'->'rows') is distinct from 'array' then raise exception 'INVALID_ARCHIVE'; end if;
   if exists(select 1 from public.school_archives where owner_id=uid and id=point->>'id' and workspace is distinct from point->'workspace') then raise exception 'ARCHIVE_CONFLICT'; end if;
   insert into public.school_archives(owner_id,id,at,reason,year,pinned,workspace,bytes)
   values(uid,point->>'id',(point->>'at')::timestamptz,coalesce(point->>'reason','استعادة'),coalesce(point->>'year',''),true,point->'workspace',octet_length((point->'workspace')::text))
   on conflict(owner_id,id) do update set pinned=true;
 end loop;
 return jsonb_build_object('revision',new_revision,'savedAt',now(),'writeId',p_write_id);
end; $function$
;

CREATE OR REPLACE FUNCTION private.school_snapshot_impl(p_point jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); mapped_owner uuid; previous jsonb;
begin
 if uid is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'LOGIN_REQUIRED' using errcode='42501'; end if;
 if jsonb_typeof(p_point) is distinct from 'object' or p_point->>'id' is null or length(p_point->>'id')<1 or length(p_point->>'id')>200 or jsonb_typeof(p_point->'workspace') is distinct from 'object' or jsonb_typeof(p_point->'workspace'->'rows') is distinct from 'array' then raise exception 'INVALID_REQUEST'; end if;

 -- Active staff administrators write to the school owner workspace they load.
 select a.owner_id into mapped_owner from public.school_staff_accounts a
 where a.user_id=uid and a.role='admin' and a.active is true limit 1;
 if mapped_owner is not null then uid:=mapped_owner; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
 select workspace into previous from public.school_archives where owner_id=uid and id=p_point->>'id';
 if found then
   if previous is distinct from p_point->'workspace' then raise exception 'ARCHIVE_CONFLICT'; end if;
   return p_point;
 end if;
 insert into public.school_archives(owner_id,id,at,reason,year,pinned,workspace,bytes)
 values(uid,p_point->>'id',(p_point->>'at')::timestamptz,coalesce(p_point->>'reason','حفظ تلقائي'),coalesce(p_point->>'year',''),coalesce((p_point->>'pinned')::boolean,false),p_point->'workspace',octet_length((p_point->'workspace')::text));
 delete from public.school_archives where owner_id=uid and not pinned and id in (
   select id from public.school_archives where owner_id=uid and not pinned order by at desc,id desc offset 10
 );
 return p_point;
end; $function$
;
