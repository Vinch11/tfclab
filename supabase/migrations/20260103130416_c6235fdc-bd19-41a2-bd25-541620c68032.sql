-- =============================================
-- SNAPSHOT PRO - Ajout colonnes staff-grade
-- =============================================

-- Champs généraux
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS sport_main text DEFAULT 'bike';
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS objectif text DEFAULT '703';

-- Références supplémentaires
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS pace_threshold_sec_per_km integer;

-- VLamax PRO (source, protocole, référence)
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS vlamax_source text;
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS vlamax_protocol text;
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS vlamax_is_reference boolean DEFAULT false;

-- Charge & fatigue
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS fatigue_state text DEFAULT 'ok';

-- Économie vélo
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS bike_cadence_rpm integer;
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS bike_hr_drift_flag boolean;

-- Nutrition
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS carb_tolerance_band text;
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS gi_issues_flag boolean DEFAULT false;

-- Commentaire pour documentation
COMMENT ON COLUMN public.snapshots.sport_main IS 'Sport principal: bike, run, tri';
COMMENT ON COLUMN public.snapshots.objectif IS 'Objectif: Sprint, Olympic, 703, IM, Marathon, Other';
COMMENT ON COLUMN public.snapshots.vlamax_source IS 'Source VLamax: lab, field, estimated';
COMMENT ON COLUMN public.snapshots.vlamax_protocol IS 'Protocole VLamax: Sprint 15s, 400m all-out, Labo lactate, etc.';
COMMENT ON COLUMN public.snapshots.vlamax_is_reference IS 'Si true, VLamax verrouillée (priorité absolue)';
COMMENT ON COLUMN public.snapshots.fatigue_state IS 'État fatigue: ok, uncertain, high';
COMMENT ON COLUMN public.snapshots.carb_tolerance_band IS 'Bande tolérance glucides: <60, 60-80, 80-100, >100';
COMMENT ON COLUMN public.snapshots.gi_issues_flag IS 'Antécédents problèmes GI';