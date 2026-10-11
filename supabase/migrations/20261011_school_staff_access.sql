-- SchoolResult 6.10.26: owner-governed staff identities, fail-closed access.
BEGIN;
CREATE TABLE IF NOT EXISTS public.school_staff_accounts (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 username text NOT NULL UNIQUE,
 display_name text NOT NULL,
 role text NOT NULL CHECK(role IN ('admin','coordinator')),
 departments text[] NOT NULL DEFAULT ARRAY[]::text[],
 permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
 active boolean NOT NULL DEFAULT true,
 created_by uuid REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT staff_coordinator_dept CHECK (role='admin' OR cardinality(departments)>0)
);
CREATE INDEX IF NOT EXISTS idx_school_staff_accounts_owner ON public.school_staff_accounts(owner_id);
ALTER TABLE public.school_staff_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_staff_accounts FROM PUBLIC,anon,authenticated;

-- Only staff admins may submit whole-workspace writes. Owner uses existing RPC.
CREATE OR REPLACE FUNCTION private.school_staff_admin_owner()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owner uuid;
BEGIN
 IF auth.uid() IS NULL OR coalesce(auth.jwt()->>'is_anonymous','false')='true' THEN
  RAISE EXCEPTION 'LOGIN_REQUIRED' USING errcode='42501';
 END IF;
 SELECT owner_id INTO v_owner FROM public.school_staff_accounts
 WHERE user_id=auth.uid() AND active=true AND role='admin';
 IF v_owner IS NULL THEN RAISE EXCEPTION 'STAFF_ADMIN_REQUIRED' USING errcode='42501'; END IF;
 RETURN v_owner;
END;
$$;
REVOKE ALL ON FUNCTION private.school_staff_admin_owner() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.school_staff_admin_load()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid; rowdata public.school_workspaces%rowtype;
BEGIN
 uid:=private.school_staff_admin_owner();
 SELECT * INTO rowdata FROM public.school_workspaces WHERE owner_id=uid;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('workspace',rowdata.workspace,'revision',rowdata.revision,'write_id',rowdata.write_id,'saved_at',rowdata.saved_at);
END;
$$;
REVOKE ALL ON FUNCTION public.school_staff_admin_load() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.school_staff_admin_load() TO authenticated;

CREATE OR REPLACE FUNCTION public.school_staff_admin_save(p_expected bigint,p_workspace jsonb,p_write_id uuid,p_archives jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid; rowdata public.school_workspaces%rowtype; point jsonb; new_revision bigint;
BEGIN
 uid:=private.school_staff_admin_owner();
 IF p_expected IS NULL OR p_expected<0 OR p_write_id IS NULL OR jsonb_typeof(p_workspace) IS DISTINCT FROM 'object'
   OR jsonb_typeof(p_workspace->'rows') IS DISTINCT FROM 'array'
   OR jsonb_typeof(p_archives) IS DISTINCT FROM 'array' OR jsonb_array_length(p_archives)>15 THEN RAISE EXCEPTION 'INVALID_REQUEST'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
 SELECT * INTO rowdata FROM public.school_workspaces WHERE owner_id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SCHOOL_NOT_FOUND'; END IF;
 IF rowdata.write_id=p_write_id THEN RETURN jsonb_build_object('revision',rowdata.revision,'savedAt',rowdata.saved_at,'writeId',rowdata.write_id); END IF;
 IF rowdata.revision<>p_expected THEN RAISE EXCEPTION 'CLOUD_CONFLICT' USING errcode='P0001'; END IF;
 new_revision:=rowdata.revision+1;
 UPDATE public.school_workspaces SET workspace=p_workspace,revision=new_revision,write_id=p_write_id,saved_at=now() WHERE owner_id=uid;
 FOR point IN SELECT value FROM jsonb_array_elements(p_archives) LOOP
  IF jsonb_typeof(point) IS DISTINCT FROM 'object' OR length(coalesce(point->>'id','')) NOT BETWEEN 1 AND 200
    OR jsonb_typeof(point->'workspace') IS DISTINCT FROM 'object' OR jsonb_typeof(point->'workspace'->'rows') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'INVALID_ARCHIVE'; END IF;
  IF EXISTS(SELECT 1 FROM public.school_archives WHERE owner_id=uid AND id=point->>'id' AND workspace IS DISTINCT FROM point->'workspace') THEN RAISE EXCEPTION 'ARCHIVE_CONFLICT'; END IF;
  INSERT INTO public.school_archives(owner_id,id,at,reason,year,pinned,workspace,bytes)
  VALUES(uid,point->>'id',(point->>'at')::timestamptz,coalesce(point->>'reason','استعادة'),coalesce(point->>'year',''),true,point->'workspace',octet_length((point->'workspace')::text))
  ON CONFLICT(owner_id,id) DO UPDATE SET pinned=true;
 END LOOP;
 RETURN jsonb_build_object('revision',new_revision,'savedAt',now(),'writeId',p_write_id);
END;
$$;
REVOKE ALL ON FUNCTION public.school_staff_admin_save(bigint,jsonb,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.school_staff_admin_save(bigint,jsonb,uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.school_staff_admin_archive_list()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'at',a.at,'reason',a.reason,'year',a.year,'pinned',a.pinned,'bytes',a.bytes) ORDER BY a.at DESC,a.id),'[]'::jsonb)
 FROM public.school_archives a WHERE a.owner_id=private.school_staff_admin_owner() AND a.deleted_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.school_staff_admin_archive_list() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.school_staff_admin_archive_list() TO authenticated;
