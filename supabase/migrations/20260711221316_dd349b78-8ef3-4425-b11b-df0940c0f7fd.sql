CREATE TABLE public.pacing_envelope_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
  race_date DATE NOT NULL,
  race_objective TEXT NOT NULL CHECK (race_objective IN ('IM','70.3','Marathon','Semi','10km')),
  sport TEXT NOT NULL CHECK (sport IN ('bike','run')),
  ambition TEXT CHECK (ambition IN ('WORLD_CLASS','ELITE','COMPETITOR','AGE_GROUP','FINISHER')),

  predicted_center_pct NUMERIC(5,2) NOT NULL,
  predicted_low_pct NUMERIC(5,2) NOT NULL,
  predicted_high_pct NUMERIC(5,2) NOT NULL,
  predicted_duration_min INTEGER,
  predicted_confidence NUMERIC(3,2) CHECK (predicted_confidence BETWEEN 0 AND 1),

  observed_avg_intensity_pct NUMERIC(5,2),
  observed_max_intensity_pct NUMERIC(5,2),
  observed_duration_min INTEGER,

  reference_base TEXT CHECK (reference_base IN ('ftp','vma','threshold_pace','race_intensity','fatmax')),
  reference_value NUMERIC(6,2),

  envelope_snapshot JSONB,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pacing_evidence_user ON public.pacing_envelope_evidence(user_id);
CREATE INDEX idx_pacing_evidence_athlete ON public.pacing_envelope_evidence(athlete_id);
CREATE INDEX idx_pacing_evidence_race ON public.pacing_envelope_evidence(race_objective, sport, race_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacing_envelope_evidence TO authenticated;
GRANT ALL ON public.pacing_envelope_evidence TO service_role;

ALTER TABLE public.pacing_envelope_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pacing evidence"
  ON public.pacing_envelope_evidence FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pacing evidence"
  ON public.pacing_envelope_evidence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pacing evidence"
  ON public.pacing_envelope_evidence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pacing evidence"
  ON public.pacing_envelope_evidence FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_pacing_evidence_updated_at
  BEFORE UPDATE ON public.pacing_envelope_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();