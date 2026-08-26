/**
 * Readiness Types — Legacy stubs (Potentiel Physiologique module removed)
 * Types preserved for backward compatibility with pacing/simulation modules.
 */

// ═══ From potentielPhysiologiqueRunning ═══
export type ReadinessState = "RED" | "ORANGE" | "GREEN";
export type LimitingFactor = "FATIGUE" | "PAIN" | "ENERGY" | "STRESS" | "LOAD" | "NONE";
export type PacingDiscipline = "STRICT" | "VERY_STRICT" | "NORMAL";

export interface ReadinessImplications {
  race_allowed: boolean;
  intensity_cap: number;
  pacing_discipline: PacingDiscipline;
  recommended_start_pace: string;
}

export interface AvailabilityRun {
  sleep_quality: number;
  fatigue_level: number;
  muscle_soreness: number;
  pain_flag: boolean;
  pain_location?: string;
  mental_stress: number;
  motivation: number;
  hr_drift_flag?: boolean;
  recent_load_flag?: boolean;
  hrv_score?: number;
  resting_hr_delta?: number;
}

export type PlanPhase = "BUILD" | "SPECIFIC" | "TAPER" | "RACE_WEEK";
export type RaceImportance = "A" | "B" | "C" | "TRAINING";

export interface PotentielRun {
  athlete_id: string;
  date: string;
  readiness_score: number;
  readiness_state: ReadinessState;
  limiting_factor: LimitingFactor;
  limiting_factor_detail?: string;
  confidence: number;
  explanation: string;
  coach_message: string;
  athlete_message: string;
  implications: ReadinessImplications;
  potential_locked: boolean;
  potential_reference: string;
  availability_inputs: AvailabilityRun;
}

export type RiskContextRun = {
  readiness_state: ReadinessState;
  limiting_factor: LimitingFactor;
};

/**
 * Disponibilité du jour → Readiness Running (boucle rapide).
 *
 * Contrat d'échelle pour `AvailabilityRun` (voir fatigueStateMapping.ts,
 * source des valeurs par défaut dérivées de `fatigue_state`) :
 *   - sleep_quality  1-5, plus haut = meilleur sommeil
 *   - fatigue_level  1-5, plus haut = plus fatigué
 *   - muscle_soreness 0-10, plus haut = plus de courbatures
 *   - mental_stress  1-5, plus haut = plus stressé
 *   - motivation     1-5, plus haut = plus motivé
 *
 * Remplace le stub qui retournait toujours GREEN/70 quelle que soit la
 * disponibilité réelle de l'athlète (readiness_score toujours "70" et
 * readiness_state toujours "GREEN") — le pacing de course et la carte
 * "Décision Semaine" traitaient donc systématiquement l'athlète comme frais.
 */
