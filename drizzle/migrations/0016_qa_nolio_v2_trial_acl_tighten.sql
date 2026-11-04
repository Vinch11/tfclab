REVOKE ALL PRIVILEGES ON TABLE public.qa_nolio_v2_trial_receipts FROM service_role;
GRANT SELECT, INSERT ON TABLE public.qa_nolio_v2_trial_receipts TO service_role;
REVOKE ALL PRIVILEGES ON TABLE public.qa_nolio_v2_trials FROM service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.qa_nolio_v2_trials TO service_role;