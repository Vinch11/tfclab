
CREATE TABLE public.nolio_workout_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  sport_id integer NOT NULL,
  structured_workout jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nolio_workout_overrides TO authenticated;
GRANT ALL ON public.nolio_workout_overrides TO service_role;

ALTER TABLE public.nolio_workout_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read overrides"
  ON public.nolio_workout_overrides FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert overrides"
  ON public.nolio_workout_overrides FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update overrides"
  ON public.nolio_workout_overrides FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete overrides"
  ON public.nolio_workout_overrides FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_nolio_workout_overrides_updated_at
  BEFORE UPDATE ON public.nolio_workout_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
