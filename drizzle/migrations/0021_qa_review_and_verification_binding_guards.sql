ALTER TABLE public.qa_plan_coach_reviews ADD CONSTRAINT coach_review_decisions_exact CHECK (decisions ?& ARRAY['prescriptions','load_recovery','safety','race_dates','exercise_associations'] AND decisions - ARRAY['prescriptions','load_recovery','safety','race_dates','exercise_associations'] = '{}'::jsonb AND decisions->>'prescriptions' IN ('accepted','blocked') AND decisions->>'load_recovery' IN ('accepted','blocked') AND decisions->>'safety' IN ('accepted','blocked') AND decisions->>'race_dates' IN ('accepted','blocked') AND decisions->>'exercise_associations' IN ('accepted','blocked') AND NOT jsonb_path_exists(decisions, '$.* ? (@ == null)'));
CREATE FUNCTION public.qa_plan_evidence_binding_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.plan_versions p JOIN public.athletes a ON a.id=p.athlete_id WHERE p.id=NEW.plan_version_id AND p.coach_id=NEW.coach_id AND p.athlete_id=NEW.athlete_id AND a.coach_id=NEW.coach_id) THEN RAISE EXCEPTION 'evidence ownership mismatch'; END IF;
 IF TG_TABLE_NAME='qa_nolio_v2_plan_verify_receipts' THEN
  IF NOT EXISTS (SELECT 1 FROM public.nolio_v2_operations o WHERE o.op_key=NEW.op_key AND o.coach_id=NEW.coach_id AND o.plan_version_id=NEW.plan_version_id AND o.session_key=NEW.session_key AND o.path=NEW.path AND o.payload_sha256=NEW.body_sha256) THEN RAISE EXCEPTION 'ledger evidence mismatch'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.qa_plan_evidence_binding_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER review_binding BEFORE INSERT ON public.qa_plan_coach_reviews FOR EACH ROW EXECUTE FUNCTION public.qa_plan_evidence_binding_guard();
CREATE TRIGGER verification_binding BEFORE INSERT ON public.qa_nolio_v2_plan_verify_receipts FOR EACH ROW EXECUTE FUNCTION public.qa_plan_evidence_binding_guard();