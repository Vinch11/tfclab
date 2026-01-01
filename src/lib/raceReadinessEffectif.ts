// =============================================
// RACE READINESS EFFECTIF - Source unique de vérité
// FIX 13 - Pondérations par objectif + targets + messageStaff
// + Plafonnement par Risque Nutritionnel
// =============================================

import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { TTEEffectif } from "@/lib/tteEffectif";
import { computeNutritionEstimate, applyNutritionalCap, type NutritionalRiskIndex } from "@/lib/nutritionPredictive";

// =============================================
// TYPES
// =============================================

export interface RaceReadinessDetails {
  vlamax: number;       // 0-25
  endurance: number;    // 0-25
  puissance: number;    // 0-25
  fraicheur: number;    // 0-25
}

export interface RaceTargets {
  vlamaxMin: number;
  vlamaxMax: number;
  vlamaxIdeal: number;
  tteTarget: number;
  ftpKgTarget: number;
}

export interface RaceWeights {
  vlamax: number;
  tte: number;
  ftpKg: number;
  freshness: number;
}

export interface RaceReadinessEffectif {
  score: number;                 // 0-100 (après plafonnement nutritionnel)
  rawScore: number;              // Score avant plafonnement nutritionnel
  label: string;                 // "Race Ready!", "En progression", etc.
  color: "success" | "warning" | "destructive";
  details: RaceReadinessDetails;
  targets: RaceTargets;
  weights: RaceWeights;
  confidence: number;            // 0-1 (moyenne des confidences)
  reasonsMissing: string[];      // Liste des données manquantes
  inputsUsed: {
    vlamax: { value: number | null; source: string };
    tte: { value: number | null; source: string };
    ftpKg: number | null;
    fatigue_ok: boolean;
    seance_specifique: boolean;
  };
  messageStaff: string;          // Message explicatif staff-ready
  // Nouvelles propriétés pour le risque nutritionnel
  nutritionalRiskIndex: NutritionalRiskIndex | null;
  wasCappedByNutrition: boolean;
  nutritionalCapReason: string | null;
}

export interface ComputeRaceReadinessParams {
  objectif: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  ftp: number | null;
  poids: number | null;
  fatigue_ok?: boolean;
  seance_specifique_validee?: boolean;
  confidence?: number; // optionnel, sinon moyenne des inputs
}

// =============================================
// TARGETS PAR OBJECTIF (valeurs raisonnables)
// =============================================

const TARGETS_BY_OBJECTIF: Record<string, RaceTargets> = {
  // Ironman / Ultra-distance
  IM: {
    vlamaxMin: 0.25,
    vlamaxMax: 0.40,
    vlamaxIdeal: 0.35,
    tteTarget: 55,
    ftpKgTarget: 4.6,
  },
  Ironman: {
    vlamaxMin: 0.25,
    vlamaxMax: 0.40,
    vlamaxIdeal: 0.35,
    tteTarget: 55,
    ftpKgTarget: 4.6,
  },
  Ultra: {
    vlamaxMin: 0.25,
    vlamaxMax: 0.40,
    vlamaxIdeal: 0.32,
    tteTarget: 60,
    ftpKgTarget: 4.4,
  },
  // 70.3 / Half
  "703": {
    vlamaxMin: 0.25,
    vlamaxMax: 0.45,
    vlamaxIdeal: 0.38,
    tteTarget: 50,
    ftpKgTarget: 4.8,
  },
  Half: {
    vlamaxMin: 0.25,
    vlamaxMax: 0.45,
    vlamaxIdeal: 0.38,
    tteTarget: 50,
    ftpKgTarget: 4.8,
  },
  // Marathon / Semi / Course
  Marathon: {
    vlamaxMin: 0.30,
    vlamaxMax: 0.50,
    vlamaxIdeal: 0.40,
    tteTarget: 50,
    ftpKgTarget: 4.5, // proxy vélo endurance
  },
  Semi: {
    vlamaxMin: 0.30,
    vlamaxMax: 0.50,
    vlamaxIdeal: 0.42,
    tteTarget: 50,
    ftpKgTarget: 4.5,
  },
  Course: {
    vlamaxMin: 0.30,
    vlamaxMax: 0.50,
    vlamaxIdeal: 0.42,
    tteTarget: 45,
    ftpKgTarget: 4.5,
  },
  // Trail
  Trail: {
    vlamaxMin: 0.25,
    vlamaxMax: 0.45,
    vlamaxIdeal: 0.35,
    tteTarget: 55,
    ftpKgTarget: 4.4,
  },
  TrailCourt: {
    vlamaxMin: 0.30,
    vlamaxMax: 0.50,
    vlamaxIdeal: 0.40,
    tteTarget: 45,
    ftpKgTarget: 4.5,
  },
  TrailLong: {
    vlamaxMin: 0.25,
    vlamaxMax: 0.40,
    vlamaxIdeal: 0.32,
    tteTarget: 60,
    ftpKgTarget: 4.3,
  },
};

