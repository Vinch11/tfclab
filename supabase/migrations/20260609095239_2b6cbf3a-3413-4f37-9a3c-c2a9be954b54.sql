-- Add race_format column to athlete_race_goals
-- Distinguishes continuous format (default 70.3, IM, marathon, etc.)
-- from multi-stage formats like Long Course Weekend (LCW Wales / Belgium)
-- where the race is split across 3 days (Fri swim / Sat bike / Sun run).
ALTER TABLE public.athlete_race_goals
  ADD COLUMN IF NOT EXISTS race_format text;

-- Document allowed values via CHECK (nullable = continuous default)
ALTER TABLE public.athlete_race_goals
  DROP CONSTRAINT IF EXISTS athlete_race_goals_race_format_check;
ALTER TABLE public.athlete_race_goals
  ADD CONSTRAINT athlete_race_goals_race_format_check
  CHECK (race_format IS NULL OR race_format IN ('continuous', 'lcw_3day'));

COMMENT ON COLUMN public.athlete_race_goals.race_format IS
  'Race format: NULL/continuous = standard single-day race, lcw_3day = Long Course Weekend (Fri swim / Sat bike / Sun run, stage race)';