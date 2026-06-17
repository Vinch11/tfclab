
CREATE TABLE public.nolio_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  nolio_athlete_id INTEGER,
  cat TEXT NOT NULL,
  record_type TEXT NOT NULL,
  item_seconds INTEGER NOT NULL,
  value NUMERIC NOT NULL,
  date_recorded DATE,
  sport_id INTEGER NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nolio_records_unique UNIQUE (athlete_id, cat, record_type, item_seconds, sport_id)
);

CREATE INDEX nolio_records_athlete_idx ON public.nolio_records(athlete_id);
CREATE INDEX nolio_records_sport_cat_idx ON public.nolio_records(sport_id, cat);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nolio_records TO authenticated;
GRANT ALL ON public.nolio_records TO service_role;

ALTER TABLE public.nolio_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their athletes' nolio records"
  ON public.nolio_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = nolio_records.athlete_id AND a.coach_id = auth.uid()));

CREATE POLICY "Coaches can insert their athletes' nolio records"
  ON public.nolio_records FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = nolio_records.athlete_id AND a.coach_id = auth.uid()));

CREATE POLICY "Coaches can update their athletes' nolio records"
  ON public.nolio_records FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = nolio_records.athlete_id AND a.coach_id = auth.uid()));

CREATE POLICY "Coaches can delete their athletes' nolio records"
  ON public.nolio_records FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = nolio_records.athlete_id AND a.coach_id = auth.uid()));

CREATE TRIGGER update_nolio_records_updated_at
  BEFORE UPDATE ON public.nolio_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
