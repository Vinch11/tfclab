// =============================================
// RACE READINESS EFFECTIF - Source unique de vérité
// VERSION STAFF-GRADE - Two For Coaching Lab
// =============================================
// 
// DÉFINITION OFFICIELLE :
// Race Readiness est un indicateur composite d'adéquation physiologique
// entre le profil actuel de l'athlète et les exigences métaboliques de son objectif.
//
// IL SERT À :
// - Évaluer la cohérence du profil
// - Guider les décisions d'entraînement
// - Orienter les priorités physiologiques
//
// IL NE SERT PAS À :
// - Prédire une performance
// - Garantir un résultat
// - Remplacer le jugement du coach
//
// =============================================

import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { TTEEffectif } from "@/lib/tteEffectif";
import { computeNutritionEstimate, applyNutritionalCap, type NutritionalRiskIndex } from "@/lib/nutritionPredictive";
import { computeRunningEconomy, applyEconomyCap, type RunningEconomyResult, type EconomyLevel } from "@/lib/runningEconomy";

// =============================================
// DÉFINITION OFFICIELLE (pour affichage UI)
// =============================================

export const RACE_READINESS_METHODOLOGY = {
  title: "Race Readiness – Méthodologie",
  definition: `Race Readiness est un outil d'aide à la décision destiné aux coachs et staffs.
Il évalue la cohérence entre le profil physiologique actuel de l'athlète (VLamax, FTP, TTE) et les exigences métaboliques de son objectif.

Ce score ne constitue ni une prédiction de performance ni une garantie de résultat.
Il doit être interprété en tenant compte de la qualité des données disponibles et du contexte d'entraînement.

Un indice de confiance accompagne chaque score afin d'indiquer le niveau de robustesse de l'analyse.`,
  pillars: [
    {
      name: "VLamax effectif",
      description: "Indique la dominance glucidique vs lipidique. Interprété différemment selon la distance : une même valeur peut être positive ou négative selon l'objectif."
    },
    {
      name: "Puissance ou allure durable (FTP / Pace)",
      description: "Toujours interprétée en lien avec le TTE. Jamais utilisée seule."
    },
    {
      name: "TTE effectif",
      description: "Représente la tolérance à l'effort prolongé. Basé sur données observées ou estimées. Central pour longue distance."
    },
    {
      name: "Objectif sportif",
      description: "Ironman ≠ Sprint ≠ Marathon. La pondération des métriques dépend explicitement de l'objectif."
    }
  ],
  disclaimer: "Ce rapport guide la décision mais ne remplace pas un avis médical ni le jugement du coach."
};

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

// Interprétation de l'indice de confiance
export interface ConfidenceInterpretation {
  level: "robust" | "prudent" | "indicative";
  label: string;
  message: string;
}

export interface RaceReadinessEffectif {
  score: number;                 // 0-100 (après plafonnement nutritionnel + économie)
  rawScore: number;              // Score avant plafonnement
  label: string;                 // "Race Ready!", "En progression", etc.
  color: "success" | "warning" | "destructive";
  details: RaceReadinessDetails;
  targets: RaceTargets;
  weights: RaceWeights;
  confidence: number;            // 0-1 (moyenne des confidences)
  confidenceInterpretation: ConfidenceInterpretation; // Interprétation de la confiance
  reasonsMissing: string[];      // Liste des données manquantes
  inputsUsed: {
    vlamax: { value: number | null; source: string };
    tte: { value: number | null; source: string };
    ftpKg: number | null;
    fatigue_ok: boolean;
    seance_specifique: boolean;
  };
  messageStaff: string;          // Message explicatif staff-ready
  // Explication pédagogique "Pourquoi ce score ?"
  whyThisScore: string;          // Texte pédagogique pour l'athlète
  interpretation: {              // Interprétation staff détaillée
    status: "race_ready" | "almost_ready" | "in_progress" | "not_ready";
    statusLabel: string;
    mainStrengths: string[];
    mainLimitations: string[];
    priorityActions: string[];
  };
  // Propriétés pour le risque nutritionnel
  nutritionalRiskIndex: NutritionalRiskIndex | null;
  wasCappedByNutrition: boolean;
  nutritionalCapReason: string | null;
  // Propriétés pour l'économie de course (CAP)
  runningEconomy: RunningEconomyResult | null;
  wasCappedByEconomy: boolean;
  economyCapReason: string | null;
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
  // Paramètres pour l'économie de course (CAP)
  fcMax?: number | null;
  fcMoyenneEndurance?: number | null;
  allureEndurance?: number | null;
  deriveCardiaque?: number | null;
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
  // =============================================
  // PONDÉRATIONS STAFF-GRADE PAR OBJECTIF
  // =============================================
  
