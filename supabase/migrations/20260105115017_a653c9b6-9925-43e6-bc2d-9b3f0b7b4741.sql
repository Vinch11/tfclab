
-- Table: workouts_library (bibliothèque de séances)
CREATE TABLE public.workouts_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sport TEXT NOT NULL CHECK (sport IN ('bike', 'run', 'swim', 'general')),
  type TEXT NOT NULL CHECK (type IN ('VO2', 'FORCE', 'SPECIFIC', 'RECOVERY', 'ENDURANCE', 'SPEED', 'TEMPO')),
  title TEXT NOT NULL,
  description TEXT,
  duration_min INTEGER NOT NULL DEFAULT 60,
  phase_tag TEXT NOT NULL CHECK (phase_tag IN ('PHASE1', 'PHASE2', 'PHASE3', 'PHASE4', 'BASE')),
  intensity_tag TEXT CHECK (intensity_tag IN ('Z1', 'Z2', 'TEMPO', 'THRESHOLD', 'VO2', 'SPEED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: athlete_race_goals (objectifs de course par athlète)
CREATE TABLE public.athlete_race_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  race_date DATE NOT NULL,
  race_type TEXT NOT NULL CHECK (race_type IN ('ironman', '70.3', 'marathon', 'semi', 'olympic', '10k', 'autre')),
  race_name TEXT,
  plan_start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(athlete_id, race_date)
);

-- Table: training_plan (plan d'entraînement jour par jour)
CREATE TABLE public.training_plan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  date DATE NOT NULL,
  workout_id UUID REFERENCES public.workouts_library(id) ON DELETE SET NULL,
  custom_workout_title TEXT,
  custom_workout_description TEXT,
  phase TEXT CHECK (phase IN ('PHASE1', 'PHASE2', 'PHASE3', 'PHASE4', 'BASE', 'RACE', 'OFF')),
  status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'DONE', 'SKIPPED')),
  adjusted BOOLEAN NOT NULL DEFAULT false,
  adjusted_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(athlete_id, date)
);

-- Table: daily_checkins (check-in quotidien Life-First)
CREATE TABLE public.daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  stress_score INTEGER NOT NULL CHECK (stress_score >= 1 AND stress_score <= 10),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(athlete_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.workouts_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_race_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workouts_library (read-only for all authenticated users)
CREATE POLICY "workouts_library_select_all" ON public.workouts_library FOR SELECT USING (true);

-- RLS Policies for athlete_race_goals
CREATE POLICY "athlete_race_goals_select_own" ON public.athlete_race_goals FOR SELECT USING (coach_id = auth.uid());
CREATE POLICY "athlete_race_goals_insert_own" ON public.athlete_race_goals FOR INSERT WITH CHECK (coach_id = auth.uid());
CREATE POLICY "athlete_race_goals_update_own" ON public.athlete_race_goals FOR UPDATE USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "athlete_race_goals_delete_own" ON public.athlete_race_goals FOR DELETE USING (coach_id = auth.uid());

-- RLS Policies for training_plan
CREATE POLICY "training_plan_select_own" ON public.training_plan FOR SELECT USING (coach_id = auth.uid());
CREATE POLICY "training_plan_insert_own" ON public.training_plan FOR INSERT WITH CHECK (coach_id = auth.uid());
CREATE POLICY "training_plan_update_own" ON public.training_plan FOR UPDATE USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "training_plan_delete_own" ON public.training_plan FOR DELETE USING (coach_id = auth.uid());

-- RLS Policies for daily_checkins
CREATE POLICY "daily_checkins_select_own" ON public.daily_checkins FOR SELECT USING (coach_id = auth.uid());
CREATE POLICY "daily_checkins_insert_own" ON public.daily_checkins FOR INSERT WITH CHECK (coach_id = auth.uid());
CREATE POLICY "daily_checkins_update_own" ON public.daily_checkins FOR UPDATE USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "daily_checkins_delete_own" ON public.daily_checkins FOR DELETE USING (coach_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_athlete_race_goals_updated_at
  BEFORE UPDATE ON public.athlete_race_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_plan_updated_at
  BEFORE UPDATE ON public.training_plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
