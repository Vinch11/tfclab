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
import { getAgeAdjustedTargets } from "@/lib/ageAdjustment";
import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";
import { getCRRTargets } from "@/lib/chargeRecenteReference";

// =============================================
// DÉFINITION OFFICIELLE (pour affichage UI)
// =============================================

// Type de sport pour Race Readiness différencié
export type RaceReadinessSport = "velo" | "course" | "triathlon";

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
// SPÉCIFICITÉ SPORT : VÉLO vs COURSE À PIED
// =============================================

export const SPORT_SPECIFICITY = {
  // VÉLO - Métabolisme dominant
  velo: {
    title: "Race Readiness – Vélo",
    contraintesClés: [
      "Contraction musculaire majoritairement concentrique",
      "Faible impact mécanique",
      "Possibilité d'optimiser le métabolisme par la cadence",
      "Nutrition plus facile à absorber"
    ],
    roleVLamax: "VLamax élevé → consommation glucidique élevée. Acceptable voire favorable sur formats courts. Fortement pénalisant sur longue distance (Ironman, ultra). En vélo, le VLamax est un levier stratégique ajustable par l'entraînement.",
    roleTTE: "Le TTE est central. Il conditionne la capacité à tenir une intensité stable. Étroitement lié à la charge chronique, la tolérance métabolique et la capacité nutritionnelle.",
    logique: "L'analyse repose principalement sur l'adéquation métabolique (VLamax, TTE, FTP) et la capacité à maintenir une intensité prolongée.",
    leviers: ["Cadence", "Nutrition", "Volume"],
    dominante: "Métabolisme",
    vlamaxModulabilite: "Élevée",
    pilierPrincipal: "TTE"
  },
  // COURSE À PIED - Biomécanique dominante
  course: {
    title: "Race Readiness – Course à Pied",
    contraintesClés: [
      "Contractions excentriques répétées",
      "Impacts mécaniques élevés",
      "Coût énergétique fortement dépendant de la technique",
      "Fatigue neuromusculaire limitante"
    ],
    roleVLamax: "VLamax élevé = coût énergétique plus élevé à allure donnée. Favorable uniquement sur formats très courts. Très pénalisant sur semi / marathon / ultra. En CAP, le VLamax est moins modulable que sur le vélo et plus risqué à manipuler.",
    roleTTE: "Le TTE seul est insuffisant. Il doit être interprété avec l'économie de course, la tolérance mécanique et la dérive cardiaque.",
    logique: "L'analyse intègre en priorité les contraintes biomécaniques, l'économie de course et la stabilité de l'effort, le VLamax jouant un rôle plus indirect.",
    leviers: ["Économie", "Technique", "Charge mécanique"],
    dominante: "Biomécanique",
    vlamaxModulabilite: "Limitée",
    pilierPrincipal: "Économie de course"
  },
  // TRIATHLON - Mixte
  triathlon: {
    title: "Race Readiness – Triathlon",
    contraintesClés: [
      "Enchaînement multi-sports",
      "Fatigue cumulative vélo → CAP",
      "Gestion nutritionnelle critique sur vélo",
      "Impact économie CAP après effort vélo"
    ],
    roleVLamax: "VLamax doit être optimisé pour le vélo (longue portion) tout en limitant l'impact négatif en CAP. Un VLamax trop élevé épuise les réserves glycogéniques sur vélo, compromettant la CAP.",
    roleTTE: "TTE vélo = pilier principal. TTE CAP conditionné par la fatigue résiduelle vélo et l'économie de course.",
    logique: "Score composite intégrant les exigences vélo (métabolisme) et CAP (biomécanique). L'athlète peut être limité sur l'un des deux.",
    leviers: ["Cadence vélo", "Économie CAP", "Nutrition", "Transition"],
    dominante: "Mixte",
    vlamaxModulabilite: "Moyenne",
    pilierPrincipal: "TTE vélo + Économie CAP"
  }
};