// Default fallback
const DEFAULT_TARGETS: RaceTargets = TARGETS_BY_OBJECTIF["IM"];

// =============================================
// PONDÉRATIONS PAR OBJECTIF
// =============================================

const WEIGHTS_BY_OBJECTIF: Record<string, RaceWeights> = {
  // Ironman : VLamax et TTE très importants (endurance pure)
  IM: { vlamax: 30, tte: 30, ftpKg: 20, freshness: 20 },
  Ironman: { vlamax: 30, tte: 30, ftpKg: 20, freshness: 20 },
  Ultra: { vlamax: 30, tte: 35, ftpKg: 15, freshness: 20 },
  // 70.3 : équilibré avec FTP/kg plus important
  "703": { vlamax: 25, tte: 25, ftpKg: 30, freshness: 20 },
  Half: { vlamax: 25, tte: 25, ftpKg: 30, freshness: 20 },
  // Course (Marathon/Semi) : TTE et puissance prioritaires
  Marathon: { vlamax: 20, tte: 35, ftpKg: 30, freshness: 15 },
  Semi: { vlamax: 20, tte: 35, ftpKg: 30, freshness: 15 },
  Course: { vlamax: 20, tte: 30, ftpKg: 30, freshness: 20 },
  // Trail : TTE important, VLamax moyen
  Trail: { vlamax: 25, tte: 35, ftpKg: 20, freshness: 20 },
  TrailCourt: { vlamax: 25, tte: 30, ftpKg: 25, freshness: 20 },
  TrailLong: { vlamax: 25, tte: 40, ftpKg: 15, freshness: 20 },
};

const DEFAULT_WEIGHTS: RaceWeights = WEIGHTS_BY_OBJECTIF["IM"];

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function getTargets(objectif: string): RaceTargets {
  return TARGETS_BY_OBJECTIF[objectif] || DEFAULT_TARGETS;
}

export function getRaceWeights(objectif: string): RaceWeights {
  return WEIGHTS_BY_OBJECTIF[objectif] || DEFAULT_WEIGHTS;
}

// =============================================
// SCORING FUNCTIONS
// =============================================

/**
 * Score VLamax: dans la plage cible = 100%, sinon pénalité linéaire
 */
function scoreVLamax(vlamax: number | null, targets: RaceTargets): number {
  if (vlamax === null) return 40; // score neutre si manquant
  
  // Dans la plage cible
  if (vlamax >= targets.vlamaxMin && vlamax <= targets.vlamaxMax) {
    // Plus proche de l'idéal = meilleur score
    const distanceToIdeal = Math.abs(vlamax - targets.vlamaxIdeal);
    const maxDistance = Math.max(
      targets.vlamaxIdeal - targets.vlamaxMin,
      targets.vlamaxMax - targets.vlamaxIdeal
    );
    const penalty = (distanceToIdeal / maxDistance) * 20;
    return clamp(100 - penalty, 80, 100);
  }
  
  // Hors cible - pénalité linéaire sur marge 0.10
  const tolerance = 0.10;
  if (vlamax < targets.vlamaxMin) {
    const deviation = targets.vlamaxMin - vlamax;
    return clamp(80 - (deviation / tolerance) * 40, 20, 80);
  } else {
    const deviation = vlamax - targets.vlamaxMax;
    return clamp(80 - (deviation / tolerance) * 50, 10, 80);
  }
}

