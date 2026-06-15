
CREATE TABLE public.nolio_structures_generated (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id text NOT NULL UNIQUE,
  sport_id integer NOT NULL,
  structured_workout jsonb NOT NULL,
  source_text_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  model text,
  tokens_in integer DEFAULT 0,
  tokens_out integer DEFAULT 0,
  cost_usd numeric(10,6) DEFAULT 0,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nolio_structures_generated TO authenticated;
GRANT ALL ON public.nolio_structures_generated TO service_role;

ALTER TABLE public.nolio_structures_generated ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read nolio structures"
  ON public.nolio_structures_generated FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert nolio structures"
  ON public.nolio_structures_generated FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update nolio structures"
  ON public.nolio_structures_generated FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete nolio structures"
  ON public.nolio_structures_generated FOR DELETE
  TO authenticated USING (true);

CREATE INDEX idx_nolio_structures_status ON public.nolio_structures_generated(status);

CREATE TRIGGER update_nolio_structures_generated_updated_at
  BEFORE UPDATE ON public.nolio_structures_generated
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