export function computePotentielRun(
  profile: { athlete_id: string },
  availability: AvailabilityRun,
): PotentielRun {
  const {
    sleep_quality = 3,
    fatigue_level = 3,
    muscle_soreness = 2,
    pain_flag = false,
    mental_stress = 3,
    motivation = 3,
    hr_drift_flag,
    recent_load_flag,
  } = availability;

  let score = 70; // baseline "ok" sur tous les axes
  score -= (fatigue_level - 2) * 12;
  score += (sleep_quality - 4) * 6;
  score -= muscle_soreness * 2;
  score -= (mental_stress - 3) * 5;
  score += (motivation - 3) * 4;
  if (pain_flag) score -= 35;
  if (hr_drift_flag) score -= 10;
  if (recent_load_flag) score -= 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const readiness_state: ReadinessState = pain_flag || score < 40 ? "RED" : score < 65 ? "ORANGE" : "GREEN";

  // Facteur limitant dominant — priorité sécurité (douleur) puis plus gros écart au neutre.
  const deviations: Array<{ factor: LimitingFactor; magnitude: number }> = [
    { factor: "FATIGUE", magnitude: Math.max(0, fatigue_level - 2) * 12 },
    { factor: "STRESS", magnitude: Math.max(0, mental_stress - 3) * 5 },
    { factor: "LOAD", magnitude: (hr_drift_flag ? 10 : 0) + (recent_load_flag ? 10 : 0) },
    { factor: "ENERGY", magnitude: Math.max(0, 3 - motivation) * 4 + Math.max(0, 4 - sleep_quality) * 6 },
  ];
  const worst = deviations.reduce((a, b) => (b.magnitude > a.magnitude ? b : a), deviations[0]);
  const limiting_factor: LimitingFactor = pain_flag ? "PAIN" : worst.magnitude >= 15 ? worst.factor : "NONE";

  const confidence =
    0.5 + (hr_drift_flag !== undefined ? 0.15 : 0) + (recent_load_flag !== undefined ? 0.15 : 0);

  const implications: ReadinessImplications =
    readiness_state === "RED"
      ? { race_allowed: !pain_flag, intensity_cap: 0.75, pacing_discipline: "VERY_STRICT", recommended_start_pace: "Départ prudent, sous l'allure cible" }
      : readiness_state === "ORANGE"
        ? { race_allowed: true, intensity_cap: 0.9, pacing_discipline: "STRICT", recommended_start_pace: "Allure cible basse du couloir" }
        : { race_allowed: true, intensity_cap: 1.0, pacing_discipline: "NORMAL", recommended_start_pace: "Allure cible" };

  const stateLabel = readiness_state === "GREEN" ? "bonne" : readiness_state === "ORANGE" ? "réduite" : "faible";
  const explanation = `Disponibilité ${stateLabel} (score ${score}/100)` + (limiting_factor !== "NONE" ? ` — facteur limitant : ${limiting_factor}` : "");
  const coach_message = pain_flag
    ? "Douleur signalée — ne pas engager de course/séance clé sans validation."
    : `Disponibilité ${stateLabel}. ${implications.pacing_discipline === "NORMAL" ? "Plan prévu applicable." : "Approche conservatrice recommandée."}`;
  const athlete_message = pain_flag
    ? "Tu as signalé une douleur — priorité à la prudence aujourd'hui."
    : readiness_state === "GREEN"
      ? "Tu es prêt·e pour ta séance/course prévue."
      : readiness_state === "ORANGE"
        ? "Forme correcte mais pas optimale — reste sur un scénario prudent."
        : "Fatigue/charge élevée — privilégie un scénario robuste.";

  return {
    athlete_id: profile.athlete_id,
    date: new Date().toISOString(),
    readiness_score: score,
    readiness_state,
    limiting_factor,
    confidence: Math.min(0.9, confidence),
    explanation,
    coach_message,
    athlete_message,
    implications,
    potential_locked: false,
    potential_reference: "",
    availability_inputs: availability,
  };
}

/**
 * Applique le Readiness du jour à la décision hebdo de base
 * (`computeWeeklyDecision`, calculée sur charge/sommeil/fatigue de la
 * semaine) : resserre les contraintes d'exécution si la disponibilité DU
 * JOUR est dégradée, sans jamais assouplir ce que la boucle hebdo a déjà
 * décidé (le readiness journalier peut aggraver la prudence, jamais la
 * réduire).
 *
 * Remplace le stub qui retournait `{}` — la décision hebdo réelle
 * (calculée par computeWeeklyDecision) était donc systématiquement
 * remplacée par un objet vide en aval (badge de date "Invalid Date",
 * contraintes/garde-fous tous absents).
 */
