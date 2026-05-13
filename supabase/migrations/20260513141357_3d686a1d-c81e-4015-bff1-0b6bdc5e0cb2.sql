
-- Cohorte de référence extraite de la littérature scientifique publiée
CREATE TABLE public.literature_cohort_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  description TEXT,
  model TEXT NOT NULL,
  total_profiles INTEGER NOT NULL DEFAULT 0,
  total_studies INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.literature_cohort_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.literature_cohort_versions(id) ON DELETE CASCADE,
  -- Source bibliographique
  study_author TEXT NOT NULL,
  study_year INTEGER,
  study_title TEXT,
  study_doi TEXT,
  cohort_label TEXT,
  -- Démographie
  sport TEXT NOT NULL CHECK (sport IN ('bike','run','tri','swim','xc-ski','rowing')),
  sex TEXT CHECK (sex IN ('M','F','mixed')),
  age_mean NUMERIC,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  level TEXT,
  -- Métriques physiologiques (toutes optionnelles)
  vo2max NUMERIC,
  ftp_w NUMERIC,
  ftp_w_kg NUMERIC,
  vlamax NUMERIC,
  mlss_pct NUMERIC,
  vma_kmh NUMERIC,
  pace_threshold_sec_per_km NUMERIC,
  running_economy NUMERIC,
  cp_w NUMERIC,
  w_prime_j NUMERIC,
  pmax_5s NUMERIC,
  -- Méta
  notes TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcp_version ON public.literature_cohort_profiles(version_id);
CREATE INDEX idx_lcp_sport ON public.literature_cohort_profiles(sport);

ALTER TABLE public.literature_cohort_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.literature_cohort_profiles ENABLE ROW LEVEL SECURITY;

-- Lecture libre pour utilisateurs authentifiés (cohorte = référence partagée)
CREATE POLICY "auth read versions" ON public.literature_cohort_versions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read profiles" ON public.literature_cohort_profiles
  FOR SELECT TO authenticated USING (true);

-- Écriture: créateur = créateur (les inserts passent par edge function en service_role)
CREATE POLICY "owner insert versions" ON public.literature_cohort_versions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "owner delete versions" ON public.literature_cohort_versions
  FOR DELETE TO authenticated USING (auth.uid() = created_by);
