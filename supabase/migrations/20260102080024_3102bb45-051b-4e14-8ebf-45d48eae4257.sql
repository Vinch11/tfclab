-- Ajouter les champs Économie de course (CAP) à la table snapshots
ALTER TABLE public.snapshots
ADD COLUMN IF NOT EXISTS run_pace_ref_sec_per_km integer,
ADD COLUMN IF NOT EXISTS run_hr_ref_bpm integer,
ADD COLUMN IF NOT EXISTS run_duration_min integer,
ADD COLUMN IF NOT EXISTS run_hr_drift_pct numeric,
ADD COLUMN IF NOT EXISTS run_economy_score integer,
ADD COLUMN IF NOT EXISTS run_economy_label text;

-- Commentaires pour documentation
COMMENT ON COLUMN public.snapshots.run_pace_ref_sec_per_km IS 'Allure de référence en secondes/km (ex: 270 = 4:30/km)';
COMMENT ON COLUMN public.snapshots.run_hr_ref_bpm IS 'FC moyenne à l''allure de référence';
COMMENT ON COLUMN public.snapshots.run_duration_min IS 'Durée de la séance de référence (min)';
COMMENT ON COLUMN public.snapshots.run_hr_drift_pct IS 'Dérive cardiaque en % (optionnel)';
COMMENT ON COLUMN public.snapshots.run_economy_score IS 'Score économie de course 0-100 (calculé)';
COMMENT ON COLUMN public.snapshots.run_economy_label IS 'Label économie: excellent, good, fragile, unknown';