export function applyReadinessToDecision<T extends {
  strategy_status: string;
  constraints: { intensity_allowed: "LOW" | "MODERATE" | "HIGH"; longrun_allowed: boolean; speedwork_allowed: boolean; max_key_sessions: number };
  watchouts: string[];
}>(decision: T, potentiel: PotentielRun): T {
  if (potentiel.readiness_state === "GREEN") return decision;

  const tighter = { ...decision.constraints };
  if (potentiel.readiness_state === "RED") {
    tighter.intensity_allowed = "LOW";
    tighter.speedwork_allowed = false;
    tighter.longrun_allowed = false;
    tighter.max_key_sessions = 0;
  } else if (potentiel.readiness_state === "ORANGE") {
    if (tighter.intensity_allowed === "HIGH") tighter.intensity_allowed = "MODERATE";
    tighter.speedwork_allowed = false;
    tighter.max_key_sessions = Math.min(tighter.max_key_sessions, 1);
  }

  const watchouts = decision.watchouts.includes(potentiel.explanation)
    ? decision.watchouts
    : [potentiel.explanation, ...decision.watchouts].slice(0, 3);

  return { ...decision, constraints: tighter, watchouts };
}

// ═══ From potentielPhysiologiqueSimulationConnector ═══
export type SimulationAccessStatus = 'RED' | 'ORANGE' | 'GREEN' | 'BLUE';

export interface SimulationModifiers {
  effectiveFtpMultiplier: [number, number];
  effectiveThresholdMultiplier: [number, number];
  fatmaxShiftPct: number;
  glycogenDepletionRateMultiplier: number;
  tteUsableMultiplier: number;
  riskZoneWidening: number;
  allowedScenarios: ('conservative' | 'optimal' | 'aggressive')[];
  negativeSplitAllowed: boolean;
  lateRaceIntensityBoostAllowed: boolean;
}

export function getDefaultSimulationModifiers(): SimulationModifiers {
  return {
    effectiveFtpMultiplier: [0.95, 1.0],
    effectiveThresholdMultiplier: [0.95, 1.0],
    fatmaxShiftPct: 0,
    glycogenDepletionRateMultiplier: 1.0,
    tteUsableMultiplier: 1.0,
    riskZoneWidening: 1.0,
    allowedScenarios: ['conservative', 'optimal', 'aggressive'],
    negativeSplitAllowed: true,
    lateRaceIntensityBoostAllowed: true,
  };
}

// ═══ From potentielPhysiologiqueV2 ═══
export type PotentielV2Category = 
  | 'preparation_required'
  | 'in_progress'
  | 'solid'
  | 'ready';

export type DataSourceType = 'measured' | 'estimated' | 'modeled';

export interface PotentialScore {
  score: number;
  range?: [number, number];
  confidence: number;
  sources: {
    aerobic: { value: number; type: DataSourceType };
    tolerance: { value: number; type: DataSourceType };
    metabolic: { value: number; type: DataSourceType };
    robustness: { value: number; type: DataSourceType };
  };
  mainStrength: string | null;
  mainLimitation: string | null;
  explanation: string;
}

export interface AvailabilityScore {
  score: number;
  confidence: number;
  factors: string[];
  alerts: string[];
  recommendation: string;
}

export interface DecisionFlags {
  healthAlert: boolean;
  injuryRiskHigh: boolean;
  fatigueCritical: boolean;
  dataIncomplete: boolean;
}

export interface PotentielV2Result {
  potential: PotentialScore;
  availability: AvailabilityScore;
  readiness: {
    score: number;
    rawScore: number;
    category: PotentielV2Category;
    categoryLabel: string;
    categoryEmoji: string;
    confidenceGlobal: number;
    confidenceLabel: string;
  };
  flags: DecisionFlags;
  penalties: { total: number; reasons: string[] };
  explanation: { why: string; watchouts: string[]; suggestedFocus: string[] };
  weights: { potential: number; availability: number };
  timestamp: string;
  version: string;
  disclaimer: string;
}

export const POTENTIEL_V2_DEFINITIONS = {
  potential: {
    title: "Potentiel (Metabolic Performance Compass™)",
    definition: "Le potentiel représente le profil physiologique structurel.",
  },
  availability: {
    title: "Disponibilité (retirée)",
    definition: "La disponibilité a été retirée du modèle.",
  },
  decision: {
    title: "Décision",
    definition: "Score basé sur le potentiel physiologique.",
  },
};

