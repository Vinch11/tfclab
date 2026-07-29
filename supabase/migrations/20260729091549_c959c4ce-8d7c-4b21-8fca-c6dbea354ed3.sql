ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coach_level text NOT NULL DEFAULT 'simple';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_coach_level_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_coach_level_check CHECK (coach_level IN ('simple','advanced'));

-- Existing accounts keep the full interface
UPDATE public.profiles SET coach_level = 'advanced' WHERE created_at < now();