/**
 * Score TTE: >= target = 100%, sinon ratio proportionnel
 */
function scoreTTE(tte: number | null, targets: RaceTargets): number {
  if (tte === null) return 30; // score faible si manquant
  
  if (tte >= targets.tteTarget) {
    return 100;
  }
  
  const ratio = tte / targets.tteTarget;
  return clamp(ratio * 100, 20, 99);
}

/**
 * Score FTP/kg: >= target = 100%, sinon ratio proportionnel
 */
function scoreFtpKg(ftpKg: number | null, targets: RaceTargets): number {
  if (ftpKg === null) return 40; // score neutre si manquant
  
  if (ftpKg >= targets.ftpKgTarget) {
    // Cap à 110% pour ne pas survaloriser
    const bonus = Math.min((ftpKg / targets.ftpKgTarget - 1) * 10, 10);
    return clamp(100 + bonus, 100, 110);
  }
  
  const ratio = ftpKg / targets.ftpKgTarget;
  return clamp(ratio * 100, 30, 99);
}

/**
 * Score Fraîcheur: basé sur fatigue_ok + séance spécifique + confiance
 */
function scoreFreshness(
  fatigueOk: boolean,
  seanceSpecifiqueValidee: boolean,
  avgConfidence: number
): number {
  let score = 70; // base
  
  if (fatigueOk) {
    score += 20;
  } else {
    score -= 30;
  }
  
  if (seanceSpecifiqueValidee) {
    score += 10;
  }
  
  // Pénalité si confiance faible
  if (avgConfidence < 0.5) {
    score -= 10;
  }
  
  return clamp(score, 0, 100);
}

// =============================================
// MAIN COMPUTE FUNCTION
// =============================================

/**
 * Calcule le score Race Readiness unifié
 * Pondéré par objectif, avec targets et messageStaff
 */