CREATE OR REPLACE FUNCTION public.school_staff_admin_archive_get(p_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE answer jsonb;
BEGIN
 SELECT to_jsonb(a)-'owner_id'-'deleted_at' INTO answer FROM public.school_archives a
 WHERE a.owner_id=private.school_staff_admin_owner() AND a.id=p_id AND a.deleted_at IS NULL;
 IF answer IS NULL THEN RAISE EXCEPTION 'ARCHIVE_NOT_FOUND'; END IF;
 RETURN answer;
END;
$$;
REVOKE ALL ON FUNCTION public.school_staff_admin_archive_get(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.school_staff_admin_archive_get(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.school_staff_admin_archive_delete(p_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE affected integer;
BEGIN
 UPDATE public.school_archives SET deleted_at=now()
 WHERE owner_id=private.school_staff_admin_owner() AND id=p_id AND deleted_at IS NULL;
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN affected>0;
END;
$$;
REVOKE ALL ON FUNCTION public.school_staff_admin_archive_delete(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.school_staff_admin_archive_delete(text) TO authenticated;

-- Coordinator plan-only write. The entire grades/teacher/settings JSON is never accepted as a write parameter.
CREATE OR REPLACE FUNCTION public.school_staff_coordinator_plan_save(p_plan jsonb,p_expected bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE user_row public.school_staff_accounts%rowtype; ws public.school_workspaces%rowtype;
DECLARE plans jsonb; clean jsonb; found_id boolean; item jsonb;
BEGIN
 SELECT * INTO user_row FROM public.school_staff_accounts WHERE user_id=auth.uid() AND active=true AND role='coordinator';
 IF NOT FOUND OR coalesce((user_row.permissions->>'savePlans')::boolean,false)=false THEN RAISE EXCEPTION 'PERMISSION_DENIED' USING errcode='42501'; END IF;
 IF jsonb_typeof(p_plan) IS DISTINCT FROM 'object' OR length(coalesce(p_plan->>'id','')) NOT BETWEEN 5 AND 140
   OR length(coalesce(p_plan->>'subject','')) NOT BETWEEN 2 AND 140 OR octet_length(p_plan::text)>60000
   OR jsonb_typeof(p_plan->'steps') IS DISTINCT FROM 'array' OR jsonb_typeof(p_plan->'members') IS DISTINCT FROM 'array'
   OR jsonb_array_length(p_plan->'members')>250 OR jsonb_array_length(p_plan->'steps')>20 THEN RAISE EXCEPTION 'INVALID_PLAN'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(user_row.owner_id::text,0));
 SELECT * INTO ws FROM public.school_workspaces WHERE owner_id=user_row.owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SCHOOL_NOT_FOUND'; END IF;
 IF ws.revision IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'CLOUD_CONFLICT' USING errcode='P0001'; END IF;
 IF NOT EXISTS(
   SELECT 1 FROM jsonb_array_elements(coalesce(ws.workspace->'teacherAssignments','[]'::jsonb)) t
   WHERE t->>'subject'=p_plan->>'subject' AND (t->>'department'=ANY(user_row.departments) OR t->>'subject'=ANY(user_row.departments))
 ) THEN RAISE EXCEPTION 'DEPARTMENT_FORBIDDEN' USING errcode='42501'; END IF;
 -- Validate every listed student is actually in coordinator's own subject and class. No fabricated names/other subjects.
 IF EXISTS(
  SELECT 1 FROM jsonb_array_elements(p_plan->'members') m
  WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(ws.workspace->'rows','[]'::jsonb)) r
   WHERE r->>'subject'=p_plan->>'subject' AND r->>'studentId'=m->>'studentId'
    AND (r->>'department'=ANY(user_row.departments) OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(coalesce(ws.workspace->'teacherAssignments','[]'::jsonb)) t
      WHERE t->>'subject'=r->>'subject' AND t->>'department'=ANY(user_row.departments)))
  )
 ) THEN RAISE EXCEPTION 'STUDENT_SCOPE_FORBIDDEN' USING errcode='42501'; END IF;
 plans:=coalesce(ws.workspace->'aiPlans','[]'::jsonb);
 IF jsonb_typeof(plans) IS DISTINCT FROM 'array' THEN plans:='[]'::jsonb; END IF;
 -- Replace one plan of the same department or append; never change grades, imported data or other plans.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(plans) a WHERE a->>'id'=p_plan->>'id' AND a->>'subject'<>p_plan->>'subject') THEN RAISE EXCEPTION 'PLAN_SCOPE_FORBIDDEN' USING errcode='42501'; END IF;
 SELECT coalesce(jsonb_agg(CASE WHEN a->>'id'=p_plan->>'id' THEN p_plan ELSE a END),'[]'::jsonb) INTO clean FROM jsonb_array_elements(plans) a;
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(plans) a WHERE a->>'id'=p_plan->>'id') INTO found_id;
 IF NOT found_id THEN clean:=clean||jsonb_build_array(p_plan); END IF;
 UPDATE public.school_workspaces SET workspace=jsonb_set(ws.workspace,'{aiPlans}',clean),revision=revision+1,
   write_id=gen_random_uuid(),saved_at=now() WHERE owner_id=user_row.owner_id;
 RETURN jsonb_build_object('revision',ws.revision+1,'savedAt',now(),'plan',p_plan);
END;
$$;
REVOKE ALL ON FUNCTION public.school_staff_coordinator_plan_save(jsonb,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.school_staff_coordinator_plan_save(jsonb,bigint) TO authenticated;
COMMIT;
