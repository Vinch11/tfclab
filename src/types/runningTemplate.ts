// =============================================
// TYPES TEMPLATES RUNNING - Week Selector TFCL™
// Two For Coaching Lab
// =============================================

/**
 * Phase du plan d'entraînement
 */
export type RunningPhase = "BASE" | "BUILD" | "SPECIFIC" | "TAPER";

/**
 * Focus principal de la semaine
 */
export type WeekFocus = "TTE" | "VO2" | "ECONOMY" | "ENDURANCE" | "SPEED";

/**
 * Niveau de risque blessure de la semaine
 */
export type InjuryRiskTag = "LOW" | "MED" | "HIGH";

/**
 * Type de session CAP
 */
export type RunSessionType = 
  | "Z2"         // Endurance fondamentale
  | "TEMPO"      // Allure tempo (Z3)
  | "THRESHOLD"  // Seuil (Z4)
  | "VO2"        // VO2max (Z5-Z6)
  | "LONGRUN"    // Sortie longue
  | "RECOVERY"   // Récupération active
  | "SPRINT"     // Travail de vitesse
  | "HILLS"      // Côtes / Force spécifique
  | "REST";      // Repos

/**
 * Type d'objectif running
 */
export type RunningGoal = "marathon" | "semi";

/**
 * Niveau d'ambition
 */
export type AmbitionLevel = "FINISH" | "PERF" | "SUB" | "ELITE";

/**
 * Méthodologie d'entraînement
 * - TFCL: Two For Coaching Lab (métabolique, VLamax-centré)
 * - CLASSIQUE: Friel / Periodisation traditionnelle (linéaire)
 * - INVERSE: Renato Canova (spécificité précoce)
 * - POLARISEE: 80/20, low intensity + high intensity
 * - LORANG: Olav Bu / double seuil
 */
export type TrainingMethodology = "TFCL" | "CLASSIQUE" | "INVERSE" | "POLARISEE" | "LORANG";

/**
 * Session individuelle d'une semaine running
 */
export interface RunningSession {
  sport: "run";
  day: string;
  title: string;
  type: RunSessionType;
  isKey: boolean;           // Séance clé de la semaine
  duration_min: number;     // Durée en minutes
  intensity_hint?: string;  // Ex: "Z4a", "95% VMA"
  notes?: string;
  details?: string;
}

/**
 * Métadonnées de la semaine (pour le scoring)
 */
export interface RunningWeekMeta {
  phase: RunningPhase;
  focus: WeekFocus;
  load_level: 1 | 2 | 3 | 4 | 5;          // Volume global (1=léger, 5=très chargé)
  intensity_density: 1 | 2 | 3 | 4 | 5;   // Densité d'intensité (1=faible, 5=élevée)
  longrun_level: 1 | 2 | 3 | 4 | 5;       // Niveau du long run (1=court, 5=très long)
  injury_risk_tag: InjuryRiskTag;
  isTagged: boolean;                       // Tags validés par le coach
}

/**
 * Semaine complète du template running
 */
export interface RunningWeek {
  template_id: string;
  section_id: string;
  week_id: string;
  week_number: number;
  title: string;
  summary: string;           // Résumé court (ex: "Pic de charge VO2")
  sessions: RunningSession[];
  meta: RunningWeekMeta;
  coachAdvice?: string;
}

/**
 * Template running complet
 */
export interface RunningTemplate {
  id: string;
  name: string;
  goal: RunningGoal;
  weeks_count: number;
  description?: string;
  methodology?: TrainingMethodology;
  sections: RunningTemplateSection[];
}

/**
 * Section d'un template (ex: Finisher vs Performance)
 */
export interface RunningTemplateSection {
  id: string;
  name: string;
  ambition: AmbitionLevel;
  weeks: RunningWeek[];
}

// =============================================
// ATHLETE TRUTH LAYER - Données physiologiques
// =============================================

export interface AthleteTruthRunning {
  // VLamax Running
  vlamax_run: {
    value: number | null;
    confidence: number;
    source: string;
  };
  // TTE Running
  tte_run: {
    value: number | null;
    confidence: number;
    source: string;
  };
  // Fatigue
  fatigueIndex: number;      // 0-100
  fatigueLevel: string;
  // Risque blessure CAP
  runInjuryRisk: {
    score: number;           // 0-100
    level: string;           // "FAIBLE" | "MODERE" | "ELEVE" | "CRITIQUE"
  };
  // Économie de course (si disponible)
  economy_run?: {
    score: number;           // 0-100
    label: string;
  };
  // Données personnelles
  age: number | null;
  sex: string | null;
  // Objectif
  objectif: string;
}

// =============================================
// WEEK SELECTOR CONTEXT
// =============================================

export interface WeekSelectorContext {
  raceType: RunningGoal;
  ambition: AmbitionLevel;
  race_date?: string;         // Date de la course (optionnel)
  phase_manual?: RunningPhase; // Phase manuelle si pas de date
  current_load?: number;       // Charge actuelle TSS/semaine
}

// =============================================
// SUGGESTION OUTPUT
// =============================================

export type SuggestionBadge = "TOP" | "GOOD" | "CAUTION";

export interface WeekSuggestion {
  template_id: string;
  template_name: string;
  section_id: string;
  section_name: string;
  week_id: string;
  week_number: number;
  week_title: string;
  week_summary: string;
  match_score: number;          // 0-100
  badge: SuggestionBadge;
  why: string;                  // Explication principale
  watchouts: string[];          // Garde-fous
  suggested_adjustments: string[];  // Max 3 suggestions non imposées
  meta: RunningWeekMeta;
  sessions: RunningSession[];
  coachAdvice?: string;
}

export interface WeekSelectorResult {
  suggestions: WeekSuggestion[];
  athleteTruth: AthleteTruthRunning;
  context: WeekSelectorContext;
  confidence: number;           // Confiance globale 0-1
  confidenceLabel: string;
  warnings: string[];           // Avertissements (données manquantes, etc.)
  disclaimer: string;
}
