ALTER TABLE public.snapshots
ADD COLUMN IF NOT EXISTS tte_observed_min_run integer;

COMMENT ON COLUMN public.snapshots.tte_observed_min IS 'TTE vélo observé (minutes) — issu de la semaine test TFCL';
COMMENT ON COLUMN public.snapshots.tte_observed_min_run IS 'TTE course à pied observé (minutes) — issu de la semaine test CAP ou saisie manuelle CAPTestSheet';