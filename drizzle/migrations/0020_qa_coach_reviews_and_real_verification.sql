CREATE TABLE public.qa_plan_coach_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), coach_id uuid NOT NULL, athlete_id uuid NOT NULL REFERENCES public.athletes(id), plan_version_id uuid NOT NULL REFERENCES public.plan_versions(id),
 plan_sha256 text NOT NULL CHECK (plan_sha256 ~ '^[0-9a-f]{64}$'), refs_sha256 text NOT NULL CHECK (refs_sha256 ~ '^[0-9a-f]{64}$'), ops_sha256 text NOT NULL CHECK (ops_sha256 ~ '^[0-9a-f]{64}$'),
 decisions jsonb NOT NULL CHECK (jsonb_typeof(decisions)='object'), blockers jsonb NOT NULL CHECK (jsonb_typeof(blockers)='array'), reviewed_by_coach boolean NOT NULL CHECK (reviewed_by_coach IS TRUE),
 prescription_allowed boolean NOT NULL DEFAULT false CHECK (prescription_allowed IS FALSE), scientific_attestation boolean NOT NULL DEFAULT false CHECK (scientific_attestation IS FALSE), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.qa_plan_coach_reviews TO authenticated;
GRANT SELECT, INSERT ON public.qa_plan_coach_reviews TO service_role;
ALTER TABLE public.qa_plan_coach_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_coach_reviews ON public.qa_plan_coach_reviews FOR SELECT TO authenticated USING (coach_id=auth.uid());
CREATE TABLE public.qa_nolio_v2_plan_verify_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), coach_id uuid NOT NULL, athlete_id uuid NOT NULL REFERENCES public.athletes(id), plan_version_id uuid NOT NULL REFERENCES public.plan_versions(id),
 plan_sha256 text NOT NULL CHECK (plan_sha256 ~ '^[0-9a-f]{64}$'), refs_sha256 text NOT NULL CHECK (refs_sha256 ~ '^[0-9a-f]{64}$'), ops_sha256 text NOT NULL CHECK (ops_sha256 ~ '^[0-9a-f]{64}$'), body_sha256 text NOT NULL CHECK (body_sha256 ~ '^[0-9a-f]{64}$'),
 op_key text NOT NULL REFERENCES public.nolio_v2_operations(op_key), op_index integer NOT NULL CHECK (op_index>=0), session_key text NOT NULL, session_date date NOT NULL,
 kind text NOT NULL CHECK (kind IN ('training','competition')), path text NOT NULL CHECK (path IN ('/api/v2/planned/trainings/','/api/v2/planned/competitions/')),
 outcome text NOT NULL CHECK (outcome IN ('VERIFIED_UNIQUE','UNKNOWN','ABSENT','AMBIGUOUS')), code text NOT NULL CHECK (code IN ('exact_unique','read_failed','absent','ambiguous','deadline')),
 provider_resource text, exact_matches integer NOT NULL DEFAULT 0, marker_matches integer NOT NULL DEFAULT 0, complete_read boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT verify_positive_facts CHECK (outcome <> 'VERIFIED_UNIQUE' OR (code='exact_unique' AND provider_resource IS NOT NULL AND exact_matches=1 AND marker_matches=1 AND complete_read IS TRUE)),
 CONSTRAINT verify_resource_kind CHECK (provider_resource IS NULL OR (kind='training' AND path='/api/v2/planned/trainings/' AND provider_resource ~ '^ptrn_[A-Za-z0-9]+$') OR (kind='competition' AND path='/api/v2/planned/competitions/' AND provider_resource ~ '^pcmp_[A-Za-z0-9]+$'))
);
GRANT SELECT (id,coach_id,athlete_id,plan_version_id,plan_sha256,refs_sha256,ops_sha256,body_sha256,op_key,op_index,session_key,session_date,kind,path,outcome,code,exact_matches,marker_matches,complete_read,created_at) ON public.qa_nolio_v2_plan_verify_receipts TO authenticated;
GRANT SELECT, INSERT ON public.qa_nolio_v2_plan_verify_receipts TO service_role;
ALTER TABLE public.qa_nolio_v2_plan_verify_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_plan_verify_receipts ON public.qa_nolio_v2_plan_verify_receipts FOR SELECT TO authenticated USING (coach_id=auth.uid());
CREATE TRIGGER coach_reviews_append_only BEFORE UPDATE OR DELETE ON public.qa_plan_coach_reviews FOR EACH ROW EXECUTE FUNCTION public.qa_nolio_v2_plan_receipts_append_only();
CREATE TRIGGER coach_reviews_no_truncate BEFORE TRUNCATE ON public.qa_plan_coach_reviews FOR EACH STATEMENT EXECUTE FUNCTION public.qa_nolio_v2_plan_receipts_append_only();
CREATE TRIGGER plan_verify_append_only BEFORE UPDATE OR DELETE ON public.qa_nolio_v2_plan_verify_receipts FOR EACH ROW EXECUTE FUNCTION public.qa_nolio_v2_plan_receipts_append_only();
CREATE TRIGGER plan_verify_no_truncate BEFORE TRUNCATE ON public.qa_nolio_v2_plan_verify_receipts FOR EACH STATEMENT EXECUTE FUNCTION public.qa_nolio_v2_plan_receipts_append_only();