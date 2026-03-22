
ALTER TABLE public.workouts_library DROP CONSTRAINT IF EXISTS workouts_library_intensity_tag_check;
ALTER TABLE public.workouts_library DROP CONSTRAINT IF EXISTS workouts_library_phase_tag_check;
ALTER TABLE public.workouts_library DROP CONSTRAINT IF EXISTS workouts_library_sport_check;
ALTER TABLE public.workouts_library DROP CONSTRAINT IF EXISTS workouts_library_type_check;