  // IRONMAN / ULTRA : VLamax et TTE critiques (économie métabolique = survie)
  // VLamax 40% + TTE 40% + FTP/kg 20% = 100% (Freshness intégré dans confiance)
  IM: { vlamax: 40, tte: 40, ftpKg: 15, freshness: 5 },
  Ironman: { vlamax: 40, tte: 40, ftpKg: 15, freshness: 5 },
  Ultra: { vlamax: 40, tte: 40, ftpKg: 15, freshness: 5 },
  TrailLong: { vlamax: 40, tte: 40, ftpKg: 15, freshness: 5 },
  
  // 70.3 / MARATHON : équilibré (VLamax 35% + TTE 35% + FTP/kg 30%)
  "703": { vlamax: 35, tte: 35, ftpKg: 25, freshness: 5 },
  Half: { vlamax: 35, tte: 35, ftpKg: 25, freshness: 5 },
  Marathon: { vlamax: 35, tte: 35, ftpKg: 25, freshness: 5 },
  Semi: { vlamax: 30, tte: 35, ftpKg: 30, freshness: 5 },
  
  // SPRINT / OLYMPIQUE / COURT : FTP/kg dominant (puissance critique)
  Sprint: { vlamax: 25, tte: 20, ftpKg: 50, freshness: 5 },
  Olympic: { vlamax: 25, tte: 25, ftpKg: 45, freshness: 5 },
  Course: { vlamax: 25, tte: 25, ftpKg: 45, freshness: 5 },
  TrailCourt: { vlamax: 30, tte: 30, ftpKg: 35, freshness: 5 },
  
