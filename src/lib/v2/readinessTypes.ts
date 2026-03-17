/**
 * Readiness Types — Legacy stubs (Race Readiness module removed)
 * Types preserved for backward compatibility with pacing/simulation modules.
 */

// ═══ From raceReadinessRunning ═══
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

export interface RaceReadinessRun {
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

export function computeRaceReadinessRun(..._args: unknown[]): RaceReadinessRun {
  return {
    athlete_id: "",
    date: new Date().toISOString(),
    readiness_score: 70,
    readiness_state: "GREEN",
    limiting_factor: "NONE",
    confidence: 0.5,
    explanation: "Stub — Race Readiness module removed",
    coach_message: "",
    athlete_message: "",
    implications: { race_allowed: true, intensity_cap: 1.0, pacing_discipline: "NORMAL", recommended_start_pace: "" },
    potential_locked: false,
    potential_reference: "",
    availability_inputs: { sleep_quality: 7, fatigue_level: 3, muscle_soreness: 2, pain_flag: false, mental_stress: 3, motivation: 8 },
  };
}

export function applyReadinessToDecision(..._args: unknown[]): unknown {
  return {};
}

// ═══ From raceReadinessSimulationConnector ═══
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

// ═══ From raceReadinessV2 ═══
export type RaceReadinessV2Category = 
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

export interface RaceReadinessV2Result {
  potential: PotentialScore;
  availability: AvailabilityScore;
  readiness: {
    score: number;
    rawScore: number;
    category: RaceReadinessV2Category;
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

export const RACE_READINESS_V2_DEFINITIONS = {
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

export function getRaceReadinessV2Color(category: RaceReadinessV2Category): string {
  const colors: Record<RaceReadinessV2Category, string> = {
    preparation_required: "hsl(var(--destructive))",
    in_progress: "hsl(var(--warning))",
    solid: "hsl(var(--info, 210 40% 50%))",
    ready: "hsl(var(--success))",
  };
  return colors[category];
}

export function getRaceReadinessV2BgColor(category: RaceReadinessV2Category): string {
  const colors: Record<RaceReadinessV2Category, string> = {
    preparation_required: "hsl(var(--destructive) / 0.1)",
    in_progress: "hsl(var(--warning) / 0.1)",
    solid: "hsl(var(--info, 210 40% 50%) / 0.1)",
    ready: "hsl(var(--success) / 0.1)",
  };
  return colors[category];
}

export function getRaceReadinessV2BadgeClass(category: RaceReadinessV2Category): string {
  const classes: Record<RaceReadinessV2Category, string> = {
    preparation_required: "bg-destructive/20 text-destructive border-destructive/50",
    in_progress: "bg-warning/20 text-warning border-warning/50",
    solid: "bg-blue-500/20 text-blue-700 border-blue-500/50",
    ready: "bg-green-500/20 text-green-700 border-green-500/50",
  };
  return classes[category];
}

export const RACE_READINESS_V2_CATEGORIES: Record<RaceReadinessV2Category, { label: string; emoji: string }> = {
  preparation_required: { label: "Préparation requise", emoji: "🔴" },
  in_progress: { label: "En progression", emoji: "🟠" },
  solid: { label: "Solide", emoji: "🔵" },
  ready: { label: "Prêt", emoji: "🟢" },
};

export const ACCESS_STATUS_LABELS: Record<SimulationAccessStatus, string> = {
  RED: "Simulation non recommandée",
  ORANGE: "Simulation avec réserves",
  GREEN: "Simulation fiable",
  BLUE: "Conditions optimales",
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
  allowed: boolean;
  modifiers: SimulationModifiers;
  warnings: string[];
}

// ═══ Decision Quadrants (from raceReadinessV2) ═══
export type DecisionQuadrant = 'HIGH_HIGH' | 'HIGH_LOW' | 'LOW_HIGH' | 'LOW_LOW';

export function getQuadrant(potential: number, availability: number): DecisionQuadrant {
  const pHigh = potential >= 65;
  const aHigh = availability >= 65;
  if (pHigh && aHigh) return 'HIGH_HIGH';
  if (pHigh && !aHigh) return 'HIGH_LOW';
  if (!pHigh && aHigh) return 'LOW_HIGH';
  return 'LOW_LOW';
}

export const QUADRANT_INFO: Record<DecisionQuadrant, { label: string; emoji: string; description: string; color: string }> = {
  HIGH_HIGH: { label: "Go!", emoji: "🟢", description: "Potentiel élevé + Disponibilité élevée", color: "hsl(var(--success))" },
  HIGH_LOW: { label: "Prudence", emoji: "🟠", description: "Potentiel élevé mais disponibilité limitée", color: "hsl(var(--warning))" },
  LOW_HIGH: { label: "Développement", emoji: "🔵", description: "Bonne disponibilité, potentiel à développer", color: "hsl(var(--info, 210 40% 50%))" },
  LOW_LOW: { label: "Repos", emoji: "🔴", description: "Potentiel et disponibilité limités", color: "hsl(var(--destructive))" },
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

export function computeDecisionTFCL(input: ComputeDecisionTFCLInput): RaceReadinessV2Result {
  const gs = input.compass.globalScore;
  const category: RaceReadinessV2Category = gs >= 80 ? 'ready' : gs >= 65 ? 'solid' : gs >= 50 ? 'in_progress' : 'preparation_required';
  const catInfo = RACE_READINESS_V2_CATEGORIES[category];
  
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
    disclaimer: "Race Readiness module removed — scores based on physiological potential only.",
  };
}

// ═══ Simulation Access stubs ═══
export function computeSimulationAccess(..._args: unknown[]): SimulationAccessResult {
  return {
    status: 'GREEN',
    label: ACCESS_STATUS_LABELS.GREEN,
    allowed: true,
    modifiers: getDefaultSimulationModifiers(),
    warnings: [],
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
