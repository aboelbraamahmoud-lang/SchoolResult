-- SchoolResult 6.10.66: READ-ONLY schema and grants checks.
-- Run in the existing SchoolResult Supabase SQL Editor ONLY, after selecting the correct project.
-- This file does NOT modify school data and does NOT create a new database.
select current_database() as database_name,
       to_regclass('public.school_workspaces') as school_workspaces,
       to_regclass('public.school_staff_accounts') as school_staff_accounts,
       to_regclass('public.school_archives') as school_archives;

select table_schema,table_name,column_name,data_type
from information_schema.columns
where table_schema='public' and (
 (table_name='school_workspaces' and column_name in ('owner_id','workspace','revision','write_id','saved_at')) or
 (table_name='school_staff_accounts' and column_name in ('user_id','owner_id','role','departments','permissions','active'))
)
order by table_name,column_name;

select grantee,table_name,privilege_type
from information_schema.table_privileges
where table_schema='public' and table_name in ('school_workspaces','school_staff_accounts')
 and grantee in ('authenticated','service_role','anon')
order by table_name,grantee,privilege_type;

select routine_schema,routine_name,routine_type
from information_schema.routines
where routine_schema in ('public','private')
 and routine_name in ('school_save','school_staff_admin_save','school_save_impl')
order by routine_schema,routine_name;

select tablename,policyname,roles,cmd
from pg_policies
where schemaname='public' and tablename in ('school_workspaces','school_staff_accounts')
order by tablename,policyname;