export function getPotentielV2Color(category: PotentielV2Category): string {
  const colors: Record<PotentielV2Category, string> = {
    preparation_required: "hsl(var(--destructive))",
    in_progress: "hsl(var(--warning))",
    solid: "hsl(var(--info, 210 40% 50%))",
    ready: "hsl(var(--success))",
  };
  return colors[category];
}

export function getPotentielV2BgColor(category: PotentielV2Category): string {
  const colors: Record<PotentielV2Category, string> = {
    preparation_required: "hsl(var(--destructive) / 0.1)",
    in_progress: "hsl(var(--warning) / 0.1)",
    solid: "hsl(var(--info, 210 40% 50%) / 0.1)",
    ready: "hsl(var(--success) / 0.1)",
  };
  return colors[category];
}

export function getPotentielV2BadgeClass(category: PotentielV2Category): string {
  const classes: Record<PotentielV2Category, string> = {
    preparation_required: "bg-destructive/20 text-destructive border-destructive/50",
    in_progress: "bg-warning/20 text-warning border-warning/50",
    solid: "bg-blue-500/20 text-blue-700 border-blue-500/50",
    ready: "bg-green-500/20 text-green-700 border-green-500/50",
  };
  return classes[category];
}

export const POTENTIEL_V2_CATEGORIES: Record<PotentielV2Category, { label: string; emoji: string }> = {
  preparation_required: { label: "Préparation requise", emoji: "🔴" },
  in_progress: { label: "En progression", emoji: "🟠" },
  solid: { label: "Solide", emoji: "🔵" },
  ready: { label: "Prêt", emoji: "🟢" },
};

export const ACCESS_STATUS_LABELS: Record<SimulationAccessStatus, { emoji: string; label: string }> = {
  RED: { emoji: "🔴", label: "Simulation non recommandée" },
  ORANGE: { emoji: "🟠", label: "Simulation avec réserves" },
  GREEN: { emoji: "🟢", label: "Simulation fiable" },
  BLUE: { emoji: "🔵", label: "Conditions optimales" },
};

export const SIMULATION_ACCESS_DEFINITIONS = {
  RED: "Données insuffisantes ou santé compromise",
  ORANGE: "Données partielles — interpréter avec prudence",
  GREEN: "Données complètes — simulation fiable",
  BLUE: "Toutes conditions réunies pour une simulation précise",
  title: "Simulation TFCL™",
  principle: "La simulation n'est pas une prédiction. C'est un outil d'exploration de scénarios basé sur votre profil physiologique.",
};

export interface SimulationAccessResult {
  status: SimulationAccessStatus;
  label: string;
  enabled: boolean;
  allowed: boolean;
  modifiers: SimulationModifiers;
  warnings: string[];
  message?: string;
  explanation?: string;
  recommendations?: { type: string; icon: string; title: string; content: string }[];
}

// ═══ Decision Quadrants (from potentielPhysiologiqueV2) ═══
export type DecisionQuadrant = 'HIGH_HIGH' | 'HIGH_LOW' | 'LOW_HIGH' | 'LOW_LOW';

export function getQuadrant(potential: number, availability: number): DecisionQuadrant {
  const pHigh = potential >= 65;
  const aHigh = availability >= 65;
  if (pHigh && aHigh) return 'HIGH_HIGH';
  if (pHigh && !aHigh) return 'HIGH_LOW';
  if (!pHigh && aHigh) return 'LOW_HIGH';
  return 'LOW_LOW';
}

export const QUADRANT_INFO: Record<DecisionQuadrant, { label: string; emoji: string; description: string; color: string; bgColor: string }> = {
  HIGH_HIGH: { label: "Go!", emoji: "🟢", description: "Potentiel élevé + Disponibilité élevée", color: "hsl(var(--success))", bgColor: "hsl(var(--success) / 0.1)" },
  HIGH_LOW: { label: "Prudence", emoji: "🟠", description: "Potentiel élevé mais disponibilité limitée", color: "hsl(var(--warning))", bgColor: "hsl(var(--warning) / 0.1)" },
  LOW_HIGH: { label: "Développement", emoji: "🔵", description: "Bonne disponibilité, potentiel à développer", color: "hsl(var(--info, 210 40% 50%))", bgColor: "hsl(var(--info, 210 40% 50%) / 0.1)" },
  LOW_LOW: { label: "Repos", emoji: "🔴", description: "Potentiel et disponibilité limités", color: "hsl(var(--destructive))", bgColor: "hsl(var(--destructive) / 0.1)" },
};

