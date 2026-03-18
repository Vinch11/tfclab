/**
 * Race Readiness Effectif — Legacy stub
 * Module supprimé. Ce fichier fournit des stubs pour la rétrocompatibilité.
 */

export interface RunningEconomyData {
  [key: string]: any;
  label: string;
  score: number;
  efficiency: number;
  cadence_ok: boolean;
  hr_drift_ok: boolean;
  pace_efficiency: number;
}

export interface PotentielPhysiologiqueEffectif {
  [key: string]: any;
  score: number;
  rawScore?: number;
  label: string;
  color: string;
  confidence: number;
  isInsufficient: boolean;
  messageStaff?: string;
  wasCappedByNutrition?: boolean;
  nutritionalCapReason?: string;
  wasCappedByEconomy?: boolean;
  economyCapReason?: string;
  reasonsMissing?: string[];
  nutritionalRiskIndex?: number;
  runningEconomy?: RunningEconomyData;
  details?: {
    vlamax: number;
    endurance: number;
    puissance: number;
    fraicheur: number;
  };
}

export interface ComputePotentielPhysiologiqueEffectifParams {
  objectif: string;
  vlamaxEffectif: { value: number; confidence: number };
  tteEffectif: { tte_min: number; confidence: number };
  ftp: number | null;
  poids?: number;
  fatigue_ok?: boolean;
  seance_specifique_validee?: boolean;
  fcMax?: number | null;
  deriveCardiaque?: number | null;
  athleteAge?: number | null;
  ambition?: string;
  tss7d?: number | null;
}

export function computePotentielEffectif(params: ComputePotentielPhysiologiqueEffectifParams): PotentielPhysiologiqueEffectif {
  const { vlamaxEffectif, tteEffectif } = params;
  const vlamaxScore = vlamaxEffectif.value <= 0.35 ? 90 : vlamaxEffectif.value <= 0.50 ? 70 : 50;
  const tteScore = tteEffectif.tte_min >= 45 ? 90 : tteEffectif.tte_min >= 30 ? 70 : 50;
  const score = Math.round((vlamaxScore + tteScore) / 2);
  const label = score >= 80 ? "Prêt" : score >= 60 ? "En progression" : "À développer";
  const color = score >= 80 ? "success" : score >= 60 ? "warning" : "destructive";
  const confidence = Math.min(vlamaxEffectif.confidence, tteEffectif.confidence);
  
  return {
    score, rawScore: score, label, color, confidence,
    isInsufficient: confidence < 0.3,
    messageStaff: `Score physiologique: ${score}/100 (${label})`,
    wasCappedByNutrition: false, nutritionalCapReason: undefined,
    wasCappedByEconomy: false, economyCapReason: undefined,
    reasonsMissing: [], nutritionalRiskIndex: 0,
    runningEconomy: undefined,
    details: { vlamax: vlamaxScore, endurance: tteScore, puissance: score, fraicheur: 80 },
  };
}

// ═══ Utility stubs ═══
export function getTargets(_objectif: string, ..._args: any[]): any {
  return { vlamax: { min: 0.15, max: 0.50, optimal: 0.30 }, tte: { min: 30, target: 50 }, durabilityMin: 40 };
}

export function getWeightsBySport(_sport: string): any {
  return { vlamax: 0.30, endurance: 0.30, puissance: 0.20, fraicheur: 0.20 };
}

export function getPotentielTargets(_objectif: string, _age?: number | null, _ambition?: string) {
  return { score: 70, vlamax: 0.30, vlamaxIdeal: 0.30, tte: 45, tteTarget: 45, ftpKgTarget: 3.5 };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "hsl(var(--success))";
  if (score >= 60) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

export function generateAthleteReadiness(..._args: unknown[]): any {
  return "Race Readiness module removed.";
}

export function computePillarCalculations(..._args: unknown[]): any {
  return { pillars: [], totalScore: 0 };
}

// ═══ Race Readiness Signature ═══
export interface PotentielInput {
  [key: string]: any;
  objectif: string;
  vlamaxValue: number;
  vlamaxConfidence: number;
  tteMin: number;
  tteConfidence: number;
  ftpKg: number | null;
  vo2max: number | null;
  fatmaxPct?: number | null;
  economyScore?: number | null;
  fatigueScore?: number | null;
  ambition?: string;
  physiology?: unknown;
}

export interface PotentielResult {
  [key: string]: any;
  score: number;
  label: string;
  pillars: { name: string; score: number; weight: number }[];
  mainStrength: string | null;
  mainWeakness: string | null;
  confidence: number;
  confidenceLabel?: string;
  confidenceReasons?: string[];
  decisionZone?: string;
  decisionIcon?: string;
  potentialLabel?: string;
  potentialScore?: number;
  potentialReasons?: string[];
  availabilityLabel?: string;
  availabilityScore?: number;
  availabilityReasons?: string[];
  recommendation?: string;
}

export function computePotentielSignature(input: PotentielInput): PotentielResult {
  const vScore = input.vlamaxValue <= 0.35 ? 90 : input.vlamaxValue <= 0.50 ? 70 : 50;
  const tScore = input.tteMin >= 45 ? 90 : input.tteMin >= 30 ? 70 : 50;
  const pScore = input.ftpKg ? (input.ftpKg >= 4.0 ? 90 : input.ftpKg >= 3.0 ? 70 : 50) : 60;
  const score = Math.round(vScore * 0.35 + tScore * 0.35 + pScore * 0.30);
  const label = score >= 80 ? "Prêt" : score >= 60 ? "En progression" : "À développer";
  
  return {
    score, label,
    pillars: [
      { name: "Métabolique", score: vScore, weight: 0.35 },
      { name: "Endurance", score: tScore, weight: 0.35 },
      { name: "Puissance", score: pScore, weight: 0.30 },
    ],
    mainStrength: vScore >= tScore && vScore >= pScore ? "Métabolique" : tScore >= pScore ? "Endurance" : "Puissance",
    mainWeakness: vScore <= tScore && vScore <= pScore ? "Métabolique" : tScore <= pScore ? "Endurance" : "Puissance",
    confidence: Math.min(input.vlamaxConfidence, input.tteConfidence),
    confidenceLabel: "Indicatif",
    confidenceReasons: ["Stub — Race Readiness module removed"],
    decisionZone: label,
    decisionIcon: score >= 80 ? "🟢" : score >= 60 ? "🟠" : "🔴",
    potentialLabel: label,
    potentialScore: score,
    potentialReasons: [],
    availabilityLabel: "N/A",
    availabilityScore: 0,
    availabilityReasons: ["Module retiré"],
    recommendation: label,
  };
}
