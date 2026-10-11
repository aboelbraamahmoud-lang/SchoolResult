-- SchoolResult v6.10.16 — additive migration. Review/test and back up production before applying.
-- No student names, grades or academic IDs are stored in this quota table.
BEGIN;
CREATE TABLE IF NOT EXISTS public.school_ai_usage (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_utc date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  requests integer NOT NULL DEFAULT 0 CHECK (requests BETWEEN 0 AND 1000),
  PRIMARY KEY (owner_id,day_utc)
);
ALTER TABLE public.school_ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_ai_usage FROM public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.school_ai_take_quota() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE used_count integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 INSERT INTO public.school_ai_usage(owner_id,day_utc,requests)
 VALUES(auth.uid(),(now() AT TIME ZONE 'UTC')::date,1)
 ON CONFLICT(owner_id,day_utc) DO UPDATE SET requests=public.school_ai_usage.requests+1
 WHERE public.school_ai_usage.requests<20
 RETURNING requests INTO used_count;
 RETURN used_count IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.school_ai_take_quota() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.school_ai_take_quota() TO authenticated;
COMMIT;
