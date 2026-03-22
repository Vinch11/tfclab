
-- Drop foreign key from training_plan first
ALTER TABLE public.training_plan DROP CONSTRAINT IF EXISTS training_plan_workout_id_fkey;

-- Change workouts_library.id from UUID to TEXT
ALTER TABLE public.workouts_library ALTER COLUMN id SET DATA TYPE text;
ALTER TABLE public.workouts_library ALTER COLUMN id SET DEFAULT NULL;

-- Change training_plan.workout_id from UUID to TEXT
ALTER TABLE public.training_plan ALTER COLUMN workout_id SET DATA TYPE text;

-- Re-add foreign key
ALTER TABLE public.training_plan ADD CONSTRAINT training_plan_workout_id_fkey 
  FOREIGN KEY (workout_id) REFERENCES public.workouts_library(id);

-- Add INSERT and DELETE policies for service role (edge functions)
CREATE POLICY "workouts_library_insert_service" ON public.workouts_library
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "workouts_library_delete_service" ON public.workouts_library
  FOR DELETE TO service_role USING (true);

CREATE POLICY "workouts_library_update_service" ON public.workouts_library
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
