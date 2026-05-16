/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL COACHING COMPASS™ — Types
 * 
 * Couche de synthèse : PROFIL → LIMITEUR → LEVIER → DÉCISION
 * Ne calcule rien. Consomme les moteurs existants.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL PHYSIOLOGIQUE UNIFIÉ
// ═══════════════════════════════════════════════════════════════════════════════

export interface PhysioMetric {
  value: number | null;
  confidence: number;       // 0-1
  source: string;           // "snapshot" | "estimation" | "unknown"
  lastUpdated: string | null;
  unit: string;
}

export interface TFCLPhysiologicalProfile {
  vo2max: PhysioMetric;
  vlamax: PhysioMetric;
  fatmax: PhysioMetric;
  lt1: PhysioMetric;
  lt2: PhysioMetric;
  ftp: PhysioMetric;
  ftpKg: PhysioMetric;
  vma: PhysioMetric;
  tte: PhysioMetric;
  runningEconomy: PhysioMetric;
  durability: PhysioMetric;
  wPrime: PhysioMetric;
  dataCompleteness: number;   // 0-100%
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITEUR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export type LimiterType = 
  | "aerobic_power"     // Moteur aérobie (VO2max, FTP/kg)
  | "glycolytic"        // Glycolyse (VLamax trop haute)
  | "metabolic_endurance" // Endurance métabolique (FatMax, TTE)
  | "durability"        // Durabilité (TTE, HR drift)
  | "neuromuscular"     // Neuromusculaire (W', économie)
  | "unknown";

export interface TFCLLimiter {
  type: LimiterType;
  impactScore: number;      // 0-1
  label: string;
  description: string;
  icon: string;
  metricsUsed: string[];    // Métriques ayant conduit à cette identification
  confidence: "high" | "moderate" | "low";
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVIER PRIORITAIRE
// ═══════════════════════════════════════════════════════════════════════════════

export type LeverType = 
  | "vo2_intervals"         // Intervalles VO2max
  | "metabolic_endurance"   // Z2 volume + tempo (abaisser VLamax)
  | "long_endurance"        // Endurance longue durée
  | "sprint_force"          // Sprint / force neuromusculaire
  | "economy_technique"     // Travail technique / économie
  | "mixed";                // Approche équilibrée

export interface TFCLLeverage {
  type: LeverType;
  label: string;
  icon: string;
  description: string;
  expectedAdaptations: string[];
  workoutExamples: string[];
  priority: 1 | 2 | 3;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DÉCISION D'ENTRAÎNEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface TFCLCoachingDecision {
  recommendedBlock: string;
  durationWeeks: number;
  primaryWorkouts: string[];
  physiologicalTargets: string[];
  prohibitions: string[];
  athleteMessage: string;      // Message simple pour l'athlète
  coachRationale: string;      // Justification pour le coach
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTÉGRATION RACE READINESS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TFCLReadinessState {
  potential: number;           // 0-100
  availability: number;        // 0-100
  governingFactor: "potential" | "availability";
  potentielScore: number;      // 0-100
  potentielLabel: string;
  potentielColor: "success" | "warning" | "destructive";
}

// ═══════════════════════════════════════════════════════════════════════════════
// RÉSULTAT FINAL — COACHING COMPASS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TFCLCoachingCompassResult {
  // Les 4 niveaux
  profile: TFCLPhysiologicalProfile;
  limiter: TFCLLimiter;
  leverage: TFCLLeverage;
  decision: TFCLCoachingDecision;
  
  // Intégration Potentiel Physiologique
  readiness: TFCLReadinessState;
  
  // Axes radar (4 piliers : VO2max, VLamax, Aérobie [VMA/FTPkg], Durabilité)
  radarAxes: RadarAxis[];

  // Modulateur Économie — affiché à part (facteur secondaire d'efficience)
  economyModifier: RadarAxis;
  
  // Fatigue warning (si applicable)
  fatigueWarning: {
    level: "none" | "moderate" | "high" | "critical";
    message: string;
  } | null;
  
  // Meta
  meta: {
    version: string;
    timestamp: string;
    disclaimer: string;
    dataCompleteness: number;
  };
}

export interface RadarAxis {
  key: string;
  label: string;
  shortLabel: string;
  score: number;        // 0-100
  icon: string;
  color: string;
  value: number | null;  // Valeur actuelle brute
  target: number | null; // Cible pour l'objectif
  unit: string;          // Unité d'affichage
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CoachingCompassInput {
  // Données snapshot
  ftp: number | null;
  poids: number | null;
  vo2max: number | null;
  tss7d: number | null;
  snapshotDate: string | null;
  snapshotUpdatedAt: string | null;
  
  // Puissances vélo
  pmax5s: number | null;
  p30sW: number | null;
  p60sW: number | null;
  map5minW: number | null;
  
  // Running
  runEconomyScore: number | null;
  hrDriftPct: number | null;
  vma: number | null;
  paceThresholdSecPerKm: number | null;
  
  // FatMax
  fatmax: number | null;
  
  // Effectifs pré-calculés (provenant du Diagnostic Engine)
  vlamaxEffectif: { value: number | null; confidence: number; source: string };
  tteEffectif: { tte_min: number; confidence: number; source: string };
  /** TTE CAP séparé (course à pied). Pour les triathlons, on prend min(bike,run) pour la durabilité. */
  tteEffectifRun?: { tte_min: number; confidence: number; source: string } | null;
  fatigueEffectif: { score: number; level: string; confidence: number } | null;
  
  // Limiteur unifié pré-calculé
  limiterResult: {
    primaryLimiter: string | null;
    limiterLabel?: string;
    limiterEmoji?: string;
    limiterExplanation?: string;
    gapAnalysis: Array<{ metric: string; gap: number; weightedImpact: number }>;
    confidence: number;
    fatigueWarning?: { level: string; message: string } | null;
  } | null;
  
  // Potentiel Physiologique pré-calculé
  potentielPhysiologique: {
    score: number;
    potential: number;
    availability: number;
    governingFactor: string;
    label: string;
    color: string;
  } | null;
  
  // Strategy Engine pré-calculé
  strategyResult: {
    primaryLimiter: string;
    limiterLabel: string;
    limiterExplanation: string;
    activatedLevers: Array<{
      lever: string;
      label: string;
      priority: number;
      reason: string;
      prescription: string[];
    }>;
    prohibitions: Array<{ label: string; reason: string }>;
    hasSprintBan: boolean;
    summary: { mainAction: string; whyThis: string };
    templateSuggestion: { weekType: string; weekLabel: string };
    athleteMessage: string;
    confidence: string;
  } | null;
  
  // LT1/LT2 pré-calculés
  lactateThresholds: {
    lt1: { watts?: number; pct_of_ftp?: number; confidence: number } | null;
    lt2: { watts?: number; pct_of_ftp?: number; confidence: number } | null;
  } | null;
  
  // W' pré-calculé
  wprimeKj: number | null;
  
  // Contexte
  objectif: string;
  ambition: string;
  sportFocus: "bike" | "run" | "triathlon" | null;
  athleteAge: number | null;
}