export function computeRaceReadinessEffectif(params: ComputeRaceReadinessParams): RaceReadinessEffectif {
  const {
    objectif,
    vlamaxEffectif,
    tteEffectif,
    ftp,
    poids,
    fatigue_ok = true,
    seance_specifique_validee = false,
    confidence: overrideConfidence,
  } = params;

  const reasonsMissing: string[] = [];
  
  // Récupérer les targets et weights pour l'objectif
  const targets = getTargets(objectif);
  const weights = getRaceWeights(objectif);

  // =====================
  // INPUTS
  // =====================
  const vlamax = vlamaxEffectif.value;
  const tte = tteEffectif.tte_min;
  const ftpKg = ftp && poids && poids > 0 ? ftp / poids : null;
  
  // Track missing data
  if (vlamax === null) {
    reasonsMissing.push("VLamax manquant");
  }
  if (tte === null || tteEffectif.source === "unknown") {
    reasonsMissing.push("TTE indisponible (ajouter TSS_7d ou TTE mesuré)");
  }
  if (!ftp) {
    reasonsMissing.push("FTP manquant");
  }
  if (!poids) {
    reasonsMissing.push("Poids manquant");
  }

  // =====================
  // SCORING (0-100 each)
  // =====================
  const vlamaxScore = scoreVLamax(vlamax, targets);
  const tteScore = scoreTTE(tte, targets);
  const ftpKgScore = scoreFtpKg(ftpKg, targets);
  
  const avgConfidence = overrideConfidence ?? (vlamaxEffectif.confidence + tteEffectif.confidence) / 2;
  const freshnessScore = scoreFreshness(fatigue_ok, seance_specifique_validee, avgConfidence);

  // =====================
  // WEIGHTED SCORE
  // =====================
  const rawScoreValue = (
    (vlamaxScore * weights.vlamax) +
    (tteScore * weights.tte) +
    (ftpKgScore * weights.ftpKg) +
    (freshnessScore * weights.freshness)
  ) / 100;
  
  // Apply confidence factor: score * (0.85 + 0.15 * confidence)
  const confidenceFactor = 0.85 + 0.15 * avgConfidence;
  const baseScore = Math.round(clamp(rawScoreValue * confidenceFactor, 0, 100));

  // =====================
  // CALCUL RISQUE NUTRITIONNEL + PLAFONNEMENT
  // =====================
  const nutritionEstimate = computeNutritionEstimate({
    vlamax,
    objectif,
    tteMin: tte,
    tteTarget: targets.tteTarget,
  });
  
  const nutritionalRiskIndex = nutritionEstimate?.nutritionalRiskIndex ?? null;
  const { cappedScore, wasCapped, capReason } = applyNutritionalCap(baseScore, nutritionalRiskIndex);
  
  const finalScore = cappedScore;

  // =====================
  // DETAILS (0-25 each)
  // =====================
  const details: RaceReadinessDetails = {
    vlamax: Math.round(vlamaxScore / 4),
    endurance: Math.round(tteScore / 4),
    puissance: Math.round(ftpKgScore / 4),
    fraicheur: Math.round(freshnessScore / 4),
  };

  // =====================
  // LABEL + COLOR
  // =====================
  let label: string;
  let color: "success" | "warning" | "destructive";
  
  if (finalScore >= 80) {
    label = "Race Ready!";
    color = "success";
  } else if (finalScore >= 60) {
    label = "En progression";
    color = "warning";
  } else {
    label = "Préparation requise";
    color = "destructive";
  }

  // Override si trop de données manquantes
  if (reasonsMissing.length >= 3) {
    label = "Données insuffisantes";
    color = "warning";
  }
  
  // Override label si plafonné par nutrition
  if (wasCapped) {
    label = `${label} (plafonné)`;
  }

  // =====================
  // MESSAGE STAFF
  // =====================
  const weakestScores = [
    { name: "VLamax", score: vlamaxScore },
    { name: "TTE (endurance)", score: tteScore },
    { name: "FTP/kg (puissance)", score: ftpKgScore },
    { name: "Fraîcheur", score: freshnessScore },
  ].sort((a, b) => a.score - b.score);
  
  const limitants = weakestScores.slice(0, 2).map(s => `${s.name} (${Math.round(s.score)}%)`);
  
  let messageStaff: string;
  if (reasonsMissing.length >= 2) {
    messageStaff = `Race Readiness partiel. Ajoutez un snapshot avec FTP, poids${!tte ? ", TSS_7d ou TTE mesuré" : ""} pour un calcul complet.`;
  } else {
    messageStaff = `Race Readiness = combinaison VLamax (moteur), TTE (endurance au seuil), FTP/kg (puissance relative) et fraîcheur. ` +
      `Pondération ajustée à l'objectif: ${objectif}. ` +
      `Points limitants: ${limitants.join(", ")}.`;
  }
  
  // Ajouter info plafonnement nutritionnel au message staff
  if (wasCapped && capReason) {
    messageStaff += ` ⚠️ ${capReason}`;
  }

  return {
    score: finalScore,
    rawScore: baseScore,
    label,
    color,
    details,
    targets,
    weights,
    confidence: avgConfidence,
    reasonsMissing,
    inputsUsed: {
      vlamax: { value: vlamax, source: vlamaxEffectif.source },
      tte: { value: tte, source: tteEffectif.source },
      ftpKg,
      fatigue_ok,
      seance_specifique: seance_specifique_validee,
    },
    messageStaff,
    nutritionalRiskIndex,
    wasCappedByNutrition: wasCapped,
    nutritionalCapReason: capReason,
  };
}

// =============================================
// HELPERS UI
// =============================================

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-destructive";
}

export function formatReadinessLabel(readiness: RaceReadinessEffectif): string {
  if (readiness.reasonsMissing.length >= 2) {
    return `${readiness.label} (partiel)`;
  }
  return readiness.label;
}

export function isReadinessComplete(readiness: RaceReadinessEffectif): boolean {
  return readiness.reasonsMissing.length === 0;
}

export function getObjectifLabel(objectif: string): string {
  const labels: Record<string, string> = {
    IM: "Ironman",
    Ironman: "Ironman",
    "703": "70.3 / Half",
    Half: "70.3 / Half",
    Marathon: "Marathon",
    Semi: "Semi-Marathon",
    Course: "Course",
    Trail: "Trail",
    TrailCourt: "Trail Court",
    TrailLong: "Trail Long / Ultra",
    Ultra: "Ultra",
  };
  return labels[objectif] || objectif;
}
