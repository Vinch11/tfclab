CREATE TABLE public.nolio_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  synced_at timestamptz NOT NULL DEFAULT now(),
  athletes_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.nolio_sync_log TO authenticated;
GRANT ALL ON public.nolio_sync_log TO service_role;

ALTER TABLE public.nolio_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync logs"
  ON public.nolio_sync_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync logs"
  ON public.nolio_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_nolio_sync_log_user_synced
  ON public.nolio_sync_log (user_id, synced_at DESC);