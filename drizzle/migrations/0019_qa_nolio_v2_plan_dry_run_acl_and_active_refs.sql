-- 1) Droits des preuves de simulation plan complet : reproduction idempotente du durcissement
--    appliqué en QA (aucun UPDATE/DELETE/TRUNCATE des preuves, seuls lock_id/lock_until modifiables).
REVOKE ALL PRIVILEGES ON TABLE public.qa_nolio_v2_plan_dry_run_jobs, public.qa_nolio_v2_plan_dry_run_receipts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT (id, coach_id, athlete_id, plan_version_id, plan_sha256, refs_sha256, ops_sha256, total_sessions, total_ops, created_at) ON public.qa_nolio_v2_plan_dry_run_jobs TO authenticated;
GRANT SELECT ON public.qa_nolio_v2_plan_dry_run_receipts TO authenticated;
GRANT SELECT, INSERT ON public.qa_nolio_v2_plan_dry_run_jobs TO service_role;
GRANT UPDATE (lock_id, lock_until) ON public.qa_nolio_v2_plan_dry_run_jobs TO service_role;
GRANT SELECT, INSERT ON public.qa_nolio_v2_plan_dry_run_receipts TO service_role;

-- 2) Reçus append-only aussi par déclencheur (défense en profondeur, propriétaire compris).
CREATE OR REPLACE FUNCTION public.qa_nolio_v2_plan_receipts_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'plan dry-run receipts are append-only';
END $$;
DROP TRIGGER IF EXISTS qa_nolio_v2_plan_receipts_no_update ON public.qa_nolio_v2_plan_dry_run_receipts;
CREATE TRIGGER qa_nolio_v2_plan_receipts_no_update BEFORE UPDATE OR DELETE ON public.qa_nolio_v2_plan_dry_run_receipts
  FOR EACH ROW EXECUTE FUNCTION public.qa_nolio_v2_plan_receipts_append_only();
DROP TRIGGER IF EXISTS qa_nolio_v2_plan_receipts_no_truncate ON public.qa_nolio_v2_plan_dry_run_receipts;
CREATE TRIGGER qa_nolio_v2_plan_receipts_no_truncate BEFORE TRUNCATE ON public.qa_nolio_v2_plan_dry_run_receipts
  FOR EACH STATEMENT EXECUTE FUNCTION public.qa_nolio_v2_plan_receipts_append_only();
REVOKE ALL ON FUNCTION public.qa_nolio_v2_plan_receipts_append_only() FROM PUBLIC, anon, authenticated;

-- 3) Mise à jour explicite des SEULES correspondances (refs) d'une connexion V2 déjà active.
--    Jetons, scopes, consentement, association et statut inchangés. CAS : génération + refs attendues.
CREATE OR REPLACE FUNCTION public.nolio_v2_update_active_refs(p_grant_id uuid, p_coach_id uuid, p_athlete_id uuid,
  p_generation bigint, p_refs_digest text, p_expected_refs jsonb, p_refs jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.nolio_v2_oauth_grants%ROWTYPE; v_n int;
BEGIN
  IF p_refs IS NULL OR jsonb_typeof(p_refs) <> 'object' OR p_expected_refs IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'refs_invalid'); END IF;
  SELECT * INTO g FROM public.nolio_v2_oauth_grants WHERE id = p_grant_id FOR UPDATE;
  IF NOT FOUND OR g.coach_id <> p_coach_id OR g.athlete_id <> p_athlete_id THEN RETURN jsonb_build_object('ok', false, 'reason', 'binding_mismatch'); END IF;
  IF g.token_generation <> p_generation THEN RETURN jsonb_build_object('ok', false, 'reason', 'stale_generation'); END IF;
  IF g.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'reason', 'grant_not_active'); END IF;
  IF g.selected_athlete_ref IS NULL OR g.consent_confirmed_at IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'consent_unconfirmed'); END IF;
  IF g.refresh_state <> 'idle' THEN RETURN jsonb_build_object('ok', false, 'reason', 'refresh_not_idle'); END IF;
  IF g.remote_refs IS NULL OR g.remote_refs->>'digest' IS DISTINCT FROM p_refs_digest THEN RETURN jsonb_build_object('ok', false, 'reason', 'refs_digest_mismatch'); END IF;
  IF g.remote_refs_loaded_at IS NULL OR g.remote_refs_loaded_at < now() - interval '1 hour' THEN RETURN jsonb_build_object('ok', false, 'reason', 'refs_too_old_reload'); END IF;
  UPDATE public.nolio_v2_connections SET refs = p_refs, updated_at = now()
   WHERE grant_id = g.id AND coach_id = p_coach_id AND athlete_id = p_athlete_id AND status = 'active'
     AND token_generation = p_generation AND nolio_athlete_ref = g.selected_athlete_ref AND refs = p_expected_refs;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN RETURN jsonb_build_object('ok', false, 'reason', 'active_connection_cas_failed'); END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.nolio_v2_update_active_refs(uuid, uuid, uuid, bigint, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nolio_v2_update_active_refs(uuid, uuid, uuid, bigint, text, jsonb, jsonb) TO service_role;