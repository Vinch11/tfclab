/**
 * Race Readiness Effectif — Legacy stub
 * Module supprimé. Ce fichier fournit des stubs pour la rétrocompatibilité.
 */

export interface RaceReadinessEffectif {
  score: number;
  label: string;
  color: string;
  confidence: number;
  isInsufficient: boolean;
  details?: {
    vlamax: number;
    endurance: number;
    puissance: number;
    fraicheur: number;
  };
}

export interface ComputeRaceReadinessEffectifParams {
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

/**
 * Stub: returns a neutral readiness score based on physiological potential only.
 */
export function computeRaceReadinessEffectif(params: ComputeRaceReadinessEffectifParams): RaceReadinessEffectif {
  const { vlamaxEffectif, tteEffectif } = params;
  
  // Simple score based on vlamax + TTE (no more fatigue/availability)
  const vlamaxScore = vlamaxEffectif.value <= 0.35 ? 90 : vlamaxEffectif.value <= 0.50 ? 70 : 50;
  const tteScore = tteEffectif.tte_min >= 45 ? 90 : tteEffectif.tte_min >= 30 ? 70 : 50;
  const score = Math.round((vlamaxScore + tteScore) / 2);
  
  const label = score >= 80 ? "Prêt" : score >= 60 ? "En progression" : "À développer";
  const color = score >= 80 ? "success" : score >= 60 ? "warning" : "destructive";
  const confidence = Math.min(vlamaxEffectif.confidence, tteEffectif.confidence);
  
  return {
    score,
    label,
    color,
    confidence,
    isInsufficient: confidence < 0.3,
    details: {
      vlamax: vlamaxScore,
      endurance: tteScore,
      puissance: score,
      fraicheur: 80, // neutral
    },
  };
}

/**
 * Stub for Race Readiness Signature
 */
export interface RaceReadinessInput {
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
}

export interface RaceReadinessResult {
  score: number;
  label: string;
  pillars: { name: string; score: number; weight: number }[];
  mainStrength: string | null;
  mainWeakness: string | null;
  confidence: number;
}

export function computeRaceReadinessSignature(input: RaceReadinessInput): RaceReadinessResult {
  const vScore = input.vlamaxValue <= 0.35 ? 90 : input.vlamaxValue <= 0.50 ? 70 : 50;
  const tScore = input.tteMin >= 45 ? 90 : input.tteMin >= 30 ? 70 : 50;
  const pScore = input.ftpKg ? (input.ftpKg >= 4.0 ? 90 : input.ftpKg >= 3.0 ? 70 : 50) : 60;
  const score = Math.round(vScore * 0.35 + tScore * 0.35 + pScore * 0.30);
  
  return {
    score,
    label: score >= 80 ? "Prêt" : score >= 60 ? "En progression" : "À développer",
    pillars: [
      { name: "Métabolique", score: vScore, weight: 0.35 },
      { name: "Endurance", score: tScore, weight: 0.35 },
      { name: "Puissance", score: pScore, weight: 0.30 },
    ],
    mainStrength: vScore >= tScore && vScore >= pScore ? "Métabolique" : tScore >= pScore ? "Endurance" : "Puissance",
    mainWeakness: vScore <= tScore && vScore <= pScore ? "Métabolique" : tScore <= pScore ? "Endurance" : "Puissance",
    confidence: Math.min(input.vlamaxConfidence, input.tteConfidence),
  };
}