// Message UI pour la spécificité sport
export const SPORT_COMPARISON_TEXT = `Race Readiness – Spécificité Vélo vs Course à Pied

Race Readiness est spécifique au sport pratiqué.

En vélo, l'analyse repose principalement sur l'adéquation métabolique (VLamax, TTE, FTP) et la capacité à maintenir une intensité prolongée.

En course à pied, l'analyse intègre en priorité les contraintes biomécaniques, l'économie de course et la stabilité de l'effort, le VLamax jouant un rôle plus indirect.

Un athlète peut être prêt physiologiquement en vélo mais présenter des limitations en course à pied, ou inversement.`;

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
  isInsufficient: boolean;       // true si données critiques manquantes (VLamax, FTP, TTE)
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
    tss7d: number | null;
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
  // =============================================
  // NOUVEAUTÉ : Spécificité VÉLO vs CAP
  // =============================================
  sport: RaceReadinessSport;     // Sport principal détecté
  sportSpecificity: {
    title: string;               // "Race Readiness – Vélo" ou "– Course à Pied"
    dominante: string;           // "Métabolisme" ou "Biomécanique"
    pilierPrincipal: string;     // "TTE" ou "Économie de course"
    vlamaxModulabilite: string;  // "Élevée" ou "Limitée"
    contraintesClés: string[];   // Liste des contraintes
    roleVLamax: string;          // Explication du rôle VLamax pour ce sport
    roleTTE: string;             // Explication du rôle TTE pour ce sport
    leviers: string[];           // Leviers d'optimisation
    logique: string;             // Logique d'analyse
  };
}

