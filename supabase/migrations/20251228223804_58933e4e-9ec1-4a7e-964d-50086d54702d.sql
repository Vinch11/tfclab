-- Créer la fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table snapshots pour analyse Dan Lorang
CREATE TABLE public.snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'manual',
  cycle_tag TEXT,
  confidence NUMERIC(3,2),
  
  -- Références physiologiques
  fc_max INTEGER,
  vma NUMERIC(4,2),
  ftp INTEGER,
  css NUMERIC(4,2),
  vo2max NUMERIC(4,1),
  vlamax NUMERIC(4,3),
  weight_kg NUMERIC(5,2),
  fat_pct NUMERIC(4,1),
  pmax_5s INTEGER,
  
  -- Indicateurs calculés (stockés pour historique)
  metabolic_profile TEXT,
  metabolic_score INTEGER,
  
  -- Notes coach
  coach_notes TEXT,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies (coach can only see/manage their own snapshots)
CREATE POLICY "snapshots_select_own"
ON public.snapshots
FOR SELECT
USING (coach_id = auth.uid());

CREATE POLICY "snapshots_insert_own"
ON public.snapshots
FOR INSERT
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "snapshots_update_own"
ON public.snapshots
FOR UPDATE
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "snapshots_delete_own"
ON public.snapshots
FOR DELETE
USING (coach_id = auth.uid());

-- Index pour requêtes fréquentes
CREATE INDEX idx_snapshots_athlete ON public.snapshots(athlete_id);
CREATE INDEX idx_snapshots_date ON public.snapshots(date DESC);

-- Trigger pour updated_at
CREATE TRIGGER update_snapshots_updated_at
BEFORE UPDATE ON public.snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();