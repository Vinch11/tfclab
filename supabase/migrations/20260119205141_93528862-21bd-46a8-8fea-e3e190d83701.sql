-- Ajouter les champs pour l'estimation VLamax CAP
-- pace_threshold_sec_per_km: Pace seuil course (sec/km)
-- sprint_15s_distance: Distance sprint 15s (mètres)
-- running_power_max: Puissance max course Stryd/Garmin (W)
-- running_power_threshold: Puissance seuil course (W)

ALTER TABLE public.snapshots 
ADD COLUMN IF NOT EXISTS pace_threshold_sec_per_km numeric,
ADD COLUMN IF NOT EXISTS sprint_15s_distance numeric,
ADD COLUMN IF NOT EXISTS running_power_max numeric,
ADD COLUMN IF NOT EXISTS running_power_threshold numeric;

COMMENT ON COLUMN public.snapshots.pace_threshold_sec_per_km IS 'Pace seuil course à pied en secondes par km';
COMMENT ON COLUMN public.snapshots.sprint_15s_distance IS 'Distance parcourue en 15 secondes de sprint (mètres)';
COMMENT ON COLUMN public.snapshots.running_power_max IS 'Puissance maximale course (Stryd/Garmin) en Watts';
COMMENT ON COLUMN public.snapshots.running_power_threshold IS 'Puissance seuil course (Stryd/Garmin) en Watts';