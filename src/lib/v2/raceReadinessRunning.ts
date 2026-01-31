/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RACE READINESS — RUNNING ONLY (TFCL Method™)
 * 
 * Question centrale :
 * "L'athlète peut-il exprimer son potentiel physiologique CAP aujourd'hui/cette semaine/le jour J ?"
 * 
 * Race Readiness ≠ potentiel absolu
 * Race Readiness = interaction entre profil verrouillé (boucle lente) et disponibilité (boucle rapide)
 * 
 * Aucune référence vélo. Aucune recalibration physiologique automatique.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { type RunningPhysioProfile, type WeeklyInputs, type RunningWeeklyDecision } from "./runningDoubleLoop";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — RACE READINESS RUNNING
// ═══════════════════════════════════════════════════════════════════════════════

export type ReadinessState = "RED" | "ORANGE" | "GREEN";

export type LimitingFactor = 
  | "FATIGUE"      // Fatigue accumulée
  | "PAIN"         // Douleur déclarée
  | "ENERGY"       // Manque d'énergie / sommeil
  | "STRESS"       // Stress mental élevé
  | "LOAD"         // Charge récente excessive
  | "NONE";        // Aucun facteur limitant majeur

export type PacingDiscipline = "STRICT" | "VERY_STRICT" | "NORMAL";

export interface ReadinessImplications {
  race_allowed: boolean;
  intensity_cap: number;          // % du potentiel (80-100)
  pacing_discipline: PacingDiscipline;
  recommended_start_pace: string; // ex: "Allure prudente (-5%)"
}

export interface RaceReadinessRun {
  athlete_id: string;
  date: string;
  
  // Score principal
  readiness_score: number;        // 0-100
  readiness_state: ReadinessState;
  
  // Analyse
  limiting_factor: LimitingFactor;
  limiting_factor_detail?: string;
  confidence: number;             // 0-1
  
  // Messages
  explanation: string;
  coach_message: string;
  athlete_message: string;
  
  // Implications opérationnelles
  implications: ReadinessImplications;
  
  // Lien avec le profil verrouillé
  potential_locked: boolean;
  potential_reference: string;    // ex: "VLamax 0.35, VO2 55, Durabilité 60min"
  
