-- QA Nolio V2 : références confirmées + rafraîchissement sérialisé durable (génération/fencing).
ALTER TABLE public.nolio_v2_oauth_grants
  ADD COLUMN IF NOT EXISTS token_generation bigint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS refresh_state text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS refresh_lock_id uuid,
  ADD COLUMN IF NOT EXISTS refresh_lock_until timestamptz,
  ADD COLUMN IF NOT EXISTS remote_refs jsonb,
  ADD COLUMN IF NOT EXISTS remote_refs_loaded_at timestamptz;
ALTER TABLE public.nolio_v2_oauth_grants DROP CONSTRAINT IF EXISTS nolio_v2_oauth_grants_status_check;
ALTER TABLE public.nolio_v2_oauth_grants ADD CONSTRAINT nolio_v2_oauth_grants_status_check
  CHECK (status IN ('pending_athlete_selection','pending_refs','active'));
ALTER TABLE public.nolio_v2_oauth_grants ADD CONSTRAINT nolio_v2_oauth_grants_refresh_state_check
  CHECK (refresh_state IN ('idle','refreshing','needs_reconnect','unknown'));

ALTER TABLE public.nolio_v2_connections
  ADD COLUMN IF NOT EXISTS grant_id uuid REFERENCES public.nolio_v2_oauth_grants(id),
  ADD COLUMN IF NOT EXISTS token_generation bigint;

-- Reconnexion explicite (callback) : nouvelle génération, verrou effacé, connexions liées révoquées.
CREATE OR REPLACE FUNCTION public.nolio_v2_grant_reconnect(
  p_coach_id uuid, p_athlete_id uuid, p_app_type text, p_scopes text[], p_user_ref text,
  p_allowed jsonb, p_access text, p_refresh text, p_expires timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_gen bigint;
BEGIN
  INSERT INTO public.nolio_v2_oauth_grants AS g (coach_id, athlete_id, status, api_version, app_type, granted_scopes,
    nolio_user_ref, allowed_athletes, selected_athlete_ref, consent_confirmed_at, access_token, refresh_token, token_expires_at)
  VALUES (p_coach_id, p_athlete_id, 'pending_athlete_selection', 'v2', p_app_type, p_scopes, p_user_ref, p_allowed,
    NULL, NULL, p_access, p_refresh, p_expires)
  ON CONFLICT (coach_id, athlete_id) DO UPDATE SET
    status = 'pending_athlete_selection', app_type = EXCLUDED.app_type, granted_scopes = EXCLUDED.granted_scopes,
    nolio_user_ref = EXCLUDED.nolio_user_ref, allowed_athletes = EXCLUDED.allowed_athletes,
    selected_athlete_ref = NULL, consent_confirmed_at = NULL, access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token, token_expires_at = EXCLUDED.token_expires_at,
    token_generation = g.token_generation + 1, refresh_state = 'idle', refresh_lock_id = NULL, refresh_lock_until = NULL,
    remote_refs = NULL, remote_refs_loaded_at = NULL, updated_at = now()
  RETURNING id, token_generation INTO v_id, v_gen;
  UPDATE public.nolio_v2_connections SET status = 'revoked', updated_at = now() WHERE grant_id = v_id AND status = 'active';
  RETURN jsonb_build_object('ok', true, 'generation', v_gen);
END $$;

-- Début de rafraîchissement : réservation durable (jamais un verrou de processus).
CREATE OR REPLACE FUNCTION public.nolio_v2_refresh_begin(p_grant_id uuid, p_expected_generation bigint, p_lock_id uuid, p_lease_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.nolio_v2_oauth_grants%ROWTYPE; v_same int;
BEGIN
  IF p_lease_seconds < 5 OR p_lease_seconds > 120 THEN RAISE EXCEPTION 'lease_out_of_range'; END IF;
  SELECT * INTO g FROM public.nolio_v2_oauth_grants WHERE id = p_grant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'grant_not_found'); END IF;
  SELECT count(*) INTO v_same FROM public.nolio_v2_oauth_grants WHERE nolio_user_ref = g.nolio_user_ref;
  IF v_same <> 1 THEN RETURN jsonb_build_object('ok', false, 'reason', 'account_ambiguous'); END IF;
  IF g.refresh_state = 'refreshing' THEN
    IF g.refresh_lock_until <= now() THEN
      -- Bail expiré : le jeton a PU être consommé/tourné ⇒ inconnu, jamais un nouvel essai.
      UPDATE public.nolio_v2_oauth_grants SET refresh_state = 'unknown', refresh_lock_until = NULL, updated_at = now() WHERE id = g.id;
      RETURN jsonb_build_object('ok', false, 'reason', 'refresh_unknown');
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'refresh_in_progress');
  END IF;
  IF g.refresh_state = 'needs_reconnect' THEN RETURN jsonb_build_object('ok', false, 'reason', 'needs_reconnect'); END IF;
  IF g.refresh_state = 'unknown' THEN RETURN jsonb_build_object('ok', false, 'reason', 'refresh_unknown'); END IF;
  IF g.token_generation <> p_expected_generation THEN RETURN jsonb_build_object('ok', false, 'reason', 'stale_generation', 'generation', g.token_generation); END IF;
  IF g.refresh_token IS NULL OR length(g.refresh_token) = 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'needs_reconnect'); END IF;
  UPDATE public.nolio_v2_oauth_grants SET refresh_state = 'refreshing', refresh_lock_id = p_lock_id,
    refresh_lock_until = now() + make_interval(secs => p_lease_seconds), updated_at = now() WHERE id = g.id;
  RETURN jsonb_build_object('ok', true, 'refresh_token', g.refresh_token, 'generation', g.token_generation);
