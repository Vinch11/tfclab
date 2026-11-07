CREATE TABLE public.nolio_v2_deleted_recreations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),coach_id uuid NOT NULL,
 plan_version_id uuid NOT NULL REFERENCES public.plan_versions(id),
 op_key text NOT NULL REFERENCES public.nolio_v2_operations(op_key),
 old_remote_id text NOT NULL,payload_sha256 text NOT NULL,
 plan_sha256 text NOT NULL,refs_sha256 text NOT NULL,ops_sha256 text NOT NULL,
 binding text NOT NULL CHECK(binding ~ '^[a-f0-9]{64}$'),request_id uuid NOT NULL,
 proof_kind text NOT NULL DEFAULT 'known_resource_404_and_complete_day_absence' CHECK(proof_kind='known_resource_404_and_complete_day_absence'),
 consent boolean NOT NULL CHECK(consent IS TRUE),prior_ledger jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(op_key,old_remote_id)
);
ALTER TABLE public.nolio_v2_deleted_recreations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nolio_v2_deleted_recreations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.nolio_v2_deleted_recreations TO service_role;
CREATE TRIGGER deleted_recreations_append_only BEFORE UPDATE OR DELETE ON public.nolio_v2_deleted_recreations FOR EACH ROW EXECUTE FUNCTION public.qa_nolio_v2_plan_receipts_append_only();
CREATE TRIGGER deleted_recreations_no_truncate BEFORE TRUNCATE ON public.nolio_v2_deleted_recreations FOR EACH STATEMENT EXECUTE FUNCTION public.qa_nolio_v2_plan_receipts_append_only();
CREATE FUNCTION public.nolio_v2_recreate_deleted_operation(
 p_coach_id uuid,p_plan_version_id uuid,p_op_key text,p_athlete_ref text,p_old_remote_id text,
 p_payload_sha256 text,p_request_id uuid,p_plan_sha256 text,p_refs_sha256 text,p_ops_sha256 text,p_binding text,p_consent boolean
) RETURNS boolean LANGUAGE plpgsql SET search_path=public AS $$
DECLARE r public.nolio_v2_operations%ROWTYPE;
BEGIN
 IF p_consent IS DISTINCT FROM true OR NOT EXISTS(SELECT 1 FROM public.plan_versions WHERE id=p_plan_version_id AND coach_id=p_coach_id) THEN RAISE EXCEPTION 'recreation_not_authorized'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.nolio_v2_calendar_write_locks WHERE coach_id=p_coach_id AND athlete_ref=p_athlete_ref AND plan_version_id=p_plan_version_id AND request_id=p_request_id AND expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'recreation_calendar_lease_missing'; END IF;
 SELECT * INTO r FROM public.nolio_v2_operations WHERE op_key=p_op_key AND coach_id=p_coach_id AND plan_version_id=p_plan_version_id FOR UPDATE;
 IF NOT FOUND OR r.state<>'confirmed' OR r.remote_id IS DISTINCT FROM p_old_remote_id OR r.payload_sha256<>p_payload_sha256 OR r.athlete_ref<>p_athlete_ref THEN RETURN false; END IF;
 IF p_plan_sha256 !~ '^[a-f0-9]{64}$' OR p_refs_sha256 !~ '^[a-f0-9]{64}$' OR p_ops_sha256 !~ '^[a-f0-9]{64}$' OR p_binding !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'recreation_binding_invalid'; END IF;
 INSERT INTO public.nolio_v2_deleted_recreations(coach_id,plan_version_id,op_key,old_remote_id,payload_sha256,plan_sha256,refs_sha256,ops_sha256,binding,request_id,consent,prior_ledger)
 VALUES(p_coach_id,p_plan_version_id,p_op_key,p_old_remote_id,p_payload_sha256,p_plan_sha256,p_refs_sha256,p_ops_sha256,p_binding,p_request_id,true,to_jsonb(r)) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.nolio_v2_operations SET state='sending',remote_id=NULL,detail='explicit_deleted_recreation',updated_at=now() WHERE op_key=p_op_key;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.nolio_v2_recreate_deleted_operation(uuid,uuid,text,text,text,text,uuid,text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nolio_v2_recreate_deleted_operation(uuid,uuid,text,text,text,text,uuid,text,text,text,text,boolean) TO service_role;
