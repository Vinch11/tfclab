CREATE TABLE public.daily_training_load (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  date DATE NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('swim','bike','run','other','global')),
  tss NUMERIC NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'nolio',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_training_load_unique UNIQUE (athlete_id, sport, date)
);

CREATE INDEX daily_training_load_athlete_sport_date_idx
  ON public.daily_training_load(athlete_id, sport, date);
CREATE INDEX daily_training_load_coach_idx
  ON public.daily_training_load(coach_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_training_load TO authenticated;
GRANT ALL ON public.daily_training_load TO service_role;

ALTER TABLE public.daily_training_load ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches read own training load"
  ON public.daily_training_load FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches insert own training load"
  ON public.daily_training_load FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches update own training load"
  ON public.daily_training_load FOR UPDATE
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches delete own training load"
  ON public.daily_training_load FOR DELETE
  USING (coach_id = auth.uid());

CREATE TRIGGER update_daily_training_load_updated_at
  BEFORE UPDATE ON public.daily_training_load
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();