END $$;

-- Validation : seulement le détenteur exact du verrou ET de la génération.
CREATE OR REPLACE FUNCTION public.nolio_v2_refresh_commit(p_grant_id uuid, p_lock_id uuid, p_generation bigint,
  p_access text, p_refresh text, p_expires timestamptz, p_scopes text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.nolio_v2_oauth_grants%ROWTYPE; v_gen bigint; v_conns int;
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
  v_gen := g.token_generation + 1;
  UPDATE public.nolio_v2_oauth_grants SET access_token = p_access, refresh_token = p_refresh, token_expires_at = p_expires,
    granted_scopes = p_scopes, token_generation = v_gen, refresh_state = 'idle', refresh_lock_id = NULL, refresh_lock_until = NULL, updated_at = now()
   WHERE id = g.id;
  UPDATE public.nolio_v2_connections SET access_token = p_access, token_expires_at = p_expires, granted_scopes = p_scopes,
    token_generation = v_gen, updated_at = now() WHERE grant_id = g.id AND status = 'active';
  GET DIAGNOSTICS v_conns = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'generation', v_gen, 'connections', v_conns);
END $$;

-- Échec : 'needs_reconnect' (refus explicite), 'unknown' (réponse perdue/ambiguë), 'released_not_sent' (aucune requête partie).
CREATE OR REPLACE FUNCTION public.nolio_v2_refresh_fail(p_grant_id uuid, p_lock_id uuid, p_outcome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n int;
BEGIN
  IF p_outcome NOT IN ('needs_reconnect','unknown','released_not_sent') THEN RAISE EXCEPTION 'outcome_invalid'; END IF;
  UPDATE public.nolio_v2_oauth_grants SET
    refresh_state = CASE p_outcome WHEN 'released_not_sent' THEN 'idle' ELSE p_outcome END,
    refresh_lock_id = CASE p_outcome WHEN 'unknown' THEN refresh_lock_id ELSE NULL END,
    refresh_lock_until = NULL, updated_at = now()
   WHERE id = p_grant_id AND refresh_lock_id = p_lock_id AND refresh_state = 'refreshing';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', v_n = 1);
END $$;

-- Références distantes téléchargées (CAS génération, statut pending_refs/active).
CREATE OR REPLACE FUNCTION public.nolio_v2_store_remote_refs(p_grant_id uuid, p_generation bigint, p_refs jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n int;
BEGIN
  UPDATE public.nolio_v2_oauth_grants SET remote_refs = p_refs, remote_refs_loaded_at = now(), updated_at = now()
   WHERE id = p_grant_id AND token_generation = p_generation AND status IN ('pending_refs','active') AND selected_athlete_ref IS NOT NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', v_n = 1);
END $$;

-- Activation : copie le jeton depuis le grant (jamais transmis par le client), une seule connexion active.
CREATE OR REPLACE FUNCTION public.nolio_v2_activate_connection(p_grant_id uuid, p_coach_id uuid, p_athlete_id uuid,
  p_generation bigint, p_refs_digest text, p_refs jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.nolio_v2_oauth_grants%ROWTYPE; v_id uuid;
BEGIN
  SELECT * INTO g FROM public.nolio_v2_oauth_grants WHERE id = p_grant_id FOR UPDATE;
  IF NOT FOUND OR g.coach_id <> p_coach_id OR g.athlete_id <> p_athlete_id THEN RETURN jsonb_build_object('ok', false, 'reason', 'binding_mismatch'); END IF;
  IF g.token_generation <> p_generation THEN RETURN jsonb_build_object('ok', false, 'reason', 'stale_generation'); END IF;
  IF g.status <> 'pending_refs' THEN RETURN jsonb_build_object('ok', false, 'reason', 'grant_not_pending_refs'); END IF;
  IF g.selected_athlete_ref IS NULL OR g.consent_confirmed_at IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'consent_unconfirmed'); END IF;
  IF g.refresh_state <> 'idle' THEN RETURN jsonb_build_object('ok', false, 'reason', 'refresh_not_idle'); END IF;
  IF g.token_expires_at <= now() + interval '60 seconds' THEN RETURN jsonb_build_object('ok', false, 'reason', 'token_expired_or_expiring'); END IF;
  IF g.remote_refs IS NULL OR g.remote_refs->>'digest' IS DISTINCT FROM p_refs_digest THEN RETURN jsonb_build_object('ok', false, 'reason', 'refs_digest_mismatch'); END IF;
  IF g.remote_refs_loaded_at < now() - interval '1 hour' THEN RETURN jsonb_build_object('ok', false, 'reason', 'refs_too_old_reload'); END IF;
  IF NOT (g.granted_scopes @> ARRAY['planned:read','planned:write']) OR g.api_version <> 'v2' OR g.app_type NOT IN ('partner','team') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'grant_contract_invalid');
  END IF;
  INSERT INTO public.nolio_v2_connections (coach_id, athlete_id, api_version, app_type, status, nolio_athlete_ref, granted_scopes,
    access_token, token_expires_at, refs, consent_confirmed_at, grant_id, token_generation)
  VALUES (g.coach_id, g.athlete_id, 'v2', g.app_type, 'active', g.selected_athlete_ref, g.granted_scopes,
    g.access_token, g.token_expires_at, p_refs, g.consent_confirmed_at, g.id, g.token_generation)
  RETURNING id INTO v_id;
  UPDATE public.nolio_v2_oauth_grants SET status = 'active', updated_at = now() WHERE id = g.id;
  RETURN jsonb_build_object('ok', true, 'connectionId', v_id);
END $$;

REVOKE ALL ON FUNCTION public.nolio_v2_grant_reconnect(uuid, uuid, text, text[], text, jsonb, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nolio_v2_refresh_begin(uuid, bigint, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nolio_v2_refresh_commit(uuid, uuid, bigint, text, text, timestamptz, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nolio_v2_refresh_fail(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nolio_v2_store_remote_refs(uuid, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nolio_v2_activate_connection(uuid, uuid, uuid, bigint, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nolio_v2_grant_reconnect(uuid, uuid, text, text[], text, jsonb, text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.nolio_v2_refresh_begin(uuid, bigint, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.nolio_v2_refresh_commit(uuid, uuid, bigint, text, text, timestamptz, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.nolio_v2_refresh_fail(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.nolio_v2_store_remote_refs(uuid, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.nolio_v2_activate_connection(uuid, uuid, uuid, bigint, text, jsonb) TO service_role;
REVOKE ALL PRIVILEGES ON TABLE public.nolio_v2_oauth_grants, public.nolio_v2_connections FROM PUBLIC, anon, authenticated;