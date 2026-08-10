ALTER TABLE public.workouts_library
  ADD COLUMN IF NOT EXISTS duration_min_low integer,
  ADD COLUMN IF NOT EXISTS duration_min_high integer,
  ADD COLUMN IF NOT EXISTS duration_by_phase jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.workouts_library.duration_min IS 'Durée canonique de référence (phase build), en minutes';
COMMENT ON COLUMN public.workouts_library.duration_min_low IS 'Borne basse de la fourchette de durée (minutes)';
COMMENT ON COLUMN public.workouts_library.duration_min_high IS 'Borne haute de la fourchette de durée (minutes)';
COMMENT ON COLUMN public.workouts_library.duration_by_phase IS 'Durée canonique par phase: {"base":n,"build":n,"peak":n,"taper":n} (minutes)';