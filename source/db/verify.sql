begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
do $$
declare w jsonb:='{"rows":[],"settings":{"schoolName":"Cloud test"}}'; r jsonb; conflict_ok boolean:=false; rollback_ok boolean:=false; i integer;
begin
 r:=public.school_save(0,w,'10000000-0000-4000-8000-000000000001');
 if (r->>'revision')::int<>1 then raise exception 'initial save failed'; end if;
 r:=public.school_save(0,w,'10000000-0000-4000-8000-000000000001');
 if (r->>'revision')::int<>1 then raise exception 'idempotency failed'; end if;
 begin perform public.school_save(0,w,'10000000-0000-4000-8000-000000000002'); exception when sqlstate 'P0001' then conflict_ok:=sqlerrm='CLOUD_CONFLICT'; end;
 if not conflict_ok then raise exception 'revision conflict not detected'; end if;
 begin perform public.school_save(1,w,'10000000-0000-4000-8000-000000000003','[{"id":"bad","at":"invalid","workspace":{"rows":[]}}]'); exception when others then rollback_ok:=true; end;
 if not rollback_ok or (select revision from public.school_workspaces)<>1 then raise exception 'atomic rollback failed'; end if;
 perform public.school_snapshot(jsonb_build_object('id','annual','at',now(),'reason','annual','pinned',true,'workspace',w));
 for i in 1..12 loop perform public.school_snapshot(jsonb_build_object('id',i::text,'at',now()+(i||' seconds')::interval,'reason','test','workspace',w)); end loop;
 if (select count(*) from public.school_archives where not pinned)<>10 then raise exception 'retention failed'; end if;
 if not exists(select 1 from public.school_archives where id='annual') then raise exception 'permanent archive lost'; end if;
 r:=public.school_save(1,w,'10000000-0000-4000-8000-000000000004',jsonb_build_array(jsonb_build_object('id','imported','at',now(),'reason','import','workspace',w)));
 if (r->>'revision')::int<>2 or not exists(select 1 from public.school_archives where id='imported' and pinned) then raise exception 'full restore failed'; end if;
 if jsonb_array_length(public.school_archive_list())<>12 then raise exception 'archive list failed'; end if;
 if (public.school_archive_list()->0 ? 'workspace') then raise exception 'archive list leaked workspace body'; end if;
 if public.school_archive_get('annual')->'workspace' is null then raise exception 'archive fetch failed'; end if;
 if not public.school_archive_delete('annual') then raise exception 'archive delete RPC failed'; end if;
 if exists(select 1 from public.school_archives where id='annual') then raise exception 'archive delete RPC did not delete'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',true);
do $$ declare denied boolean:=false; begin
 if exists(select 1 from public.school_workspaces) or exists(select 1 from public.school_archives) then raise exception 'account isolation failed'; end if;
 begin insert into public.school_workspaces(owner_id,workspace,revision,write_id) values('00000000-0000-4000-8000-000000000001','{"rows":[]}',1,gen_random_uuid()); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'cross-account write allowed'; end if;
 perform public.school_save(0,'{"rows":[]}',gen_random_uuid());
 if (select count(*) from public.school_workspaces)<>1 then raise exception 'second account visibility failed'; end if;
end $$;
reset role;
do $$ begin
 if has_table_privilege('anon','public.school_workspaces','SELECT') or has_table_privilege('anon','public.school_archives','INSERT') or has_function_privilege('anon','public.school_save(bigint,jsonb,uuid,jsonb)','EXECUTE') or has_function_privilege('anon','public.school_archive_get(text)','EXECUTE') then raise exception 'anonymous access allowed'; end if;
 if has_table_privilege('authenticated','public.school_workspaces','INSERT') or has_table_privilege('authenticated','public.school_workspaces','UPDATE') or has_table_privilege('authenticated','public.school_workspaces','DELETE') or has_table_privilege('authenticated','public.school_archives','INSERT') or has_table_privilege('authenticated','public.school_archives','UPDATE') or has_table_privilege('authenticated','public.school_archives','DELETE') or has_table_privilege('authenticated','public.school_workspaces','TRUNCATE') or has_table_privilege('authenticated','public.school_archives','TRUNCATE') then raise exception 'authenticated role has direct write privileges'; end if;
 if not has_function_privilege('authenticated','public.school_archive_delete(text)','EXECUTE') then raise exception 'archive delete RPC unavailable'; end if;
 if exists(select 1 from pg_class where oid in ('public.school_workspaces'::regclass,'public.school_archives'::regclass) and not relrowsecurity) then raise exception 'RLS disabled'; end if;
end $$;
rollback;
select 'PASS: save, idempotency, revision conflict, atomic restore rollback, retention, permanent archives, full restore, archive metadata/list/get/delete, account isolation, cross-account denial, account-owned save, anonymous denial, least-privilege grants, RLS. Test data rolled back.' as verification;