// Score par sport (vélo vs CAP)
export interface SportSpecificScore {
  sport: RaceReadinessSport;
  score: number;
  label: string;
  color: "success" | "warning" | "destructive";
  interpretation: string;
  keyFactors: string[];
  limitations: string[];
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
  // ✅ Charge récente (TSS 7j) pour impact direct sur Fraîcheur
  tss7d?: number | null;
  // Paramètres pour l'économie de course (CAP)
  fcMax?: number | null;
  fcMoyenneEndurance?: number | null;
  allureEndurance?: number | null;
  deriveCardiaque?: number | null;
  // ✅ AJOUT: Paramètres pour cibles ajustées (unification avec Compass)
  athleteAge?: number | null;
  ambition?: AmbitionLevel;
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
// PONDÉRATIONS SPÉCIFIQUES PAR SPORT (VÉLO vs CAP)
// =============================================

// Objectifs considérés comme VÉLO (triathlon vélo dominant ou cyclisme pur)
const VELO_OBJECTIVES = ["IM", "Ironman", "703", "Half", "Sprint", "Olympic", "Cyclisme", "Gravel"];

// Objectifs considérés comme COURSE À PIED
const CAP_OBJECTIVES = ["Marathon", "Semi", "Course", "Trail", "TrailCourt", "TrailLong", "TrailMountain", "TrailUltra", "Ultra"];

// Objectifs TRIATHLON (les deux disciplines comptent)
const TRIATHLON_OBJECTIVES = ["IM", "Ironman", "703", "Half", "Sprint", "Olympic"];

/**
 * Détermine le sport principal pour Race Readiness
 */
export function getSportFromObjectif(objectif: string): RaceReadinessSport {
  if (CAP_OBJECTIVES.includes(objectif) && !TRIATHLON_OBJECTIVES.includes(objectif)) {
    return "course";
  }
  if (TRIATHLON_OBJECTIVES.includes(objectif)) {
    return "triathlon";
  }
  return "velo";
}

/**
 * Retourne true si l'objectif est principalement course à pied
 */
export function isRunningObjectif(objectif: string): boolean {
  return CAP_OBJECTIVES.includes(objectif);
}

/**
 * Retourne true si l'objectif est un triathlon
 */
export function isTriathlonObjectif(objectif: string): boolean {
  return TRIATHLON_OBJECTIVES.includes(objectif);
}

/**
 * Pondérations spécifiques VÉLO - Métabolisme dominant
 * Le TTE est le pilier principal, VLamax modulable par cadence
 */
const WEIGHTS_VELO: Record<string, RaceWeights> = {
  // Longue distance vélo : TTE et VLamax critiques
  IM: { vlamax: 40, tte: 45, ftpKg: 10, freshness: 5 },
  Ironman: { vlamax: 40, tte: 45, ftpKg: 10, freshness: 5 },
  "703": { vlamax: 35, tte: 40, ftpKg: 20, freshness: 5 },
  Half: { vlamax: 35, tte: 40, ftpKg: 20, freshness: 5 },
  // Format court vélo : FTP/kg domine
  Sprint: { vlamax: 20, tte: 25, ftpKg: 50, freshness: 5 },
  Olympic: { vlamax: 25, tte: 30, ftpKg: 40, freshness: 5 },
};

/**
 * Pondérations spécifiques CAP - Biomécanique dominante
 * L'économie de course impacte fortement le score
 * Le TTE doit être interprété avec l'économie
 */
const WEIGHTS_CAP: Record<string, RaceWeights> = {
  // Marathon / Ultra : VLamax pénalisant, économie critique
  Marathon: { vlamax: 30, tte: 30, ftpKg: 20, freshness: 5 }, // + 15% économie implicite
  Semi: { vlamax: 25, tte: 30, ftpKg: 30, freshness: 5 },
  // Trail : équilibré mais économie très importante
  Trail: { vlamax: 30, tte: 35, ftpKg: 20, freshness: 5 },
  TrailCourt: { vlamax: 25, tte: 25, ftpKg: 40, freshness: 5 },
  TrailLong: { vlamax: 35, tte: 35, ftpKg: 15, freshness: 5 },
  Ultra: { vlamax: 35, tte: 35, ftpKg: 15, freshness: 5 },
  Course: { vlamax: 20, tte: 25, ftpKg: 45, freshness: 5 },
};

/**
 * Retourne les pondérations adaptées au sport et à l'objectif
 */
export function getWeightsBySport(objectif: string, sport?: RaceReadinessSport): RaceWeights {
  const detectedSport = sport || getSportFromObjectif(objectif);
  
  if (detectedSport === "course") {
    return WEIGHTS_CAP[objectif] || WEIGHTS_BY_OBJECTIF[objectif] || DEFAULT_WEIGHTS;
  }
  if (detectedSport === "velo" || detectedSport === "triathlon") {
    return WEIGHTS_VELO[objectif] || WEIGHTS_BY_OBJECTIF[objectif] || DEFAULT_WEIGHTS;
  }
  
  return WEIGHTS_BY_OBJECTIF[objectif] || DEFAULT_WEIGHTS;
}

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Retourne les cibles physiologiques ajustées par âge et ambition
 * ✅ SOURCE UNIQUE DE VÉRITÉ: utilise getAgeAdjustedTargets pour synchronisation avec Compass
 */
export function getTargets(objectif: string, athleteAge?: number | null, ambition?: AmbitionLevel): RaceTargets {
  const baseTargets = TARGETS_BY_OBJECTIF[objectif] || DEFAULT_TARGETS;
  
  // ✅ FIX: Toujours utiliser les cibles ajustées par ambition (pas de fallback sur cibles statiques)
  // Utiliser DEFAULT_AMBITION si ambition non fournie
  const effectiveAmbition = ambition || DEFAULT_AMBITION;
  const adjusted = getAgeAdjustedTargets(objectif, athleteAge ?? null, effectiveAmbition);
  
  return {
    vlamaxMin: baseTargets.vlamaxMin,
    vlamaxMax: adjusted.vlamaxMax,
    vlamaxIdeal: adjusted.vlamaxOptimal,
    tteTarget: adjusted.tteTarget,
    ftpKgTarget: adjusted.ftpKgTarget,
  };
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
  if (vlamax === null) return 0; // Pas de score fictif sans donnée
  
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
  if (tte === null) return 0; // Pas de score fictif sans donnée
  
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
  if (ftpKg === null) return 0; // Pas de score fictif sans donnée
  
  if (ftpKg >= targets.ftpKgTarget) {
    // Cap à 110% pour ne pas survaloriser
    const bonus = Math.min((ftpKg / targets.ftpKgTarget - 1) * 10, 10);
    return clamp(100 + bonus, 100, 110);
  }
  
  const ratio = ftpKg / targets.ftpKgTarget;
  return clamp(ratio * 100, 30, 99);
}

/**
 * Score Fraîcheur: basé sur fatigue_ok + séance spécifique + confiance + charge réelle (TSS 7j)
 * La charge encodée impacte directement la fraîcheur :
 * - Charge dans la zone optimale → bonus
 * - Surcharge → pénalité proportionnelle
 * - Sous-charge → légère pénalité (désentraînement)
 */
function scoreFreshness(
  fatigueOk: boolean,
  seanceSpecifiqueValidee: boolean,
  avgConfidence: number,
  tss7d?: number | null,
  objectif?: string
): number {
  let score = 70; // base
  
  if (fatigueOk) {
    score += 15;
  } else {
    score -= 30;
  }
  
  if (seanceSpecifiqueValidee) {
    score += 10;
  }
  
  // ✅ Impact direct de la charge récente (TSS 7j)
  if (tss7d != null && tss7d > 0 && objectif) {
    const crrTargets = getCRRTargets(objectif);
    
    if (tss7d >= crrTargets.chargeMinimale && tss7d <= crrTargets.chargeOptimale) {
      // Zone optimale → bonus fraîcheur (charge bien dosée)
      score += 15;
    } else if (tss7d > crrTargets.chargeOptimale && tss7d <= crrTargets.chargeMaximale) {
      // Charge élevée mais acceptable → légère pénalité
      const excess = (tss7d - crrTargets.chargeOptimale) / (crrTargets.chargeMaximale - crrTargets.chargeOptimale);
      score -= Math.round(excess * 15); // -0 à -15
    } else if (tss7d > crrTargets.chargeMaximale) {
      // Surcharge → pénalité forte
      const overloadRatio = tss7d / crrTargets.chargeMaximale;
      score -= Math.round(Math.min((overloadRatio - 1) * 40, 35)); // -0 à -35
    } else if (tss7d < crrTargets.chargeMinimale) {
      // Sous-charge → pénalité modérée (désentraînement)
      const ratio = tss7d / crrTargets.chargeMinimale;
      score -= Math.round((1 - ratio) * 10); // -0 à -10
    }
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
    tss7d = null,
    // Params pour économie de course
    fcMax = null,
    fcMoyenneEndurance = null,
    allureEndurance = null,
    deriveCardiaque = null,
    // ✅ AJOUT: Paramètres pour cibles ajustées
    athleteAge = null,
    ambition,
  } = params;

  const reasonsMissing: string[] = [];
  
  // ✅ FIX: Récupérer les targets AVEC ajustement par âge et ambition
  const targets = getTargets(objectif, athleteAge, ambition);
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
  const freshnessScore = scoreFreshness(fatigue_ok, seance_specifique_validee, avgConfidence, tss7d, objectif);

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

  // =====================
  // SPÉCIFICITÉ SPORT (VÉLO vs CAP)
  // =====================
  const sport = getSportFromObjectif(objectif);
  const sportSpec = SPORT_SPECIFICITY[sport];

  const isInsufficient = vlamax === null && tte === null && ftpKg === null;

  return {
    score: finalScore,
    rawScore: baseScore,
    isInsufficient,
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
      tss7d: tss7d ?? null,
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
    // Spécificité sport
    sport,
    sportSpecificity: {
      title: sportSpec.title,
      dominante: sportSpec.dominante,
      pilierPrincipal: sportSpec.pilierPrincipal,
      vlamaxModulabilite: sportSpec.vlamaxModulabilite,
      contraintesClés: sportSpec.contraintesClés,
      roleVLamax: sportSpec.roleVLamax,
      roleTTE: sportSpec.roleTTE,
      leviers: sportSpec.leviers,
      logique: sportSpec.logique,
    },
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

// =============================================
// CONVERSION VERS SCORE ENVELOPE (Staff-Grade)
// =============================================

import { 
  ScoreEnvelope, 
  buildRaceReadinessEnvelope 
} from "./scoreEnvelope";

/**
 * Convertit un RaceReadinessEffectif en ScoreEnvelope universel
 */
export function toRaceReadinessEnvelope(
  readiness: RaceReadinessEffectif,
  objectif: string,
  vlamaxConfidence?: number,
  tteConfidence?: number,
  crrConfidence?: number
): ScoreEnvelope {
  // Générer les explications contextuelles
  const why: string[] = [
    `Score ${readiness.label} pour ${getObjectifLabel(objectif)}.`,
  ];
  
  if (readiness.reasonsMissing.length > 0) {
    why.push(`Données manquantes: ${readiness.reasonsMissing.slice(0, 2).join(", ")}`);
  }
  
  if (readiness.wasCappedByNutrition) {
    why.push(`⚠️ Score plafonné: ${readiness.nutritionalCapReason || "Risque nutritionnel"}`);
  }
  
  if (readiness.wasCappedByEconomy) {
    why.push(`🏃 Score plafonné: ${readiness.economyCapReason || "Économie de course"}`);
  }

  const recommendations: string[] = [];
  
  // Identifier les points faibles
  if (readiness.details.vlamax < 18) {
    recommendations.push("Améliorer le profil métabolique (VLamax)");
  }
  if (readiness.details.endurance < 18) {
    recommendations.push("Développer l'endurance au seuil (TTE)");
  }
  if (readiness.details.puissance < 18) {
    recommendations.push("Renforcer la puissance relative (FTP/kg)");
  }
  if (readiness.details.fraicheur < 15) {
    recommendations.push("Récupérer pour retrouver de la fraîcheur");
  }

  return buildRaceReadinessEnvelope(
    readiness.score,
    readiness.confidence,
    objectif,
    {
      why,
      recommendations,
      vlamaxConf: vlamaxConfidence,
      tteConf: tteConfidence,
      crrConf: crrConfidence,
    }
  );
}
