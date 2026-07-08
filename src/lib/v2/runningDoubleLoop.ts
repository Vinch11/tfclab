/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUNNING DOUBLE LOOP — TFCL Method™ (Running Focus Mode)
 * 
 * Architecture "double boucle" inspirée de Dan Lorang :
 * - Boucle lente (4–6 semaines) : Profil physiologique CAP verrouillé
 * - Boucle rapide (hebdo) : Décision de semaine sans recalculer la physiologie
 * 
 * "La physiologie évolue lentement, les décisions doivent être prises souvent."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { type RunningRaceType } from "@/lib/runningFocusMode";
import { getVlamaxTarget as _getVlamaxTarget } from "./vlamaxTargets";

// ⚠️  SOURCE UNIQUE VLamax : `src/lib/v2/vlamaxTargets.ts`. Aucune valeur en dur.
function _vlamaxTolerance(key: string): { optimal: number; max: number } {
  const t = _getVlamaxTarget(key, 'run');
  return { optimal: t.ideal, max: t.max };
}


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — BOUCLE LENTE (PROFIL VERROUILLÉ)
// ═══════════════════════════════════════════════════════════════════════════════

export type RunningObjectiveDistance = "5K" | "10K" | "Semi" | "Marathon" | "Trail";

export type MetricSource = "lab" | "field_test" | "estimation" | "snapshot";

export interface LockedMetric<T = number> {
  value: T;
  range?: { min: T; max: T };
  confidence: number; // 0-1
  source: MetricSource;
  percentile?: number; // 0-100 pour comparaison population
}

export interface RunningPhysioProfile {
  athlete_id: string;
  objective_distance: RunningObjectiveDistance;
  
  // Métriques physiologiques CAP verrouillées
  vo2max_run: LockedMetric;
  vlamax_run: LockedMetric;
  durability_run: LockedMetric; // TTE en minutes ou score durabilité
  economy_run?: LockedMetric;   // Score économie 0-100
  fatmax_run?: LockedMetric;    // Zone FatMax en % vVO2max
  
  // Levier prioritaire du bloc
  priority_lever: RunningPriorityLever;
  lever_rationale: string;
  
  // Gestion du verrouillage
  last_calibration_date: string; // ISO date
  lock_duration_days: number;    // 28-42 jours
  next_recalibration_date: string;
  locked: boolean;
  
  // Métadonnées
  created_at: string;
  updated_at: string;
  calibration_source: "manual" | "auto" | "tfcl_week";
}

export type RunningPriorityLever = 
  | "reduce_vlamax"      // Réduire VLamax (Marathon focus)
  | "increase_durability" // Augmenter durabilité (Long distance)
  | "improve_economy"     // Améliorer économie
  | "boost_vo2max"        // Développer VO2max (10K focus)
  | "race_specific"       // Travail allure spécifique
  | "maintain_profile";   // Maintenir le profil actuel

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — BOUCLE RAPIDE (DÉCISION HEBDOMADAIRE)
// ═══════════════════════════════════════════════════════════════════════════════

export type ReadinessLevel = "LOW" | "MODERATE" | "GOOD";
export type RiskLevel = "LOW" | "MODERATE" | "HIGH";
export type StrategyStatus = "CONTINUE" | "ADJUST" | "DELOAD";
export type WeeklyFocus = "ENDURANCE" | "TTE" | "VO2" | "ECONOMY" | "RECOVERY" | "RACE_SPECIFIC";
export type IntensityAllowed = "LOW" | "MODERATE" | "HIGH";

export interface WeeklyConstraints {
  intensity_allowed: IntensityAllowed;
  longrun_allowed: boolean;
  speedwork_allowed: boolean;
  max_key_sessions: number; // 0-3
}

export interface RunningWeeklyDecision {
  athlete_id: string;
  week_start_date: string; // ISO date (lundi)
  
  // Décision principale
  readiness_week: ReadinessLevel;
  risk_level: RiskLevel;
  strategy_status: StrategyStatus;
  weekly_focus: WeeklyFocus;
  
  // Contraintes d'exécution
  constraints: WeeklyConstraints;
  
