-- =============================================
-- TABLES MULTI-COACH VINCE'S LAB
-- =============================================

-- Table athletes
CREATE TABLE public.athletes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  name TEXT NOT NULL,
  goal TEXT,
  refs JSONB DEFAULT '{}'::jsonb,
  vo2max NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table tests
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  sport TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reliability NUMERIC,
  vlamax NUMERIC,
  raw JSONB DEFAULT '{}'::jsonb,
  note TEXT
);

-- Table plans (PK = athlete_id, un plan par athlète)
CREATE TABLE public.plans (
  athlete_id UUID NOT NULL PRIMARY KEY REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  plan_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - Chaque coach ne voit que ses données
-- =============================================

-- Athletes
CREATE POLICY "Coaches can view their own athletes"
  ON public.athletes FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert their own athletes"
  ON public.athletes FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own athletes"
  ON public.athletes FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own athletes"
  ON public.athletes FOR DELETE
  USING (auth.uid() = coach_id);

-- Tests
CREATE POLICY "Coaches can view their own tests"
  ON public.tests FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert their own tests"
  ON public.tests FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own tests"
  ON public.tests FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own tests"
  ON public.tests FOR DELETE
  USING (auth.uid() = coach_id);

-- Plans
CREATE POLICY "Coaches can view their own plans"
  ON public.plans FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert their own plans"
  ON public.plans FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own plans"
  ON public.plans FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own plans"
  ON public.plans FOR DELETE
  USING (auth.uid() = coach_id);

-- =============================================
-- INDEX POUR PERFORMANCE
-- =============================================
CREATE INDEX idx_athletes_coach_id ON public.athletes(coach_id);
CREATE INDEX idx_tests_coach_id ON public.tests(coach_id);
CREATE INDEX idx_tests_athlete_id ON public.tests(athlete_id);
CREATE INDEX idx_plans_coach_id ON public.plans(coach_id);