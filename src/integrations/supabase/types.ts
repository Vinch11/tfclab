export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      athlete_race_goals: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string
          id: string
          plan_start_date: string | null
          race_date: string
          race_format: string | null
          race_name: string | null
          race_type: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          coach_id: string
          created_at?: string
          id?: string
          plan_start_date?: string | null
          race_date: string
          race_format?: string | null
          race_name?: string | null
          race_type: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          plan_start_date?: string | null
          race_date?: string
          race_format?: string | null
          race_name?: string | null
          race_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      athletes: {
        Row: {
          active_snapshot_id: string | null
          birth_date: string | null
          coach_id: string
          created_at: string
          goal: string | null
          id: string
          is_hidden: boolean
          name: string
          refs: Json | null
          sex: string | null
          vo2max: number | null
        }
        Insert: {
          active_snapshot_id?: string | null
          birth_date?: string | null
          coach_id: string
          created_at?: string
          goal?: string | null
          id?: string
          is_hidden?: boolean
          name: string
          refs?: Json | null
          sex?: string | null
          vo2max?: number | null
        }
        Update: {
          active_snapshot_id?: string | null
          birth_date?: string | null
          coach_id?: string
          created_at?: string
          goal?: string | null
          id?: string
          is_hidden?: boolean
          name?: string
          refs?: Json | null
          sex?: string | null
          vo2max?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_active_snapshot_id_fkey"
            columns: ["active_snapshot_id"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_evidence: {
        Row: {
          athlete_id: string
          calibration_weight: number | null
          coach_id: string
          confidence_evidence: number
          created_at: string
          date: string
          evidence_type: string
          fatigue_index: number | null
          id: string
          notes: string | null
          protocol_quality: number
          raw_values: Json
          source_type: string
          updated_at: string
          used_in_calibration: boolean
          validity: string
        }
        Insert: {
          athlete_id: string
          calibration_weight?: number | null
          coach_id: string
          confidence_evidence?: number
          created_at?: string
          date?: string
          evidence_type: string
          fatigue_index?: number | null
          id?: string
          notes?: string | null
          protocol_quality?: number
          raw_values?: Json
          source_type: string
          updated_at?: string
          used_in_calibration?: boolean
          validity?: string
        }
        Update: {
          athlete_id?: string
          calibration_weight?: number | null
          coach_id?: string
          confidence_evidence?: number
          created_at?: string
          date?: string
          evidence_type?: string
          fatigue_index?: number | null
          id?: string
          notes?: string | null
          protocol_quality?: number
          raw_values?: Json
          source_type?: string
          updated_at?: string
          used_in_calibration?: boolean
          validity?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_evidence_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_snapshots: {
        Row: {
          athlete_id: string
          calibration_window_end: string | null
          calibration_window_start: string | null
          coach_id: string
          confidence: number
          created_at: string
          date: string
          evidence_ids: string[] | null
          id: string
          is_locked: boolean
          lock_until: string | null
          notes: string | null
          recalibration_reason: string | null
          recalibration_recommended: boolean
          vlamax_calibrated: number | null
          vlamax_modelled: number | null
          vlamax_range_p25: number | null
          vlamax_range_p75: number | null
        }
        Insert: {
          athlete_id: string
          calibration_window_end?: string | null
          calibration_window_start?: string | null
          coach_id: string
          confidence?: number
          created_at?: string
          date?: string
          evidence_ids?: string[] | null
          id?: string
          is_locked?: boolean
          lock_until?: string | null
          notes?: string | null
          recalibration_reason?: string | null
          recalibration_recommended?: boolean
          vlamax_calibrated?: number | null
          vlamax_modelled?: number | null
          vlamax_range_p25?: number | null
          vlamax_range_p75?: number | null
        }
        Update: {
          athlete_id?: string
          calibration_window_end?: string | null
          calibration_window_start?: string | null
          coach_id?: string
          confidence?: number
          created_at?: string
          date?: string
          evidence_ids?: string[] | null
          id?: string
          is_locked?: boolean
          lock_until?: string | null
          notes?: string | null
          recalibration_reason?: string | null
          recalibration_recommended?: boolean
          vlamax_calibrated?: number | null
          vlamax_modelled?: number | null
          vlamax_range_p25?: number | null
          vlamax_range_p75?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calibration_snapshots_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string
          date_iso: string
          fatigue: number | null
          id: string
          motivation: number | null
          notes: string | null
          pain_flag: boolean | null
          readiness: number | null
          rpe_key1: number | null
          rpe_key2: number | null
          sleep: number | null
          soreness: number | null
          stress: number | null
          updated_at: string
          week_tag: string | null
        }
        Insert: {
          athlete_id: string
          coach_id: string
          created_at?: string
          date_iso?: string
          fatigue?: number | null
          id?: string
          motivation?: number | null
          notes?: string | null
          pain_flag?: boolean | null
          readiness?: number | null
          rpe_key1?: number | null
          rpe_key2?: number | null
          sleep?: number | null
          soreness?: number | null
          stress?: number | null
          updated_at?: string
          week_tag?: string | null
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string
          date_iso?: string
          fatigue?: number | null
          id?: string
          motivation?: number | null
          notes?: string | null
          pain_flag?: boolean | null
          readiness?: number | null
          rpe_key1?: number | null
          rpe_key2?: number | null
          sleep?: number | null
          soreness?: number | null
          stress?: number | null
          updated_at?: string
          week_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_feedback_blocks: {
        Row: {
          actual_response_rating: number | null
          adjustment_applied: boolean | null
          athlete_id: string
          block_end_date: string
          block_start_date: string
          coach_id: string
          created_at: string
          id: string
          model_coherence_rating: number | null
          notes: string | null
          observed_fatigue: string | null
          suggested_adjustments: Json | null
        }
        Insert: {
          actual_response_rating?: number | null
          adjustment_applied?: boolean | null
          athlete_id: string
          block_end_date: string
          block_start_date: string
          coach_id: string
          created_at?: string
          id?: string
          model_coherence_rating?: number | null
          notes?: string | null
          observed_fatigue?: string | null
          suggested_adjustments?: Json | null
        }
        Update: {
          actual_response_rating?: number | null
          adjustment_applied?: boolean | null
          athlete_id?: string
          block_end_date?: string
          block_start_date?: string
          coach_id?: string
          created_at?: string
          id?: string
          model_coherence_rating?: number | null
          notes?: string | null
          observed_fatigue?: string | null
          suggested_adjustments?: Json | null
        }
        Relationships: []
      }
      coach_overrides: {
        Row: {
          action: string
          after_value: Json | null
          athlete_id: string
          before_value: Json | null
          coach_id: string
          created_at: string
          date: string
          id: string
          module: string
          reason: string
        }
        Insert: {
          action: string
          after_value?: Json | null
          athlete_id: string
          before_value?: Json | null
          coach_id: string
          created_at?: string
          date?: string
          id?: string
          module: string
          reason: string
        }
        Update: {
          action?: string
          after_value?: Json | null
          athlete_id?: string
          before_value?: Json | null
          coach_id?: string
          created_at?: string
          date?: string
          id?: string
          module?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_overrides_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_templates: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          source: string
          target: string
          updated_at: string
          weeks_count: number
          weeks_json: Json
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          source?: string
          target?: string
          updated_at?: string
          weeks_count?: number
          weeks_json?: Json
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          source?: string
          target?: string
          updated_at?: string
          weeks_count?: number
          weeks_json?: Json
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string
          date: string
          energy_level: number | null
          id: string
          notes: string | null
          sleep_quality: number | null
          stress_score: number
        }
        Insert: {
          athlete_id: string
          coach_id: string
          created_at?: string
          date?: string
          energy_level?: number | null
          id?: string
          notes?: string | null
          sleep_quality?: number | null
          stress_score: number
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string
          date?: string
          energy_level?: number | null
          id?: string
          notes?: string | null
          sleep_quality?: number | null
          stress_score?: number
        }
        Relationships: []
      }
      literature_cohort_profiles: {
        Row: {
          age_mean: number | null
          cohort_label: string | null
          cp_w: number | null
          created_at: string
          ftp_w: number | null
          ftp_w_kg: number | null
          height_cm: number | null
          id: string
          level: string | null
          mlss_pct: number | null
          notes: string | null
          pace_threshold_sec_per_km: number | null
          pmax_5s: number | null
          raw_payload: Json
          running_economy: number | null
          sex: string | null
          sport: string
          study_author: string
          study_doi: string | null
          study_title: string | null
          study_year: number | null
          version_id: string
          vlamax: number | null
          vma_kmh: number | null
          vo2max: number | null
          w_prime_j: number | null
          weight_kg: number | null
        }
        Insert: {
          age_mean?: number | null
          cohort_label?: string | null
          cp_w?: number | null
          created_at?: string
          ftp_w?: number | null
          ftp_w_kg?: number | null
          height_cm?: number | null
          id?: string
          level?: string | null
          mlss_pct?: number | null
          notes?: string | null
          pace_threshold_sec_per_km?: number | null
          pmax_5s?: number | null
          raw_payload?: Json
          running_economy?: number | null
          sex?: string | null
          sport: string
          study_author: string
          study_doi?: string | null
          study_title?: string | null
          study_year?: number | null
          version_id: string
          vlamax?: number | null
          vma_kmh?: number | null
          vo2max?: number | null
          w_prime_j?: number | null
          weight_kg?: number | null
        }
        Update: {
          age_mean?: number | null
          cohort_label?: string | null
          cp_w?: number | null
          created_at?: string
          ftp_w?: number | null
          ftp_w_kg?: number | null
          height_cm?: number | null
          id?: string
          level?: string | null
          mlss_pct?: number | null
          notes?: string | null
          pace_threshold_sec_per_km?: number | null
          pmax_5s?: number | null
          raw_payload?: Json
          running_economy?: number | null
          sex?: string | null
          sport?: string
          study_author?: string
          study_doi?: string | null
          study_title?: string | null
          study_year?: number | null
          version_id?: string
          vlamax?: number | null
          vma_kmh?: number | null
          vo2max?: number | null
          w_prime_j?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "literature_cohort_profiles_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "literature_cohort_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      literature_cohort_versions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          model: string
          total_profiles: number
          total_studies: number
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          model: string
          total_profiles?: number
          total_studies?: number
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          model?: string
          total_profiles?: number
          total_studies?: number
          version?: string
        }
        Relationships: []
      }
      nolio_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_adaptations: {
        Row: {
          adaptation_type: string
          applied: boolean
          athlete_id: string
          coach_id: string
          created_at: string
          diff_json: Json
          from_week: number | null
          id: string
          reason: string | null
          to_week: number | null
          triggered_by: string
          warnings: Json
        }
        Insert: {
          adaptation_type: string
          applied?: boolean
          athlete_id: string
          coach_id: string
          created_at?: string
          diff_json?: Json
          from_week?: number | null
          id?: string
          reason?: string | null
          to_week?: number | null
          triggered_by: string
          warnings?: Json
        }
        Update: {
          adaptation_type?: string
          applied?: boolean
          athlete_id?: string
          coach_id?: string
          created_at?: string
          diff_json?: Json
          from_week?: number | null
          id?: string
          reason?: string | null
          to_week?: number | null
          triggered_by?: string
          warnings?: Json
        }
        Relationships: []
      }
      plan_versions: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string
          id: string
          objective: string | null
          plan_json: Json
          sessions_count: number | null
          validator_grade: string | null
          validator_score: number | null
          validator_summary: Json | null
          weeks_count: number | null
        }
        Insert: {
          athlete_id: string
          coach_id: string
          created_at?: string
          id?: string
          objective?: string | null
          plan_json?: Json
          sessions_count?: number | null
          validator_grade?: string | null
          validator_score?: number | null
          validator_summary?: Json | null
          weeks_count?: number | null
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          objective?: string | null
          plan_json?: Json
          sessions_count?: number | null
          validator_grade?: string | null
          validator_score?: number | null
          validator_summary?: Json | null
          weeks_count?: number | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          athlete_id: string
          coach_id: string
          plan_json: Json | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          coach_id: string
          plan_json?: Json | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          plan_json?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          layout_preferences: Json | null
          onboarding_completed: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          layout_preferences?: Json | null
          onboarding_completed?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          layout_preferences?: Json | null
          onboarding_completed?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reliability_scores: {
        Row: {
          athlete_id: string
          cadence_hr_efficiency: number | null
          calculation_version: string | null
          coach_fatigue_observed: string | null
          coach_id: string
          coach_model_coherence_rating: number | null
          coach_response_accuracy_rating: number | null
          coach_validation_date: string | null
          coach_validation_notes: string | null
          coach_validation_status: string | null
          consistency_flags: Json | null
          consistency_score: number | null
          created_at: string
          decision_confidence_score: number | null
          decision_level: string | null
          durability_cadence_stability: number | null
          durability_consistency_score: number | null
          durability_hr_drift_pct: number | null
          durability_rpe_final: number | null
          durability_z2_duration_min: number | null
          economy_score: number | null
          environmental_conditions: string | null
          id: string
          incoherence_detected: boolean | null
          is_reference_week: boolean
          nutrition_pre_test: string | null
          pace_hr_drift_ratio: number | null
          perceived_fatigue: number | null
          power_hr_stability: number | null
          protocol_quality_score: number | null
          raw_calculation_data: Json | null
          reference_date: string | null
          reference_week_confidence_boost: number | null
          sensors_calibrated: boolean | null
          sleep_quality: string | null
          snapshot_id: string
          updated_at: string
          vlamax_dispersion: number | null
          vlamax_indices: Json | null
          vlamax_median: number | null
          vlamax_multi_confidence: number | null
          vlamax_range_high: number | null
          vlamax_range_low: number | null
        }
        Insert: {
          athlete_id: string
          cadence_hr_efficiency?: number | null
          calculation_version?: string | null
          coach_fatigue_observed?: string | null
          coach_id: string
          coach_model_coherence_rating?: number | null
          coach_response_accuracy_rating?: number | null
          coach_validation_date?: string | null
          coach_validation_notes?: string | null
          coach_validation_status?: string | null
          consistency_flags?: Json | null
          consistency_score?: number | null
          created_at?: string
          decision_confidence_score?: number | null
          decision_level?: string | null
          durability_cadence_stability?: number | null
          durability_consistency_score?: number | null
          durability_hr_drift_pct?: number | null
          durability_rpe_final?: number | null
          durability_z2_duration_min?: number | null
          economy_score?: number | null
          environmental_conditions?: string | null
          id?: string
          incoherence_detected?: boolean | null
          is_reference_week?: boolean
          nutrition_pre_test?: string | null
          pace_hr_drift_ratio?: number | null
          perceived_fatigue?: number | null
          power_hr_stability?: number | null
          protocol_quality_score?: number | null
          raw_calculation_data?: Json | null
          reference_date?: string | null
          reference_week_confidence_boost?: number | null
          sensors_calibrated?: boolean | null
          sleep_quality?: string | null
          snapshot_id: string
          updated_at?: string
          vlamax_dispersion?: number | null
          vlamax_indices?: Json | null
          vlamax_median?: number | null
          vlamax_multi_confidence?: number | null
          vlamax_range_high?: number | null
          vlamax_range_low?: number | null
        }
        Update: {
          athlete_id?: string
          cadence_hr_efficiency?: number | null
          calculation_version?: string | null
          coach_fatigue_observed?: string | null
          coach_id?: string
          coach_model_coherence_rating?: number | null
          coach_response_accuracy_rating?: number | null
          coach_validation_date?: string | null
          coach_validation_notes?: string | null
          coach_validation_status?: string | null
          consistency_flags?: Json | null
          consistency_score?: number | null
          created_at?: string
          decision_confidence_score?: number | null
          decision_level?: string | null
          durability_cadence_stability?: number | null
          durability_consistency_score?: number | null
          durability_hr_drift_pct?: number | null
          durability_rpe_final?: number | null
          durability_z2_duration_min?: number | null
          economy_score?: number | null
          environmental_conditions?: string | null
          id?: string
          incoherence_detected?: boolean | null
          is_reference_week?: boolean
          nutrition_pre_test?: string | null
          pace_hr_drift_ratio?: number | null
          perceived_fatigue?: number | null
          power_hr_stability?: number | null
          protocol_quality_score?: number | null
          raw_calculation_data?: Json | null
          reference_date?: string | null
          reference_week_confidence_boost?: number | null
          sensors_calibrated?: boolean | null
          sleep_quality?: string | null
          snapshot_id?: string
          updated_at?: string
          vlamax_dispersion?: number | null
          vlamax_indices?: Json | null
          vlamax_median?: number | null
          vlamax_multi_confidence?: number | null
          vlamax_range_high?: number | null
          vlamax_range_low?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reliability_scores_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshots: {
        Row: {
          athlete_id: string
          bike_cadence_rpm: number | null
          bike_hr_drift_flag: boolean | null
          carb_tolerance_band: string | null
          coach_id: string
          coach_notes: string | null
          confidence: number | null
          created_at: string
          css: number | null
          cycle_tag: string | null
          date: string
          fat_pct: number | null
          fatigue_state: string | null
          fc_max: number | null
          force_development_mode: boolean | null
          ftp: number | null
          gi_issues_flag: boolean | null
          id: string
          low_crr_justification: string | null
          map5min_w: number | null
          metabolic_profile: string | null
          metabolic_score: number | null
          objectif: string | null
          p30s_w: number | null
          p60s_w: number | null
          pace_threshold_sec_per_km: number | null
          pmax_5s: number | null
          protocol_quality: number | null
          race_times_notes: string | null
          run_duration_min: number | null
          run_economy_label: string | null
          run_economy_score: number | null
          run_hr_drift_pct: number | null
          run_hr_ref_bpm: number | null
          run_pace_ref_sec_per_km: number | null
          running_power_1s: number | null
          running_power_30s: number | null
          running_power_5min: number | null
          running_power_5s: number | null
          running_power_60s: number | null
          running_power_max: number | null
          running_power_threshold: number | null
          source: string
          sport_main: string | null
          sprint_15s_distance: number | null
          time_10k_date: string | null
          time_10k_sec: number | null
          time_20k_date: string | null
          time_20k_sec: number | null
          time_5k_date: string | null
          time_5k_sec: number | null
          time_half_date: string | null
          time_half_sec: number | null
          time_marathon_date: string | null
          time_marathon_sec: number | null
          tss_7d: number | null
          tte_mode: string | null
          tte_observed_min: number | null
          tte_observed_min_run: number | null
          updated_at: string
          vlamax: number | null
          vlamax_is_reference: boolean | null
          vlamax_protocol: string | null
          vlamax_run: number | null
          vlamax_source: string | null
          vma: number | null
          vo2max: number | null
          weight_kg: number | null
        }
        Insert: {
          athlete_id: string
          bike_cadence_rpm?: number | null
          bike_hr_drift_flag?: boolean | null
          carb_tolerance_band?: string | null
          coach_id: string
          coach_notes?: string | null
          confidence?: number | null
          created_at?: string
          css?: number | null
          cycle_tag?: string | null
          date?: string
          fat_pct?: number | null
          fatigue_state?: string | null
          fc_max?: number | null
          force_development_mode?: boolean | null
          ftp?: number | null
          gi_issues_flag?: boolean | null
          id?: string
          low_crr_justification?: string | null
          map5min_w?: number | null
          metabolic_profile?: string | null
          metabolic_score?: number | null
          objectif?: string | null
          p30s_w?: number | null
          p60s_w?: number | null
          pace_threshold_sec_per_km?: number | null
          pmax_5s?: number | null
          protocol_quality?: number | null
          race_times_notes?: string | null
          run_duration_min?: number | null
          run_economy_label?: string | null
          run_economy_score?: number | null
          run_hr_drift_pct?: number | null
          run_hr_ref_bpm?: number | null
          run_pace_ref_sec_per_km?: number | null
          running_power_1s?: number | null
          running_power_30s?: number | null
          running_power_5min?: number | null
          running_power_5s?: number | null
          running_power_60s?: number | null
          running_power_max?: number | null
          running_power_threshold?: number | null
          source?: string
          sport_main?: string | null
          sprint_15s_distance?: number | null
          time_10k_date?: string | null
          time_10k_sec?: number | null
          time_20k_date?: string | null
          time_20k_sec?: number | null
          time_5k_date?: string | null
          time_5k_sec?: number | null
          time_half_date?: string | null
          time_half_sec?: number | null
          time_marathon_date?: string | null
          time_marathon_sec?: number | null
          tss_7d?: number | null
          tte_mode?: string | null
          tte_observed_min?: number | null
          tte_observed_min_run?: number | null
          updated_at?: string
          vlamax?: number | null
          vlamax_is_reference?: boolean | null
          vlamax_protocol?: string | null
          vlamax_run?: number | null
          vlamax_source?: string | null
          vma?: number | null
          vo2max?: number | null
          weight_kg?: number | null
        }
        Update: {
          athlete_id?: string
          bike_cadence_rpm?: number | null
          bike_hr_drift_flag?: boolean | null
          carb_tolerance_band?: string | null
          coach_id?: string
          coach_notes?: string | null
          confidence?: number | null
          created_at?: string
          css?: number | null
          cycle_tag?: string | null
          date?: string
          fat_pct?: number | null
          fatigue_state?: string | null
          fc_max?: number | null
          force_development_mode?: boolean | null
          ftp?: number | null
          gi_issues_flag?: boolean | null
          id?: string
          low_crr_justification?: string | null
          map5min_w?: number | null
          metabolic_profile?: string | null
          metabolic_score?: number | null
          objectif?: string | null
          p30s_w?: number | null
          p60s_w?: number | null
          pace_threshold_sec_per_km?: number | null
          pmax_5s?: number | null
          protocol_quality?: number | null
          race_times_notes?: string | null
          run_duration_min?: number | null
          run_economy_label?: string | null
          run_economy_score?: number | null
          run_hr_drift_pct?: number | null
          run_hr_ref_bpm?: number | null
          run_pace_ref_sec_per_km?: number | null
          running_power_1s?: number | null
          running_power_30s?: number | null
          running_power_5min?: number | null
          running_power_5s?: number | null
          running_power_60s?: number | null
          running_power_max?: number | null
          running_power_threshold?: number | null
          source?: string
          sport_main?: string | null
          sprint_15s_distance?: number | null
          time_10k_date?: string | null
          time_10k_sec?: number | null
          time_20k_date?: string | null
          time_20k_sec?: number | null
          time_5k_date?: string | null
          time_5k_sec?: number | null
          time_half_date?: string | null
          time_half_sec?: number | null
          time_marathon_date?: string | null
          time_marathon_sec?: number | null
          tss_7d?: number | null
          tte_mode?: string | null
          tte_observed_min?: number | null
          tte_observed_min_run?: number | null
          updated_at?: string
          vlamax?: number | null
          vlamax_is_reference?: boolean | null
          vlamax_protocol?: string | null
          vlamax_run?: number | null
          vlamax_source?: string | null
          vma?: number | null
          vo2max?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          athlete_id: string
          coach_id: string
          date: string
          id: string
          name: string
          note: string | null
          raw: Json | null
          reliability: number | null
          sport: string | null
          type: string
          vlamax: number | null
        }
        Insert: {
          athlete_id: string
          coach_id: string
          date?: string
          id?: string
          name: string
          note?: string | null
          raw?: Json | null
          reliability?: number | null
          sport?: string | null
          type: string
          vlamax?: number | null
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          date?: string
          id?: string
          name?: string
          note?: string | null
          raw?: Json | null
          reliability?: number | null
          sport?: string | null
          type?: string
          vlamax?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan: {
        Row: {
          adjusted: boolean
          adjusted_reason: string | null
          athlete_id: string
          coach_id: string
          created_at: string
          custom_workout_description: string | null
          custom_workout_title: string | null
          date: string
          id: string
          notes: string | null
          phase: string | null
          status: string
          updated_at: string
          workout_id: string | null
        }
        Insert: {
          adjusted?: boolean
          adjusted_reason?: string | null
          athlete_id: string
          coach_id: string
          created_at?: string
          custom_workout_description?: string | null
          custom_workout_title?: string | null
          date: string
          id?: string
          notes?: string | null
          phase?: string | null
          status?: string
          updated_at?: string
          workout_id?: string | null
        }
        Update: {
          adjusted?: boolean
          adjusted_reason?: string | null
          athlete_id?: string
          coach_id?: string
          created_at?: string
          custom_workout_description?: string | null
          custom_workout_title?: string | null
          date?: string
          id?: string
          notes?: string | null
          phase?: string | null
          status?: string
          updated_at?: string
          workout_id?: string | null
        }
        Relationships: []
      }
      workouts_library: {
        Row: {
          created_at: string
          description: string | null
          duration_min: number
          id: string
          intensity_tag: string | null
          phase_tag: string
          sport: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_min?: number
          id: string
          intensity_tag?: string | null
          phase_tag: string
          sport: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          intensity_tag?: string | null
          phase_tag?: string
          sport?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
