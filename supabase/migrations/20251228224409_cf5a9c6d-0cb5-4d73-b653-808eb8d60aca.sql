-- Table checkins pour suivi hebdomadaire Dan Lorang
CREATE TABLE public.checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  date_iso DATE NOT NULL DEFAULT CURRENT_DATE,
  week_tag TEXT,
  
  -- Métriques wellness (1-10)
  sleep INTEGER CHECK (sleep >= 1 AND sleep <= 10),
  fatigue INTEGER CHECK (fatigue >= 1 AND fatigue <= 10),
  soreness INTEGER CHECK (soreness >= 1 AND soreness <= 10),
  stress INTEGER CHECK (stress >= 1 AND stress <= 10),
  motivation INTEGER CHECK (motivation >= 1 AND motivation <= 10),
  
  -- RPE séances clés
  rpe_key1 INTEGER CHECK (rpe_key1 >= 1 AND rpe_key1 <= 10),
  rpe_key2 INTEGER CHECK (rpe_key2 >= 1 AND rpe_key2 <= 10),
  
  -- Alertes
  pain_flag BOOLEAN DEFAULT false,
  
  -- Score calculé (0-100)
  readiness INTEGER,
  
  -- Notes
  notes TEXT,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "checkins_select_own"
ON public.checkins
FOR SELECT
USING (coach_id = auth.uid());

CREATE POLICY "checkins_insert_own"
ON public.checkins
FOR INSERT
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "checkins_update_own"
ON public.checkins
FOR UPDATE
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "checkins_delete_own"
ON public.checkins
FOR DELETE
USING (coach_id = auth.uid());

-- Index
CREATE INDEX idx_checkins_athlete ON public.checkins(athlete_id);
CREATE INDEX idx_checkins_date ON public.checkins(date_iso DESC);

-- Trigger updated_at
CREATE TRIGGER update_checkins_updated_at
BEFORE UPDATE ON public.checkins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();