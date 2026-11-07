ALTER TABLE public.qa_nolio_v2_trial_receipts
  ADD CONSTRAINT qa_trial_receipt_verified_unique_facts CHECK (
    verdict <> 'VERIFIED_UNIQUE' OR (
      action IS NOT NULL AND action = 'verify' AND code IS NOT NULL AND code = 'exact_unique'
      AND items_read IS NOT NULL AND items_read >= 1
      AND marker_matches IS NOT NULL AND marker_matches = 1
      AND exact_matches IS NOT NULL AND exact_matches = 1)),
  ADD CONSTRAINT qa_trial_receipt_post_accepted_facts CHECK (
    verdict <> 'POST_ACCEPTED' OR (action IS NOT NULL AND action = 'send' AND http_status IS NOT NULL AND http_status = 201));
ALTER TABLE public.qa_nolio_v2_trials
  ADD CONSTRAINT qa_trial_post_accepted_facts CHECK (
    state <> 'post_accepted' OR (remote_id IS NOT NULL AND post_http_status IS NOT NULL AND post_http_status = 201));