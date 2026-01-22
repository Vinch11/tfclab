-- =====================================================
-- DECISION RELIABILITY ENGINE™ - DATABASE SCHEMA
-- Stockage des scores de fiabilité et qualité des données
-- =====================================================

-- Table principale pour les scores de fiabilité par snapshot
CREATE TABLE public.reliability_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.snapshots(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Module 1: Semaine de Référence TFCL
  is_reference_week BOOLEAN NOT NULL DEFAULT false,
  reference_date DATE,
  reference_week_confidence_boost NUMERIC DEFAULT 0,
  
  -- Module 2: Protocol Quality Score (0.5 - 1.0)
  protocol_quality_score NUMERIC DEFAULT 0.75,
  sleep_quality TEXT CHECK (sleep_quality IN ('bon', 'moyen', 'mauvais')),
  nutrition_pre_test TEXT CHECK (nutrition_pre_test IN ('optimale', 'insuffisante', 'a_jeun')),
  perceived_fatigue INTEGER CHECK (perceived_fatigue >= 1 AND perceived_fatigue <= 10),
  sensors_calibrated BOOLEAN DEFAULT true,
  environmental_conditions TEXT CHECK (environmental_conditions IN ('ok', 'non_standard')),
  
  -- Module 3: Multi-indices VLamax
  vlamax_indices JSONB DEFAULT '{}',
  -- Structure: { p30s_ftp: 0.45, p1min_ftp: 0.52, ftp_map: 0.48, tte_modulated: 0.46 }
  vlamax_dispersion NUMERIC, -- écart-type des indices
  vlamax_range_low NUMERIC, -- P25
  vlamax_range_high NUMERIC, -- P75
  vlamax_median NUMERIC,
  vlamax_multi_confidence NUMERIC DEFAULT 0.7,
  
  -- Module 4: Durability Validation
  durability_z2_duration_min INTEGER,
  durability_hr_drift_pct NUMERIC,
  durability_cadence_stability NUMERIC,
  durability_rpe_final INTEGER,
  durability_consistency_score NUMERIC DEFAULT 0.5, -- 0-1
  
  -- Module 5: Physio Consistency Check
  consistency_flags JSONB DEFAULT '[]',
  -- Structure: [{ flag: "high_vlamax_high_tte", severity: "warning", hypothesis: "..." }]
  consistency_score NUMERIC DEFAULT 1.0, -- 0-1, réduit si incohérences
  incoherence_detected BOOLEAN DEFAULT false,
  
  -- Module 6: Decision Confidence Score global (0-100)
  decision_confidence_score INTEGER DEFAULT 50,
  decision_level TEXT CHECK (decision_level IN ('robust', 'prudent', 'insufficient')),
  -- robust = >75, prudent = 60-75, insufficient = <60
  
  -- Module 9: Economy & Mechanical Cost
  cadence_hr_efficiency NUMERIC,
  pace_hr_drift_ratio NUMERIC,
  power_hr_stability NUMERIC,
  economy_score NUMERIC DEFAULT 0.5, -- 0-1
  
  -- Module 10: Coach Feedback Loop
  coach_validation_status TEXT CHECK (coach_validation_status IN ('pending', 'validated', 'adjusted', 'rejected')),
  coach_validation_date TIMESTAMP WITH TIME ZONE,
  coach_validation_notes TEXT,
  coach_model_coherence_rating INTEGER CHECK (coach_model_coherence_rating >= 1 AND coach_model_coherence_rating <= 5),
  coach_response_accuracy_rating INTEGER CHECK (coach_response_accuracy_rating >= 1 AND coach_response_accuracy_rating <= 5),
  coach_fatigue_observed TEXT,
  
  -- Métadonnées
  calculation_version TEXT DEFAULT 'v1.0',
  raw_calculation_data JSONB DEFAULT '{}'
);

-- Index pour recherche rapide
CREATE INDEX idx_reliability_scores_snapshot ON public.reliability_scores(snapshot_id);
CREATE INDEX idx_reliability_scores_athlete ON public.reliability_scores(athlete_id);
CREATE INDEX idx_reliability_scores_reference ON public.reliability_scores(is_reference_week) WHERE is_reference_week = true;
CREATE INDEX idx_reliability_scores_decision ON public.reliability_scores(decision_confidence_score);

-- Enable RLS
ALTER TABLE public.reliability_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Coach can only see their own data
CREATE POLICY "reliability_scores_select_own" 
ON public.reliability_scores 
FOR SELECT 
USING (coach_id = auth.uid());

CREATE POLICY "reliability_scores_insert_own" 
ON public.reliability_scores 
FOR INSERT 
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "reliability_scores_update_own" 
ON public.reliability_scores 
FOR UPDATE 
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "reliability_scores_delete_own" 
ON public.reliability_scores 
FOR DELETE 
USING (coach_id = auth.uid());

-- Trigger pour updated_at
CREATE TRIGGER update_reliability_scores_updated_at
BEFORE UPDATE ON public.reliability_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TABLE POUR LE COACH FEEDBACK LOOP (historique des blocs)
-- =====================================================
CREATE TABLE public.coach_feedback_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  block_start_date DATE NOT NULL,
  block_end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Feedback du coach
  model_coherence_rating INTEGER CHECK (model_coherence_rating >= 1 AND model_coherence_rating <= 5),
  actual_response_rating INTEGER CHECK (actual_response_rating >= 1 AND actual_response_rating <= 5),
  observed_fatigue TEXT,
  notes TEXT,
  
  -- Ajustements suggérés
  suggested_adjustments JSONB DEFAULT '{}',
  adjustment_applied BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.coach_feedback_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_feedback_blocks_select_own" 
ON public.coach_feedback_blocks 
FOR SELECT 
USING (coach_id = auth.uid());

CREATE POLICY "coach_feedback_blocks_insert_own" 
ON public.coach_feedback_blocks 
FOR INSERT 
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "coach_feedback_blocks_update_own" 
ON public.coach_feedback_blocks 
FOR UPDATE 
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "coach_feedback_blocks_delete_own" 
ON public.coach_feedback_blocks 
FOR DELETE 
USING (coach_id = auth.uid());