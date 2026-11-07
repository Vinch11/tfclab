REVOKE ALL PRIVILEGES ON TABLE public.qa_plan_coach_reviews, public.qa_nolio_v2_plan_verify_receipts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.qa_plan_coach_reviews TO authenticated;
GRANT SELECT,INSERT ON public.qa_plan_coach_reviews TO service_role;
GRANT SELECT (id,coach_id,athlete_id,plan_version_id,plan_sha256,refs_sha256,ops_sha256,body_sha256,op_key,op_index,session_key,session_date,kind,path,outcome,code,exact_matches,marker_matches,complete_read,created_at) ON public.qa_nolio_v2_plan_verify_receipts TO authenticated;
GRANT SELECT,INSERT ON public.qa_nolio_v2_plan_verify_receipts TO service_role;
REVOKE ALL ON FUNCTION public.qa_plan_evidence_binding_guard() FROM PUBLIC,anon,authenticated;