// ═══ computeDecisionTFCL stub ═══
export interface ComputeDecisionTFCLInput {
  compass: {
    capaciteAerobie: { score: number };
    toleranceEffort: { score: number };
    profilMetabolique: { score: number };
    robustesse: { score: number };
    globalScore: number;
    globalLabel: string;
    globalColor: string;
    dataCompleteness: number;
    mainLimitation: string | null;
    mainStrength: string | null;
    isFatigueModulated: boolean;
  };
  guardrails?: {
    healthAlert?: boolean;
    dataCompleteness?: number;
  };
}

export function computeDecisionTFCL(input: ComputeDecisionTFCLInput): PotentielV2Result {
  const gs = input.compass.globalScore;
  const category: PotentielV2Category = gs >= 80 ? 'ready' : gs >= 65 ? 'solid' : gs >= 50 ? 'in_progress' : 'preparation_required';
  const catInfo = POTENTIEL_V2_CATEGORIES[category];
  
  return {
    potential: {
      score: gs,
      confidence: (input.compass.dataCompleteness ?? 50) / 100,
      sources: {
        aerobic: { value: input.compass.capaciteAerobie.score, type: 'modeled' },
        tolerance: { value: input.compass.toleranceEffort.score, type: 'modeled' },
        metabolic: { value: input.compass.profilMetabolique.score, type: 'modeled' },
        robustness: { value: input.compass.robustesse.score, type: 'modeled' },
      },
      mainStrength: input.compass.mainStrength,
      mainLimitation: input.compass.mainLimitation,
      explanation: input.compass.globalLabel,
    },
    availability: {
      score: 80,
      confidence: 0.5,
      factors: [],
      alerts: [],
      recommendation: "Module disponibilité retiré",
    },
    readiness: {
      score: gs,
      rawScore: gs,
      category,
      categoryLabel: catInfo.label,
      categoryEmoji: catInfo.emoji,
      confidenceGlobal: (input.compass.dataCompleteness ?? 50) / 100,
      confidenceLabel: gs >= 65 ? "Fiable" : "Indicatif",
    },
    flags: {
      healthAlert: input.guardrails?.healthAlert ?? false,
      injuryRiskHigh: false,
      fatigueCritical: false,
      dataIncomplete: (input.guardrails?.dataCompleteness ?? 1) < 0.5,
    },
    penalties: { total: 0, reasons: [] },
    explanation: {
      why: input.compass.globalLabel,
      watchouts: input.compass.mainLimitation ? [input.compass.mainLimitation] : [],
      suggestedFocus: [],
    },
    weights: { potential: 1.0, availability: 0.0 },
    timestamp: new Date().toISOString(),
    version: "stub-2.1",
    disclaimer: "Potentiel Physiologique module removed — scores based on physiological potential only.",
  };
}

// ═══ Simulation Access stubs ═══
export function computeSimulationAccess(..._args: unknown[]): SimulationAccessResult {
  return {
    status: 'GREEN',
    label: ACCESS_STATUS_LABELS.GREEN.label,
    enabled: true,
    allowed: true,
    modifiers: getDefaultSimulationModifiers(),
    warnings: [],
    message: "Simulation disponible",
    explanation: "Toutes les données sont disponibles pour la simulation.",
    recommendations: [],
  };
}

export function getSimulationContextMessages(_status: SimulationAccessStatus): string[] {
  return [];
}

export const ACCESS_LEVEL_COLORS: Record<SimulationAccessStatus, string> = {
  RED: "hsl(var(--destructive))",
  ORANGE: "hsl(var(--warning))",
  GREEN: "hsl(var(--success))",
  BLUE: "hsl(210 80% 55%)",
};