  // Inputs utilisés
  availability_inputs: AvailabilityRun;
  risk_context?: RiskContextRun;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — DISPONIBILITÉ (Boucle rapide)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AvailabilityRun {
  // Obligatoires (questionnaire)
  sleep_quality: number;      // 1-5
  fatigue_level: number;      // 1-5
  muscle_soreness: number;    // 0-3
  pain_flag: boolean;
  pain_location?: string;
  mental_stress: number;      // 1-5
  motivation: number;         // 1-5
  
  // Optionnels (données objectives)
  hr_drift_flag?: boolean;
  recent_load_flag?: boolean;
  hrv_score?: number;         // 0-100
  resting_hr_delta?: number;  // Δ par rapport à baseline
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — CONTEXTE RISQUE
// ═══════════════════════════════════════════════════════════════════════════════

export type PlanPhase = "BUILD" | "SPECIFIC" | "TAPER" | "RACE_WEEK";
export type RaceImportance = "A" | "B" | "C" | "TRAINING";

export interface RiskContextRun {
  age_factor: number;         // Multiplicateur risque selon âge
  injury_history_cap: boolean;
  recent_injury_weeks?: number;
  plan_phase: PlanPhase;
  race_importance: RaceImportance;
  days_to_race?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES — PÉNALITÉS & BONUS
// ═══════════════════════════════════════════════════════════════════════════════

const PENALTIES = {
  // Fatigue
  FATIGUE_HIGH: 20,         // fatigue_level >= 4
  FATIGUE_MODERATE: 10,     // fatigue_level == 3
  
  // Douleur
  PAIN_FLAG: 25,            // pain_flag = true
  SORENESS_HIGH: 10,        // muscle_soreness >= 2
  
  // Stress
  STRESS_HIGH: 15,          // mental_stress >= 4
  STRESS_MODERATE: 5,       // mental_stress == 3
  
  // Charge
  LOAD_HIGH: 10,            // recent_load_flag = true
  HR_DRIFT: 8,              // hr_drift_flag = true
  
  // Énergie
  SLEEP_POOR: 12,           // sleep_quality <= 2
  SLEEP_MODERATE: 5,        // sleep_quality == 3
  
  // HRV
  HRV_LOW: 10,              // hrv_score < 40
  RHR_ELEVATED: 8,          // resting_hr_delta > 5
} as const;

const BONUSES = {
  MOTIVATION_HIGH: 5,       // motivation >= 4
  HRV_HIGH: 5,              // hrv_score > 70
  SLEEP_EXCELLENT: 5,       // sleep_quality == 5
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE — CALCUL RACE READINESS
// ═══════════════════════════════════════════════════════════════════════════════

export function computeRaceReadinessRun(
  profile: RunningPhysioProfile,
  availability: AvailabilityRun,
  riskContext?: RiskContextRun
): RaceReadinessRun {
  const now = new Date().toISOString();
  
  // 1. Calculer le score brut
  const { score, penalties, bonuses } = calculateReadinessScore(availability);
  
  // 2. Appliquer modificateurs de contexte
  let adjustedScore = score;
  if (riskContext) {
    adjustedScore = applyRiskModifiers(adjustedScore, riskContext);
  }
  
  // 3. Clamp entre 0 et 100
  const finalScore = Math.max(0, Math.min(100, adjustedScore));
  
  // 4. Déterminer l'état
  const state = determineState(finalScore);
  
  // 5. Identifier le facteur limitant principal
  const limitingFactor = identifyLimitingFactor(availability, penalties);
  
  // 6. Calculer les implications
  const implications = computeImplications(state, finalScore, riskContext);
  
  // 7. Générer les messages
  const messages = generateMessages(state, limitingFactor, finalScore, profile, riskContext);
  
  // 8. Calculer la confiance
  const confidence = computeConfidence(availability, riskContext);
  
  // 9. Générer la référence du potentiel
  const potentialRef = formatPotentialReference(profile);
  
  return {
    athlete_id: profile.athlete_id,
    date: now.split("T")[0],
    
    readiness_score: Math.round(finalScore),
    readiness_state: state,
    
    limiting_factor: limitingFactor.factor,
    limiting_factor_detail: limitingFactor.detail,
    confidence,
    
    explanation: messages.explanation,
    coach_message: messages.coach,
    athlete_message: messages.athlete,
    
    implications,
    
    potential_locked: profile.locked,
    potential_reference: potentialRef,
    
    availability_inputs: availability,
    risk_context: riskContext,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS DE CALCUL
// ═══════════════════════════════════════════════════════════════════════════════

function calculateReadinessScore(availability: AvailabilityRun): {
  score: number;
  penalties: Array<{ type: string; value: number }>;
  bonuses: Array<{ type: string; value: number }>;
} {
  let score = 100; // On part du max
  const penaltiesApplied: Array<{ type: string; value: number }> = [];
  const bonusesApplied: Array<{ type: string; value: number }> = [];
  
  // Pénalités Fatigue
  if (availability.fatigue_level >= 4) {
    score -= PENALTIES.FATIGUE_HIGH;
    penaltiesApplied.push({ type: "FATIGUE_HIGH", value: PENALTIES.FATIGUE_HIGH });
  } else if (availability.fatigue_level === 3) {
    score -= PENALTIES.FATIGUE_MODERATE;
    penaltiesApplied.push({ type: "FATIGUE_MODERATE", value: PENALTIES.FATIGUE_MODERATE });
  }
  
  // Pénalités Douleur
  if (availability.pain_flag) {
    score -= PENALTIES.PAIN_FLAG;
    penaltiesApplied.push({ type: "PAIN_FLAG", value: PENALTIES.PAIN_FLAG });
  } else if (availability.muscle_soreness >= 2) {
    score -= PENALTIES.SORENESS_HIGH;
    penaltiesApplied.push({ type: "SORENESS_HIGH", value: PENALTIES.SORENESS_HIGH });
  }
  
  // Pénalités Stress
  if (availability.mental_stress >= 4) {
    score -= PENALTIES.STRESS_HIGH;
    penaltiesApplied.push({ type: "STRESS_HIGH", value: PENALTIES.STRESS_HIGH });
  } else if (availability.mental_stress === 3) {
    score -= PENALTIES.STRESS_MODERATE;
    penaltiesApplied.push({ type: "STRESS_MODERATE", value: PENALTIES.STRESS_MODERATE });
  }
  
  // Pénalités Charge
  if (availability.recent_load_flag) {
    score -= PENALTIES.LOAD_HIGH;
    penaltiesApplied.push({ type: "LOAD_HIGH", value: PENALTIES.LOAD_HIGH });
  }
  
  if (availability.hr_drift_flag) {
    score -= PENALTIES.HR_DRIFT;
    penaltiesApplied.push({ type: "HR_DRIFT", value: PENALTIES.HR_DRIFT });
  }
  
  // Pénalités Sommeil
  if (availability.sleep_quality <= 2) {
    score -= PENALTIES.SLEEP_POOR;
    penaltiesApplied.push({ type: "SLEEP_POOR", value: PENALTIES.SLEEP_POOR });
  } else if (availability.sleep_quality === 3) {
    score -= PENALTIES.SLEEP_MODERATE;
    penaltiesApplied.push({ type: "SLEEP_MODERATE", value: PENALTIES.SLEEP_MODERATE });
  }
  
  // Pénalités HRV
  if (availability.hrv_score !== undefined && availability.hrv_score < 40) {
    score -= PENALTIES.HRV_LOW;
    penaltiesApplied.push({ type: "HRV_LOW", value: PENALTIES.HRV_LOW });
  }
  
  if (availability.resting_hr_delta !== undefined && availability.resting_hr_delta > 5) {
    score -= PENALTIES.RHR_ELEVATED;
    penaltiesApplied.push({ type: "RHR_ELEVATED", value: PENALTIES.RHR_ELEVATED });
  }
  
  // Bonus Motivation
  if (availability.motivation >= 4) {
    score += BONUSES.MOTIVATION_HIGH;
    bonusesApplied.push({ type: "MOTIVATION_HIGH", value: BONUSES.MOTIVATION_HIGH });
  }
  
  // Bonus HRV
  if (availability.hrv_score !== undefined && availability.hrv_score > 70) {
    score += BONUSES.HRV_HIGH;
    bonusesApplied.push({ type: "HRV_HIGH", value: BONUSES.HRV_HIGH });
  }
  
  // Bonus Sommeil
  if (availability.sleep_quality === 5) {
    score += BONUSES.SLEEP_EXCELLENT;
    bonusesApplied.push({ type: "SLEEP_EXCELLENT", value: BONUSES.SLEEP_EXCELLENT });
  }
  
  return { score, penalties: penaltiesApplied, bonuses: bonusesApplied };
}

function applyRiskModifiers(score: number, context: RiskContextRun): number {
  let adjusted = score;
  
  // Phase du plan
  if (context.plan_phase === "TAPER" || context.plan_phase === "RACE_WEEK") {
    // En affûtage, les signaux de fatigue pèsent plus
    if (score < 75) {
      adjusted -= 5;
    }
  }
  
  // Historique blessure
  if (context.injury_history_cap) {
    if (context.recent_injury_weeks !== undefined && context.recent_injury_weeks < 8) {
      adjusted -= 10; // Retour récent de blessure
    } else {
      adjusted -= 3; // Historique mais pas récent
    }
  }
  
  // Facteur âge
  if (context.age_factor > 1.0) {
    adjusted -= (context.age_factor - 1.0) * 10;
  }
  
  // Importance course - on est plus exigeant pour une course A
  if (context.race_importance === "A" && score < 80) {
    // Alerte plus sensible pour course A
    adjusted -= 5;
  }
  
  return adjusted;
}

function determineState(score: number): ReadinessState {
  if (score >= 75) return "GREEN";
  if (score >= 50) return "ORANGE";
  return "RED";
}

function identifyLimitingFactor(
  availability: AvailabilityRun,
  penalties: Array<{ type: string; value: number }>
): { factor: LimitingFactor; detail?: string } {
  if (penalties.length === 0) {
    return { factor: "NONE" };
  }
  
  // Trouver la pénalité la plus importante
  const maxPenalty = penalties.reduce((max, p) => p.value > max.value ? p : max, penalties[0]);
  
  if (maxPenalty.type === "PAIN_FLAG") {
    return { 
      factor: "PAIN", 
      detail: availability.pain_location ? `Douleur : ${availability.pain_location}` : "Douleur déclarée"
    };
  }
  
  if (maxPenalty.type.startsWith("FATIGUE")) {
    return { factor: "FATIGUE", detail: "Fatigue accumulée" };
  }
  
  if (maxPenalty.type.startsWith("STRESS")) {
    return { factor: "STRESS", detail: "Stress mental élevé" };
  }
  
  if (maxPenalty.type === "LOAD_HIGH") {
    return { factor: "LOAD", detail: "Charge récente excessive" };
  }
  
  if (maxPenalty.type.startsWith("SLEEP") || maxPenalty.type === "HRV_LOW") {
    return { factor: "ENERGY", detail: "Déficit énergétique / récupération" };
  }
  
  return { factor: "FATIGUE", detail: "Accumulation de stress" };
}

function computeImplications(
  state: ReadinessState,
  score: number,
  context?: RiskContextRun
): ReadinessImplications {
  const isRaceWeek = context?.plan_phase === "RACE_WEEK";
  
  if (state === "RED") {
    return {
      race_allowed: false,
      intensity_cap: 80,
      pacing_discipline: "STRICT",
      recommended_start_pace: "Course déconseillée ou allure très conservatrice (-10%)",
    };
  }
  
  if (state === "ORANGE") {
    return {
      race_allowed: true,
      intensity_cap: 90,
      pacing_discipline: "VERY_STRICT",
      recommended_start_pace: isRaceWeek 
        ? "Départ prudent (-5%), patience absolue sur le premier tiers"
        : "Intensité contrôlée, éviter les efforts explosifs",
    };
  }
  
  // GREEN
  return {
    race_allowed: true,
    intensity_cap: 100,
    pacing_discipline: "NORMAL",
    recommended_start_pace: isRaceWeek
      ? "Allure planifiée autorisée, discipline normale"
      : "Potentiel pleinement exprimable",
  };
}

function generateMessages(
  state: ReadinessState,
  limitingFactor: { factor: LimitingFactor; detail?: string },
  score: number,
  profile: RunningPhysioProfile,
  context?: RiskContextRun
): { explanation: string; coach: string; athlete: string } {
  const objective = profile.objective_distance;
  const isRaceDay = context?.plan_phase === "RACE_WEEK";
  
  // Message principal (explanation)
  let explanation = "";
  let coach = "";
  let athlete = "";
  
  if (state === "GREEN") {
    explanation = `Readiness optimal (${score}%). Potentiel ${objective} pleinement exprimable.`;
    coach = `Conditions réunies pour exprimer le potentiel. Exécution conforme au plan.`;
    athlete = `Tu es prêt ! Les voyants sont au vert pour donner le meilleur de toi-même.`;
  } else if (state === "ORANGE") {
    const factorText = limitingFactor.detail || "fatigue modérée";
    explanation = `Readiness modéré (${score}%). Potentiel présent mais ${factorText.toLowerCase()} détectée.`;
    
    if (isRaceDay) {
      coach = `Course possible mais exécution disciplinée obligatoire. Surveiller ${limitingFactor.factor.toLowerCase()}.`;
      athlete = `Le potentiel est là, mais prudence au départ. Patience sur le premier tiers, accélération progressive.`;
    } else {
      coach = `Adapter la semaine : réduire densité intensité, priorité récupération avant qualité.`;
      athlete = `Semaine à aborder en contrôle. Écoute ton corps et n'hésite pas à lever le pied si besoin.`;
    }
  } else {
    // RED
    const factorText = limitingFactor.detail || "fatigue excessive";
    explanation = `Readiness insuffisant (${score}%). Potentiel présent mais non exprimable : ${factorText.toLowerCase()}.`;
    
    if (isRaceDay) {
      coach = `Course fortement déconseillée. Risque d'échec ou de blessure. Proposer report ou allure très conservatrice.`;
      athlete = `Les conditions ne sont pas réunies aujourd'hui. Il est préférable de ne pas courir ou d'adopter une allure très prudente.`;
    } else {
      coach = `Semaine allégée impérative. Résoudre le facteur limitant avant de reprendre l'intensité.`;
      athlete = `Cette semaine, c'est récupération. Ton corps a besoin de repos pour pouvoir performer ensuite.`;
    }
  }
  
  return { explanation, coach, athlete };
}

function computeConfidence(availability: AvailabilityRun, context?: RiskContextRun): number {
  let confidence = 0.7; // Base
  
  // Plus de données objectives = plus de confiance
  if (availability.hrv_score !== undefined) confidence += 0.1;
  if (availability.resting_hr_delta !== undefined) confidence += 0.05;
  if (availability.hr_drift_flag !== undefined) confidence += 0.05;
  
  // Contexte riche = plus de confiance
  if (context) {
    if (context.plan_phase) confidence += 0.05;
    if (context.days_to_race !== undefined) confidence += 0.05;
  }
  
  return Math.min(1, confidence);
}

function formatPotentialReference(profile: RunningPhysioProfile): string {
  const parts: string[] = [];
  
  if (profile.vlamax_run.value > 0) {
    parts.push(`VLamax ${profile.vlamax_run.value.toFixed(2)}`);
  }
  if (profile.vo2max_run.value > 0) {
    parts.push(`VO₂max ${Math.round(profile.vo2max_run.value)}`);
  }
  if (profile.durability_run.value > 0) {
    parts.push(`Durabilité ${Math.round(profile.durability_run.value)}min`);
  }
  
  return parts.join(" | ") || "Profil en cours de calibration";
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION — CONNEXION AVEC WEEKLY DECISION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Modifie la décision hebdomadaire en fonction du Race Readiness
 * Le Race Readiness influence l'exécution mais NE MODIFIE PAS le profil physiologique
 */
export function applyReadinessToDecision(
  decision: RunningWeeklyDecision,
  readiness: RaceReadinessRun
): RunningWeeklyDecision {
  const updatedDecision = { ...decision };
  
  // Si readiness RED → forcer DELOAD
  if (readiness.readiness_state === "RED") {
    updatedDecision.strategy_status = "DELOAD";
    updatedDecision.constraints = {
      intensity_allowed: "LOW",
      longrun_allowed: false,
      speedwork_allowed: false,
      max_key_sessions: 0,
    };
    updatedDecision.watchouts = [
      `Readiness insuffisant (${readiness.readiness_score}%)`,
      readiness.limiting_factor_detail || "Facteur limitant détecté",
      "Priorité récupération avant qualité",
    ];
  }
  
  // Si readiness ORANGE → ajuster contraintes
  else if (readiness.readiness_state === "ORANGE") {
    if (updatedDecision.strategy_status === "CONTINUE") {
      updatedDecision.strategy_status = "ADJUST";
    }
    updatedDecision.constraints = {
      ...updatedDecision.constraints,
      intensity_allowed: updatedDecision.constraints.intensity_allowed === "HIGH" ? "MODERATE" : updatedDecision.constraints.intensity_allowed,
      max_key_sessions: Math.min(updatedDecision.constraints.max_key_sessions, 1),
    };
    updatedDecision.watchouts = [
      `Readiness modéré (${readiness.readiness_score}%) - vigilance accrue`,
      ...updatedDecision.watchouts.slice(0, 2),
    ];
  }
  
  return updatedDecision;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION — CRÉATION DEPUIS WEEKLY INPUTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convertit WeeklyInputs en AvailabilityRun pour le calcul du readiness
 */
export function weeklyInputsToAvailability(inputs: WeeklyInputs): AvailabilityRun {
  return {
    sleep_quality: inputs.sleep_quality ?? 3,
    fatigue_level: inputs.fatigue_level ?? 3,
    muscle_soreness: inputs.pain_flag ? 2 : 0,
    pain_flag: inputs.pain_flag ?? false,
    pain_location: inputs.pain_flag ? "Non précisé" : undefined,
    mental_stress: inputs.stress_level ?? 3,
    motivation: inputs.motivation ?? 3,
    hr_drift_flag: inputs.hr_drift_pct !== undefined && inputs.hr_drift_pct > 10,
    recent_load_flag: inputs.tss_7d !== undefined && inputs.tss_14d !== undefined 
      ? inputs.tss_7d > (inputs.tss_14d / 2) * 1.3 
      : false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

export const READINESS_STATE_INFO: Record<ReadinessState, {
  label: string;
  emoji: string;
  color: string;
  description: string;
}> = {
  GREEN: {
    label: "Prêt",
    emoji: "🟢",
    color: "hsl(var(--success))",
    description: "Conditions réunies pour exprimer le potentiel",
  },
  ORANGE: {
    label: "Vigilance",
    emoji: "🟠",
    color: "hsl(var(--warning))",
    description: "Course possible, exécution disciplinée obligatoire",
  },
  RED: {
    label: "Pause",
    emoji: "🔴",
    color: "hsl(var(--destructive))",
    description: "Potentiel présent mais non exprimable aujourd'hui",
  },
};

export const LIMITING_FACTOR_INFO: Record<LimitingFactor, {
  label: string;
  emoji: string;
  advice: string;
}> = {
  FATIGUE: {
    label: "Fatigue",
    emoji: "😴",
    advice: "Priorise le repos et la récupération active",
  },
  PAIN: {
    label: "Douleur",
    emoji: "🤕",
    advice: "Ne pas ignorer la douleur - adapter ou reporter",
  },
  ENERGY: {
    label: "Énergie",
    emoji: "🔋",
    advice: "Améliore sommeil et nutrition",
  },
  STRESS: {
    label: "Stress",
    emoji: "😰",
    advice: "Gestion du stress avant effort intense",
  },
  LOAD: {
    label: "Charge",
    emoji: "📈",
    advice: "Réduire le volume pour assimiler",
  },
  NONE: {
    label: "Aucun",
    emoji: "✅",
    advice: "Tous les voyants sont au vert",
  },
};