  // Trail moyen : équilibré
  Trail: { vlamax: 35, tte: 40, ftpKg: 20, freshness: 5 },
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
// INTERPRETATION HELPERS (NOUVEAU)
// =============================================

interface InterpretationParams {
  score: number;
  objectif: string;
  vlamaxScore: number;
  tteScore: number;
  ftpKgScore: number;
  vlamax: number | null;
  tte: number | null;
  ftpKg: number | null;
  targets: RaceTargets;
  weights: RaceWeights;
  nutritionalRiskIndex: NutritionalRiskIndex | null;
  wasCappedByNutrition: boolean;
  wasCappedByEconomy: boolean;
  strengths: string[];
  limitants: string[];
}

function generateInterpretation(params: InterpretationParams): RaceReadinessEffectif["interpretation"] {
  const { score, strengths, limitants, vlamax, tte, ftpKg, targets, nutritionalRiskIndex, wasCappedByNutrition, wasCappedByEconomy } = params;
  
  // Statut - SEUILS STAFF-GRADE OFFICIELS
  // 80-100 : profil très cohérent avec l'objectif
  // 60-79 : cohérent mais perfectible
  // 40-59 : incohérences physiologiques notables
  // < 40 : profil non adapté à ce stade
  let status: "race_ready" | "almost_ready" | "in_progress" | "not_ready";
  let statusLabel: string;
  
  if (score >= 80) {
    status = "race_ready";
    statusLabel = "Profil très cohérent avec l'objectif";
  } else if (score >= 60) {
    status = "almost_ready";
    statusLabel = "Cohérent mais perfectible";
  } else if (score >= 40) {
    status = "in_progress";
    statusLabel = "Incohérences physiologiques notables";
  } else {
    status = "not_ready";
    statusLabel = "Profil non adapté à ce stade";
  }
  
  // Points forts
  const mainStrengths: string[] = [];
  if (strengths.includes("VLamax")) {
    mainStrengths.push("Profil métabolique adapté à la distance");
  }
  if (strengths.includes("TTE (endurance)")) {
    mainStrengths.push("Bonne capacité à maintenir l'effort");
  }
  if (strengths.includes("FTP/kg (puissance)")) {
    mainStrengths.push("Puissance relative suffisante");
  }
  if (strengths.includes("Fraîcheur")) {
    mainStrengths.push("État de fraîcheur optimal");
  }
  if (mainStrengths.length === 0) {
    mainStrengths.push("Données en cours d'acquisition");
  }
  
  // Limitations
  const mainLimitations: string[] = [];
  if (limitants.includes("VLamax") && vlamax !== null && vlamax > targets.vlamaxMax) {
    mainLimitations.push("VLamax trop élevé – dépendance glucidique excessive");
  }
  if (limitants.includes("TTE (endurance)") && tte !== null && tte < targets.tteTarget) {
    mainLimitations.push("TTE insuffisant – risque de dérive en course");
  }
  if (limitants.includes("FTP/kg (puissance)") && ftpKg !== null && ftpKg < targets.ftpKgTarget) {
    mainLimitations.push("FTP/kg en-dessous de la cible");
  }
  if (wasCappedByNutrition) {
    mainLimitations.push("Risque nutritionnel limitant");
  }
  if (wasCappedByEconomy) {
    mainLimitations.push("Économie de course à améliorer");
  }
  
  // Actions prioritaires
  const priorityActions: string[] = [];
  if (limitants.includes("VLamax") && vlamax !== null && vlamax > targets.vlamaxMax) {
    priorityActions.push("Travailler la réduction du VLamax (sorties longues, cadence basse)");
  }
  if (limitants.includes("TTE (endurance)") && tte !== null && tte < targets.tteTarget) {
    priorityActions.push("Augmenter le TTE (blocs 2x20, 3x30, progressifs)");
  }
  if (nutritionalRiskIndex && (nutritionalRiskIndex.level === 'high' || nutritionalRiskIndex.level === 'critical')) {
    priorityActions.push("Optimiser la stratégie nutritionnelle et tester en entraînement");
  }
  if (priorityActions.length === 0) {
    priorityActions.push("Maintenir le niveau actuel et affiner la stratégie de course");
  }
  
  return { status, statusLabel, mainStrengths, mainLimitations, priorityActions };
}

function generateWhyThisScore(params: Omit<InterpretationParams, "strengths" | "limitants">): string {
  const { score, objectif, vlamaxScore, tteScore, ftpKgScore, vlamax, tte, ftpKg, targets, weights, nutritionalRiskIndex, wasCappedByNutrition, wasCappedByEconomy } = params;
  
  const objectifLabel = getObjectifLabel(objectif);
  const isLongDistance = ["IM", "Ironman", "Ultra", "Marathon", "703", "Half", "TrailLong"].includes(objectif);
  
  // Message principal selon le score - SEUILS STAFF-GRADE OFFICIELS
  // 80-100 : profil très cohérent / 60-79 : cohérent mais perfectible / 40-59 : incohérences / < 40 : non adapté
  let mainMessage: string;
  if (score >= 80) {
    mainMessage = `Ta préparation pour ${objectifLabel} est solide. Ton profil physiologique correspond aux exigences de cette distance.`;
  } else if (score >= 60) {
    mainMessage = `Tu es sur la bonne voie pour ${objectifLabel}, mais certains ajustements peuvent encore optimiser ta cohérence physiologique.`;
  } else if (score >= 40) {
    mainMessage = `Ta préparation pour ${objectifLabel} présente des incohérences notables. Des points clés méritent une attention particulière.`;
  } else {
    mainMessage = `Ton profil actuel n'est pas adapté aux exigences de ${objectifLabel}. Le risque de sous-performance ou abandon est réel.`;
  }
  
  // Explication des facteurs limitants
  const explanations: string[] = [];
  
  if (isLongDistance && vlamax !== null && vlamax > targets.vlamaxMax) {
    explanations.push(`Ton VLamax (${vlamax.toFixed(2)}) est au-dessus de la cible (${targets.vlamaxMax}). Cela signifie que ton métabolisme dépend fortement des glucides, augmentant le risque d'épuisement énergétique sur longue distance.`);
  } else if (vlamax !== null && vlamaxScore >= 80) {
    explanations.push(`Ton VLamax (${vlamax.toFixed(2)}) est bien adapté à ton objectif.`);
  }
  
  if (tte !== null && tte < targets.tteTarget * 0.8) {
    explanations.push(`Ton TTE (${tte} min) est en-dessous de la cible (${targets.tteTarget} min). Ta capacité à maintenir l'intensité dans la durée est encore à développer.`);
  } else if (tte !== null && tteScore >= 80) {
    explanations.push(`Ton endurance au seuil (TTE ${tte} min) est solide pour cette distance.`);
  }
  
  if (ftpKg !== null && ftpKg < targets.ftpKgTarget * 0.9) {
    explanations.push(`Ta puissance relative (${ftpKg.toFixed(1)} W/kg) peut encore progresser vers la cible (${targets.ftpKgTarget} W/kg).`);
  }
  
  if (wasCappedByNutrition && nutritionalRiskIndex) {
    explanations.push(`⚠️ Le risque nutritionnel limite ton score. Ton profil métabolique exige une stratégie d'alimentation rigoureuse pour éviter l'épuisement glycogénique.`);
  }
  
  if (wasCappedByEconomy) {
    explanations.push(`🏃 Ton économie de course en CAP peut être améliorée pour optimiser la performance.`);
  }
  
  // Pondération
  const weightExplanation = `Pour ${objectifLabel}, la pondération est: VLamax ${weights.vlamax}%, TTE ${weights.tte}%, FTP/kg ${weights.ftpKg}%.`;
  
  return [mainMessage, ...explanations, weightExplanation].join("\n\n");
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
    // Params pour économie de course
    fcMax = null,
    fcMoyenneEndurance = null,
    allureEndurance = null,
    deriveCardiaque = null,
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
  const nutritionalCap = applyNutritionalCap(baseScore, nutritionalRiskIndex);
  
  let currentScore = nutritionalCap.cappedScore;

  // =====================
  // CALCUL ÉCONOMIE DE COURSE + PLAFONNEMENT (CAP uniquement)
  // =====================
  const runningEconomy = computeRunningEconomy({
    fcMax,
    fcMoyenneEndurance,
    allureEndurance,
    deriveCardiaque,
    tteMin: tte,
    objectif,
  });
  
  const economyCap = applyEconomyCap(currentScore, runningEconomy);
  currentScore = economyCap.cappedScore;
  
  const finalScore = currentScore;

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
  // LABEL + COLOR (seuils staff-grade OFFICIELS)
  // 80-100 : profil très cohérent | 60-79 : cohérent mais perfectible | 40-59 : incohérences | <40 : non adapté
  // =====================
  let label: string;
  let color: "success" | "warning" | "destructive";
  
  if (finalScore >= 80) {
    label = "Très cohérent";
    color = "success";
  } else if (finalScore >= 60) {
    label = "Cohérent";
    color = "warning";
  } else if (finalScore >= 40) {
    label = "Incohérent";
    color = "warning";
  } else {
    label = "Non adapté";
    color = "destructive";
  }

  // =====================
  // CONFIDENCE INTERPRETATION (obligatoire)
  // > 0.8 : score robuste | 0.6-0.8 : interprétation prudente | < 0.6 : indicatif uniquement
  // =====================
  let confidenceInterpretation: ConfidenceInterpretation;
  if (avgConfidence > 0.8) {
    confidenceInterpretation = {
      level: "robust",
      label: "Score robuste",
      message: "Les données sont suffisamment fiables pour une interprétation confiante."
    };
  } else if (avgConfidence >= 0.6) {
    confidenceInterpretation = {
      level: "prudent",
      label: "Interprétation prudente",
      message: "Certaines données sont estimées. L'interprétation reste valide mais doit être confirmée par de nouveaux tests."
    };
  } else {
    confidenceInterpretation = {
      level: "indicative",
      label: "Score indicatif",
      message: "Les données sont largement estimées. Ce score donne une tendance mais ne doit pas guider de décision majeure sans confirmation."
    };
  }

  // Override si trop de données manquantes
  if (reasonsMissing.length >= 3) {
    label = "Données insuffisantes";
    color = "warning";
  }
  
  // Override label si plafonné
  const wasCappedTotal = nutritionalCap.wasCapped || economyCap.wasCapped;
  if (wasCappedTotal) {
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
  
  const strongestScores = [...weakestScores].reverse();
  const limitants = weakestScores.slice(0, 2).map(s => `${s.name} (${Math.round(s.score)}%)`);
  const strengths = strongestScores.slice(0, 2).filter(s => s.score >= 70).map(s => s.name);
  
  let messageStaff: string;
  if (reasonsMissing.length >= 2) {
    messageStaff = `Race Readiness partiel. Ajoutez un snapshot avec FTP, poids${!tte ? ", TSS_7d ou TTE mesuré" : ""} pour un calcul complet.`;
  } else {
    messageStaff = `Race Readiness = combinaison VLamax (moteur), TTE (endurance au seuil), FTP/kg (puissance relative) et fraîcheur. ` +
      `Pondération ajustée à l'objectif: ${objectif}. ` +
      `Points limitants: ${limitants.join(", ")}.`;
  }
  
  // Ajouter info plafonnement nutritionnel au message staff
  if (nutritionalCap.wasCapped && nutritionalCap.capReason) {
    messageStaff += ` ⚠️ ${nutritionalCap.capReason}`;
  }
  
  // Ajouter info plafonnement économie au message staff
  if (economyCap.wasCapped && economyCap.capReason) {
    messageStaff += ` 🏃 ${economyCap.capReason}`;
  }

  // =====================
  // INTERPRETATION STAFF (NOUVEAU)
  // =====================
  const interpretation = generateInterpretation({
    score: finalScore,
    objectif,
    vlamaxScore,
    tteScore,
    ftpKgScore,
    vlamax,
    tte,
    ftpKg,
    targets,
    weights,
    nutritionalRiskIndex,
    wasCappedByNutrition: nutritionalCap.wasCapped,
    wasCappedByEconomy: economyCap.wasCapped,
    strengths,
    limitants: weakestScores.slice(0, 2).map(s => s.name),
  });

  // =====================
  // "POURQUOI CE SCORE ?" (PÉDAGOGIQUE)
  // =====================
  const whyThisScore = generateWhyThisScore({
    score: finalScore,
    objectif,
    vlamaxScore,
    tteScore,
    ftpKgScore,
    vlamax,
    tte,
    ftpKg,
    targets,
    weights,
    nutritionalRiskIndex,
    wasCappedByNutrition: nutritionalCap.wasCapped,
    wasCappedByEconomy: economyCap.wasCapped,
  });

  return {
    score: finalScore,
    rawScore: baseScore,
    label,
    color,
    details,
    targets,
    weights,
    confidence: avgConfidence,
    confidenceInterpretation,
    reasonsMissing,
    inputsUsed: {
      vlamax: { value: vlamax, source: vlamaxEffectif.source },
      tte: { value: tte, source: tteEffectif.source },
      ftpKg,
      fatigue_ok,
      seance_specifique: seance_specifique_validee,
    },
    messageStaff,
    whyThisScore,
    interpretation,
    nutritionalRiskIndex,
    wasCappedByNutrition: nutritionalCap.wasCapped,
    nutritionalCapReason: nutritionalCap.capReason,
    runningEconomy: runningEconomy.isApplicable ? runningEconomy : null,
    wasCappedByEconomy: economyCap.wasCapped,
    economyCapReason: economyCap.capReason,
  };
}

// =============================================
// HELPERS UI
// =============================================

// Couleurs basées sur seuils STAFF-GRADE : 80-100 / 60-79 / 40-59 / <40
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  if (score >= 40) return "text-orange-500";
  return "text-destructive";
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning";
  if (score >= 40) return "bg-orange-500";
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
