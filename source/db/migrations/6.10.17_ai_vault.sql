-- SchoolResult 6.10.17 - encrypted Gemini credentials, stored in Supabase Vault.
-- Additive only: does not touch grades, imports, academic structures or workspaces.
BEGIN;
CREATE TABLE IF NOT EXISTS public.school_ai_credentials (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vault_secret_id uuid NOT NULL,
  model text NOT NULL DEFAULT 'gemini-2.5-flash',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (model IN ('gemini-2.5-flash','gemini-2.5-pro','gemini-2.5-flash-lite'))
);
ALTER TABLE public.school_ai_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.school_ai_credentials FROM PUBLIC, anon, authenticated;
-- Even authenticated clients must not see ciphertext or secret identifiers.
DROP POLICY IF EXISTS school_ai_credentials_deny_client ON public.school_ai_credentials;
CREATE POLICY school_ai_credentials_deny_client ON public.school_ai_credentials
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- The single RPC is restricted to service_role; only the authenticated Edge Function
-- may call it AFTER verifying the user's JWT and ownership of their workspace.
CREATE OR REPLACE FUNCTION public.school_ai_vault_action(
  p_owner uuid,
  p_action text,
  p_key text DEFAULT NULL,
  p_model text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog,public,extensions,vault,pg_temp AS $$
DECLARE v_row public.school_ai_credentials%rowtype;
DECLARE v_secret uuid;
DECLARE v_model text;
DECLARE v_clear text;
BEGIN
  IF p_owner IS NULL THEN RAISE EXCEPTION 'MISSING_OWNER'; END IF;
  IF p_action NOT IN ('status','save','read') THEN RAISE EXCEPTION 'BAD_ACTION'; END IF;
  SELECT * INTO v_row FROM public.school_ai_credentials WHERE owner_id=p_owner FOR UPDATE;
  IF p_action='save' THEN
    IF p_key IS NULL OR length(btrim(p_key))<20 OR length(p_key)>260 OR p_key !~ '^[A-Za-z0-9_.-]+$'
      THEN RAISE EXCEPTION 'INVALID_KEY_FORMAT'; END IF;
    v_model := coalesce(p_model, 'gemini-2.5-flash');
    IF v_model NOT IN ('gemini-2.5-flash','gemini-2.5-pro','gemini-2.5-flash-lite')
      THEN RAISE EXCEPTION 'INVALID_MODEL'; END IF;
    IF FOUND THEN
      PERFORM vault.update_secret(v_row.vault_secret_id,p_key,NULL,NULL,NULL);
      v_secret:=v_row.vault_secret_id;
    ELSE
      v_secret:=vault.create_secret(p_key,'schoolresult-gemini-'||p_owner::text,'SchoolResult Gemini API credential',NULL);
    END IF;
    INSERT INTO public.school_ai_credentials(owner_id,vault_secret_id,model,updated_at)
      VALUES(p_owner,v_secret,v_model,now())
      ON CONFLICT(owner_id) DO UPDATE SET vault_secret_id=excluded.vault_secret_id,model=excluded.model,updated_at=excluded.updated_at;
    RETURN jsonb_build_object('configured',true,'model',v_model,'updatedAt',now());
  END IF;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('configured',false,'model','gemini-2.5-flash');
  END IF;
  IF p_action='status' THEN
    RETURN jsonb_build_object('configured',true,'model',v_row.model,'updatedAt',v_row.updated_at);
  END IF;
  SELECT decrypted_secret INTO v_clear FROM vault.decrypted_secrets WHERE id=v_row.vault_secret_id;
  IF v_clear IS NULL OR length(v_clear)<20 THEN RAISE EXCEPTION 'DECRYPTION_FAILED'; END IF;
  RETURN jsonb_build_object('configured',true,'model',v_row.model,'key',v_clear);
END;
$$;
REVOKE ALL ON FUNCTION public.school_ai_vault_action(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.school_ai_vault_action(uuid,text,text,text) TO service_role;
COMMIT;
