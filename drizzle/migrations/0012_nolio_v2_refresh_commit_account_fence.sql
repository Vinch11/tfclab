-- QA : le commit de refresh refait le contrôle « un grant par compte Nolio ».
-- Doublon apparu depuis le begin : aucun jeton écrit, grant needs_reconnect,
-- connexions actives du grant révoquées. Seules les connexions 'active' sont
-- mises à jour : une connexion révoquée par reconnexion n'est jamais réactivée.
CREATE OR REPLACE FUNCTION public.nolio_v2_refresh_commit(p_grant_id uuid, p_lock_id uuid, p_generation bigint,
  p_access text, p_refresh text, p_expires timestamptz, p_scopes text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.nolio_v2_oauth_grants%ROWTYPE; v_gen bigint; v_conns int; v_same int;
BEGIN
  IF p_access IS NULL OR length(p_access) < 8 OR p_refresh IS NULL OR length(p_refresh) < 8 OR p_expires <= now() + interval '60 seconds' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'commit_payload_invalid');
  END IF;
  IF NOT (p_scopes @> ARRAY['planned:read','planned:write']) THEN RETURN jsonb_build_object('ok', false, 'reason', 'scopes_missing'); END IF;
  SELECT * INTO g FROM public.nolio_v2_oauth_grants WHERE id = p_grant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'grant_not_found'); END IF;
  IF g.refresh_lock_id IS DISTINCT FROM p_lock_id OR g.token_generation <> p_generation OR g.refresh_state NOT IN ('refreshing','unknown') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'fenced');
  END IF;
  SELECT count(*) INTO v_same FROM public.nolio_v2_oauth_grants WHERE nolio_user_ref = g.nolio_user_ref;
  IF v_same <> 1 THEN
    UPDATE public.nolio_v2_oauth_grants SET refresh_state = 'needs_reconnect', refresh_lock_id = NULL, refresh_lock_until = NULL, updated_at = now()
     WHERE id = g.id;
    UPDATE public.nolio_v2_connections SET status = 'revoked', updated_at = now() WHERE grant_id = g.id AND status = 'active';
    RETURN jsonb_build_object('ok', false, 'reason', 'account_ambiguous');
  END IF;
  v_gen := g.token_generation + 1;
  UPDATE public.nolio_v2_oauth_grants SET access_token = p_access, refresh_token = p_refresh, token_expires_at = p_expires,
    granted_scopes = p_scopes, token_generation = v_gen, refresh_state = 'idle', refresh_lock_id = NULL, refresh_lock_until = NULL, updated_at = now()
   WHERE id = g.id;
  UPDATE public.nolio_v2_connections SET access_token = p_access, token_expires_at = p_expires, granted_scopes = p_scopes,
    token_generation = v_gen, updated_at = now() WHERE grant_id = g.id AND status = 'active';
  GET DIAGNOSTICS v_conns = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'generation', v_gen, 'connections', v_conns);
END $$;

REVOKE ALL ON FUNCTION public.nolio_v2_refresh_commit(uuid, uuid, bigint, text, text, timestamptz, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nolio_v2_refresh_commit(uuid, uuid, bigint, text, text, timestamptz, text[]) TO service_role;