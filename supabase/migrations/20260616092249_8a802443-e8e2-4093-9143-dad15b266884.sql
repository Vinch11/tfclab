ALTER TABLE public.nolio_sync_log
  ADD COLUMN IF NOT EXISTS workout_id text,
  ADD COLUMN IF NOT EXISTS payload jsonb;

CREATE INDEX IF NOT EXISTS idx_nolio_sync_log_workout_id
  ON public.nolio_sync_log (workout_id, synced_at DESC);