  // Justification et garde-fous
  why: string;
  watchouts: string[]; // max 3
  suggested_actions: string[]; // max 3
  
  // Lien avec le profil verrouillé
  aligned_with_lever: boolean;
  lever_this_week: string; // Comment le levier est appliqué cette semaine
  
  // Inputs utilisés
  inputs_used: WeeklyInputs;
  
  // Métadonnées
  computed_at: string;
  confidence: number; // 0-1
}

export interface WeeklyInputs {
  tss_7d?: number;
  tss_14d?: number;
  availability_score?: number; // 0-100
  sleep_quality?: number; // 1-5
  fatigue_level?: number; // 1-5
  pain_flag?: boolean;
  pain_location?: string;
  stress_level?: number; // 1-5
  motivation?: number; // 1-5
  hr_drift_pct?: number;
  key_session_success?: boolean;
  injury_risk_score?: number; // 0-100
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — ALERTE RECALIBRATION
// ═══════════════════════════════════════════════════════════════════════════════

export type RecalibrationTrigger = 
  | "data_inconsistency"    // Incohérence majeure fit import vs profil
  | "plateau_detected"      // Stagnation 6+ semaines
  | "objective_changed"     // Changement d'objectif
  | "injury_return"         // Retour de blessure
  | "new_quality_data"      // Nouvelles données de qualité
  | "lock_expired";         // Fin de période de verrouillage

export interface RecalibrationAlert {
  trigger: RecalibrationTrigger;
  severity: "info" | "warning" | "urgent";
  message: string;
  suggested_action: string;
  detected_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES — LEVIERS PAR OBJECTIF
// ═══════════════════════════════════════════════════════════════════════════════

export const LEVER_BY_OBJECTIVE: Record<RunningObjectiveDistance, {
  primary: RunningPriorityLever;
  secondary: RunningPriorityLever;
  vlamax_tolerance: { optimal: number; max: number };
  focus_description: string;
}> = {
  "5K": {
    primary: "boost_vo2max",
    secondary: "race_specific",
    vlamax_tolerance: { optimal: 0.55, max: 0.70 },
    focus_description: "Développement VO2max et vitesse spécifique 5K",
  },
  "10K": {
    primary: "boost_vo2max",
    secondary: "increase_durability",
    vlamax_tolerance: { optimal: 0.45, max: 0.55 },
    focus_description: "Équilibre VO2max et durabilité à haute intensité",
  },
  "Semi": {
    primary: "increase_durability",
    secondary: "boost_vo2max",
    vlamax_tolerance: { optimal: 0.38, max: 0.48 },
    focus_description: "Durabilité prioritaire avec développement VO2max",
  },
  "Marathon": {
    primary: "reduce_vlamax",
    secondary: "improve_economy",
    vlamax_tolerance: { optimal: 0.32, max: 0.42 },
    focus_description: "Réduction VLamax et optimisation de l'économie",
  },
  "Trail": {
    primary: "increase_durability",
    secondary: "improve_economy",
    vlamax_tolerance: { optimal: 0.35, max: 0.45 },
    focus_description: "Durabilité extrême et économie en terrain varié",
  },
};

export const LEVER_INFO: Record<RunningPriorityLever, {
  label: string;
  emoji: string;
  description: string;
  typical_sessions: string[];
}> = {
  reduce_vlamax: {
    label: "Réduire VLamax",
    emoji: "📉",
    description: "Diminuer la capacité glycolytique pour favoriser l'oxydation lipidique",
    typical_sessions: ["Endurance longue Z2", "Sorties longues progressives", "Tempo modéré"],
  },
  increase_durability: {
    label: "Augmenter Durabilité",
    emoji: "⏱️",
    description: "Améliorer la capacité à maintenir l'allure sur la durée",
    typical_sessions: ["Tempo prolongé", "Seuil en progression", "Long run avec finish rapide"],
  },
  improve_economy: {
    label: "Améliorer Économie",
    emoji: "⚡",
    description: "Réduire le coût énergétique par kilomètre",
    typical_sessions: ["Éducatifs techniques", "Côtes courtes", "Fartlek contrôlé"],
  },
  boost_vo2max: {
    label: "Développer VO2max",
    emoji: "🫁",
    description: "Augmenter la capacité aérobie maximale",
    typical_sessions: ["Intervalles 90-100% vVO2max", "Hill repeats", "Cruise intervals"],
  },
  race_specific: {
    label: "Allure Spécifique",
    emoji: "🎯",
    description: "Travail à l'allure cible de compétition",
    typical_sessions: ["Séances allure course", "Tempo race pace", "Répétitions spécifiques"],
  },
  maintain_profile: {
    label: "Maintenir Profil",
    emoji: "✅",
    description: "Conserver les acquis physiologiques actuels",
    typical_sessions: ["Programme équilibré", "Récupération active", "Variété contrôlée"],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS — CRÉATION DE PROFIL VERROUILLÉ
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateProfileInput {
  athlete_id: string;
  objective_distance: RunningObjectiveDistance;
  vo2max?: number;
  vo2max_confidence?: number;
  vo2max_source?: MetricSource;
  vlamax_cap?: number;
  vlamax_confidence?: number;
  vlamax_source?: MetricSource;
  durability_min?: number;
  durability_confidence?: number;
  economy_score?: number;
  lock_duration_days?: number;
}

export function createRunningPhysioProfile(input: CreateProfileInput): RunningPhysioProfile {
  const now = new Date().toISOString();
  const lockDays = input.lock_duration_days ?? 28;
  const nextRecal = new Date();
  nextRecal.setDate(nextRecal.getDate() + lockDays);
  
  // Déterminer le levier prioritaire
  const leverConfig = LEVER_BY_OBJECTIVE[input.objective_distance];
  let priorityLever = leverConfig.primary;
  let leverRationale = leverConfig.focus_description;
  
  // Ajuster le levier selon les données
  if (input.vlamax_cap !== undefined) {
    const tolerance = leverConfig.vlamax_tolerance;
    if (input.vlamax_cap > tolerance.max) {
      priorityLever = "reduce_vlamax";
      leverRationale = `VLamax CAP (${input.vlamax_cap.toFixed(2)}) supérieure au seuil ${input.objective_distance}. Priorité : réduction.`;
    } else if (input.vlamax_cap <= tolerance.optimal && input.durability_min && input.durability_min < 60) {
      priorityLever = "increase_durability";
      leverRationale = `VLamax OK mais durabilité insuffisante. Priorité : augmenter temps limite à allure.`;
    }
  }
  
  return {
    athlete_id: input.athlete_id,
    objective_distance: input.objective_distance,
    
    vo2max_run: {
      value: input.vo2max ?? 0,
      confidence: input.vo2max_confidence ?? 0.5,
      source: input.vo2max_source ?? "estimation",
    },
    vlamax_run: {
      value: input.vlamax_cap ?? 0.35,
      range: { min: (input.vlamax_cap ?? 0.35) * 0.9, max: (input.vlamax_cap ?? 0.35) * 1.1 },
      confidence: input.vlamax_confidence ?? 0.5,
      source: input.vlamax_source ?? "estimation",
    },
    durability_run: {
      value: input.durability_min ?? 45,
      confidence: input.durability_confidence ?? 0.5,
      source: "estimation",
    },
    economy_run: input.economy_score !== undefined ? {
      value: input.economy_score,
      confidence: 0.6,
      source: "estimation",
    } : undefined,
    
    priority_lever: priorityLever,
    lever_rationale: leverRationale,
    
    last_calibration_date: now,
    lock_duration_days: lockDays,
    next_recalibration_date: nextRecal.toISOString(),
    locked: true,
    
    created_at: now,
    updated_at: now,
    calibration_source: "manual",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS — DÉCISION HEBDOMADAIRE
// ═══════════════════════════════════════════════════════════════════════════════

export function computeWeeklyDecision(
  profile: RunningPhysioProfile,
  inputs: WeeklyInputs
): RunningWeeklyDecision {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(monday.getDate() - monday.getDay() + 1);
  
  // 1. Calculer la disponibilité globale
  const readiness = computeReadiness(inputs);
  
  // 2. Évaluer le niveau de risque
  const riskLevel = computeRiskLevel(inputs);
  
  // 3. Déterminer le statut de stratégie
  const strategyStatus = determineStrategy(readiness, riskLevel, inputs);
  
  // 4. Définir le focus hebdomadaire
  const weeklyFocus = determineWeeklyFocus(profile, strategyStatus, inputs);
  
  // 5. Calculer les contraintes
  const constraints = computeConstraints(readiness, riskLevel, strategyStatus);
  
  // 6. Générer justification et garde-fous
  const { why, watchouts, actions } = generateGuidance(
    profile, readiness, riskLevel, strategyStatus, weeklyFocus, inputs
  );
  
  // 7. Vérifier alignement avec le levier du bloc
  const { aligned, leverThisWeek } = checkLeverAlignment(profile, weeklyFocus, strategyStatus);
  
  return {
    athlete_id: profile.athlete_id,
    week_start_date: monday.toISOString().split("T")[0],
    
    readiness_week: readiness,
    risk_level: riskLevel,
    strategy_status: strategyStatus,
    weekly_focus: weeklyFocus,
    
    constraints,
    
    why,
    watchouts: watchouts.slice(0, 3),
    suggested_actions: actions.slice(0, 3),
    
    aligned_with_lever: aligned,
    lever_this_week: leverThisWeek,
    
    inputs_used: inputs,
    
    computed_at: now.toISOString(),
    confidence: computeDecisionConfidence(inputs),
  };
}

function computeReadiness(inputs: WeeklyInputs): ReadinessLevel {
  let score = 50; // Base
  
  // Disponibilité directe
  if (inputs.availability_score !== undefined) {
    score = inputs.availability_score;
  } else {
    // Calcul à partir des composants
    if (inputs.sleep_quality !== undefined) score += (inputs.sleep_quality - 3) * 8;
    if (inputs.fatigue_level !== undefined) score -= (inputs.fatigue_level - 3) * 10;
    if (inputs.stress_level !== undefined) score -= (inputs.stress_level - 3) * 6;
    if (inputs.motivation !== undefined) score += (inputs.motivation - 3) * 5;
    if (inputs.pain_flag) score -= 20;
  }
  
  if (score >= 70) return "GOOD";
  if (score >= 45) return "MODERATE";
  return "LOW";
}

function computeRiskLevel(inputs: WeeklyInputs): RiskLevel {
  let riskScore = 0;
  
  if (inputs.pain_flag) riskScore += 40;
  if (inputs.injury_risk_score !== undefined && inputs.injury_risk_score > 60) riskScore += 30;
  if (inputs.fatigue_level !== undefined && inputs.fatigue_level >= 4) riskScore += 20;
  if (inputs.hr_drift_pct !== undefined && inputs.hr_drift_pct > 10) riskScore += 15;
  
  // Charge excessive
  if (inputs.tss_7d !== undefined && inputs.tss_14d !== undefined) {
    const acwr = inputs.tss_7d / (inputs.tss_14d / 2);
    if (acwr > 1.5) riskScore += 25;
    else if (acwr > 1.3) riskScore += 15;
  }
  
  if (riskScore >= 50) return "HIGH";
  if (riskScore >= 25) return "MODERATE";
  return "LOW";
}

function determineStrategy(
  readiness: ReadinessLevel,
  risk: RiskLevel,
  inputs: WeeklyInputs
): StrategyStatus {
  // Règles de priorité
  if (risk === "HIGH") return "DELOAD";
  if (readiness === "LOW") return "ADJUST";
  if (inputs.pain_flag) return "DELOAD";
  if (risk === "MODERATE" && readiness !== "GOOD") return "ADJUST";
  return "CONTINUE";
}

function determineWeeklyFocus(
  profile: RunningPhysioProfile,
  strategy: StrategyStatus,
  inputs: WeeklyInputs
): WeeklyFocus {
  // En DELOAD, focus récupération
  if (strategy === "DELOAD") return "RECOVERY";
  
  // Mapper le levier du profil vers un focus hebdo
  const leverToFocus: Record<RunningPriorityLever, WeeklyFocus> = {
    reduce_vlamax: "ENDURANCE",
    increase_durability: "TTE",
    improve_economy: "ECONOMY",
    boost_vo2max: "VO2",
    race_specific: "RACE_SPECIFIC",
    maintain_profile: "ENDURANCE",
  };
  
  // En ADJUST, on garde le focus mais avec moins d'intensité
  return leverToFocus[profile.priority_lever];
}

function computeConstraints(
  readiness: ReadinessLevel,
  risk: RiskLevel,
  strategy: StrategyStatus
): WeeklyConstraints {
  if (strategy === "DELOAD") {
    return {
      intensity_allowed: "LOW",
      longrun_allowed: false,
      speedwork_allowed: false,
      max_key_sessions: 0,
    };
  }
  
  if (strategy === "ADJUST") {
    return {
      intensity_allowed: readiness === "LOW" ? "LOW" : "MODERATE",
      longrun_allowed: risk !== "HIGH",
      speedwork_allowed: false,
      max_key_sessions: 1,
    };
  }
  
  // CONTINUE
  return {
    intensity_allowed: readiness === "GOOD" ? "HIGH" : "MODERATE",
    longrun_allowed: true,
    speedwork_allowed: risk === "LOW" && readiness !== "LOW",
    max_key_sessions: readiness === "GOOD" ? 3 : 2,
  };
}

function generateGuidance(
  profile: RunningPhysioProfile,
  readiness: ReadinessLevel,
  risk: RiskLevel,
  strategy: StrategyStatus,
  focus: WeeklyFocus,
  inputs: WeeklyInputs
): { why: string; watchouts: string[]; actions: string[] } {
  const watchouts: string[] = [];
  const actions: string[] = [];
  
  let why = "";
  
  if (strategy === "DELOAD") {
    why = "Semaine de décharge recommandée. ";
    if (inputs.pain_flag) {
      why += "Douleur signalée nécessitant récupération. ";
      watchouts.push("Surveiller l'évolution de la douleur");
    }
    if (risk === "HIGH") {
      why += "Risque blessure élevé détecté.";
      watchouts.push("Éviter toute séance intense");
    }
    actions.push("Privilégier le volume très faible");
    actions.push("Récupération active uniquement");
    actions.push("Réévaluer en fin de semaine");
  } else if (strategy === "ADJUST") {
    why = "Adaptation nécessaire cette semaine. ";
    if (readiness === "LOW") {
      why += "Disponibilité réduite. ";
      watchouts.push("Ne pas forcer sur les séances clés");
    }
    if (risk === "MODERATE") {
      why += "Vigilance risque blessure requise.";
      watchouts.push("Réduire l'intensité des séances clés");
    }
    actions.push("Maintenir le focus " + focus + " avec volume réduit");
    actions.push("Reporter la séance clé si fatigue excessive");
  } else {
    why = `Semaine normale. Focus : ${focus}. `;
    why += `Aligné avec le levier de bloc : ${LEVER_INFO[profile.priority_lever].label}.`;
    if (readiness === "GOOD" && risk === "LOW") {
      actions.push("Exécuter le plan prévu");
      actions.push("Possibilité d'ajouter une séance spécifique");
    } else {
      actions.push("Exécuter le plan avec attention aux signaux");
      watchouts.push("Rester à l'écoute des sensations");
    }
  }
  
  // Garde-fous universels
  if (inputs.fatigue_level !== undefined && inputs.fatigue_level >= 4) {
    watchouts.push("Fatigue élevée : adapter l'intensité");
  }
  if (inputs.hr_drift_pct !== undefined && inputs.hr_drift_pct > 8) {
    watchouts.push("Dérive cardiaque importante : hydratation/récupération");
  }
  
  return { why, watchouts, actions };
}

function checkLeverAlignment(
  profile: RunningPhysioProfile,
  focus: WeeklyFocus,
  strategy: StrategyStatus
): { aligned: boolean; leverThisWeek: string } {
  const lever = profile.priority_lever;
  const leverInfo = LEVER_INFO[lever];
  
  if (strategy === "DELOAD") {
    return {
      aligned: true,
      leverThisWeek: `Récupération active — le levier "${leverInfo.label}" sera repris après la décharge.`,
    };
  }
  
  // Vérifier l'alignement
  const focusToLever: Record<WeeklyFocus, RunningPriorityLever[]> = {
    ENDURANCE: ["reduce_vlamax", "maintain_profile"],
    TTE: ["increase_durability"],
    VO2: ["boost_vo2max"],
    ECONOMY: ["improve_economy"],
    RACE_SPECIFIC: ["race_specific"],
    RECOVERY: ["maintain_profile"],
  };
  
  const aligned = focusToLever[focus]?.includes(lever) ?? false;
  
  let leverThisWeek = "";
  if (aligned) {
    leverThisWeek = `Application directe du levier "${leverInfo.label}" via séances ${leverInfo.typical_sessions[0]}.`;
  } else {
    leverThisWeek = `Adaptation du levier "${leverInfo.label}" au contexte de la semaine (${focus}).`;
  }
  
  return { aligned, leverThisWeek };
}

function computeDecisionConfidence(inputs: WeeklyInputs): number {
  let dataPoints = 0;
  let total = 6;
  
  if (inputs.availability_score !== undefined || 
      (inputs.sleep_quality !== undefined && inputs.fatigue_level !== undefined)) {
    dataPoints++;
  }
  if (inputs.tss_7d !== undefined) dataPoints++;
  if (inputs.pain_flag !== undefined) dataPoints++;
  if (inputs.stress_level !== undefined) dataPoints++;
  if (inputs.motivation !== undefined) dataPoints++;
  if (inputs.injury_risk_score !== undefined) dataPoints++;
  
  return Math.min(0.95, 0.4 + (dataPoints / total) * 0.55);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS — ALERTES RECALIBRATION
// ═══════════════════════════════════════════════════════════════════════════════

export function checkRecalibrationAlerts(
  profile: RunningPhysioProfile,
  newData?: { vo2max?: number; vlamax?: number; durability?: number }
): RecalibrationAlert[] {
  const alerts: RecalibrationAlert[] = [];
  const now = new Date();
  const nextRecal = new Date(profile.next_recalibration_date);
  
  // 1. Verrouillage expiré
  if (now >= nextRecal) {
    alerts.push({
      trigger: "lock_expired",
      severity: "warning",
      message: "La période de verrouillage du profil est terminée.",
      suggested_action: "Recalibrer le profil CAP avec les données récentes.",
      detected_at: now.toISOString(),
    });
  }
  
  // 2. Incohérence avec nouvelles données
  if (newData) {
    if (newData.vlamax !== undefined) {
      const diff = Math.abs(newData.vlamax - profile.vlamax_run.value) / profile.vlamax_run.value;
      if (diff > 0.20) {
        alerts.push({
          trigger: "data_inconsistency",
          severity: "warning",
          message: `Nouvelle VLamax (${newData.vlamax.toFixed(2)}) diffère de ${Math.round(diff * 100)}% du profil verrouillé.`,
          suggested_action: "Vérifier la validité du test et envisager une recalibration.",
          detected_at: now.toISOString(),
        });
      }
    }
    
    if (newData.vo2max !== undefined) {
      const diff = Math.abs(newData.vo2max - profile.vo2max_run.value) / profile.vo2max_run.value;
      if (diff > 0.10) {
        alerts.push({
          trigger: "data_inconsistency",
          severity: "info",
          message: `Nouvelle VO2max (${newData.vo2max}) diffère du profil verrouillé.`,
          suggested_action: "Surveiller les prochains tests pour confirmer l'évolution.",
          detected_at: now.toISOString(),
        });
      }
    }
  }
  
  return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

export function getDaysUntilRecalibration(profile: RunningPhysioProfile): number {
  const now = new Date();
  const nextRecal = new Date(profile.next_recalibration_date);
  const diff = nextRecal.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getWeeksUntilRecalibration(profile: RunningPhysioProfile): number {
  return Math.ceil(getDaysUntilRecalibration(profile) / 7);
}

export function getProfileConfidence(profile: RunningPhysioProfile): number {
  const metrics = [
    profile.vo2max_run.confidence,
    profile.vlamax_run.confidence,
    profile.durability_run.confidence,
  ];
  if (profile.economy_run) metrics.push(profile.economy_run.confidence);
  
  return Math.min(...metrics);
}
