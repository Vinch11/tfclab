/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LORANG STRATEGY ENGINE – TFCL METHOD™
 * Two For Coaching Lab Official
 * 
 * Moteur décisionnel avancé transformant profil physiologique + disponibilité
 * en leviers d'entraînement concrets, inspirés de la méthodologie Dan Lorang.
 * 
 * PHILOSOPHIE :
 * - Ne cherche PAS la précision labo absolue
 * - Maximise la robustesse décisionnelle
 * - Explicite quoi faire / quoi éviter / pourquoi
 * - La décision coach prime sur l'algorithme
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';
import { type AerobicWeaknessDetail } from './unifiedLimiterDetection';
import {
  getVlamaxTarget as _getVlamaxTargetCanonical,
  type VlamaxTargetRange as _CanonicalVlamaxTargetRange,
} from './vlamaxTargets';

// Re-export pour usage externe
export type { AerobicWeaknessDetail };

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS PARTAGÉS — Source de vérité unique
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clamp un écart en pourcentage dans une plage physiologiquement plausible.
 * Jamais > 500% ou < -200% dans un rapport.
 */
export const clampPct = (v: number): number => {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-200, Math.min(500, v));
};

export type VlamaxTargetRange = _CanonicalVlamaxTargetRange;

/**
 * Re-export de la SOURCE UNIQUE des cibles VLamax.
 * ⚠️  Toute table locale de cibles VLamax est INTERDITE : passer par
 *    `src/lib/v2/vlamaxTargets.ts` (helper `getVlamaxTarget`).
 *
 * Signature identique à l'API canonique : cible UNIVERSELLE par distance,
 * indépendante de l'ambition (c'est la priorité du levier qui est modulée
 * par l'ambition, pas la cible physiologique).
 */
export function getVlamaxTarget(
  objectif: string | null | undefined,
  discipline: 'bike' | 'run' | 'swim' = 'bike',
): VlamaxTargetRange {
  return _getVlamaxTargetCanonical(objectif, discipline);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULATION AMBITION — Agressivité de la réduction VLamax (TFCL™)
// ═══════════════════════════════════════════════════════════════════════════════
// La CIBLE VLamax reste universelle (contrainte métabolique, `vlamaxTargets.ts`).
// Ce sont la SÉVÉRITÉ du déclenchement et l'AGRESSIVITÉ de la réponse qui
// varient selon l'ambition : un age-grouper n'a pas besoin d'un plan aussi
// restrictif qu'un competitor pour tirer un bénéfice réel.
// ─────────────────────────────────────────────────────────────────────────────

export type AmbitionLevelKey =
  | 'finisher' | 'age_group' | 'competitor' | 'elite' | 'world_class';

export type ReductionIntensity = 'soft' | 'firm';

/**
 * Multiplicateur au-delà duquel on considère la VLamax "trop haute" et où on
 * déclenche Sprint Ban + prescriptions restrictives. Plus l'ambition est
 * modeste, plus on est tolérant (on ne serre la vis que si l'écart est marqué).
 */
export function getVlamaxSprintBanMultiplier(
  ambition: AmbitionLevelKey | string | null | undefined,
): number {
  switch (ambition) {
    case 'finisher':    return Infinity;   // jamais (double garde-fou)
    case 'age_group':   return 1.25;       // large tolérance
    case 'competitor':  return 1.15;
    case 'elite':
    case 'world_class': return 1.10;       // calage fin
    default:            return 1.20;       // défaut prudent
  }
}

/**
 * Agressivité de la réponse "réduction VLamax" une fois le levier activé.
 *   soft : on augmente le Z2 progressivement, on garde de la variété, message
 *          encourageant (construire la base). Pas de Sprint Ban.
 *   firm : priorité forte au Z2, prohibitions actives, message strict.
 *
 * Point 4 : la DÉTECTION du limiteur glycolytique (vlamaxGap > 0.15) reste
 * inchangée — c'est un diagnostic. Mais un finisher/age_group diagnostiqué
 * glycolytique ne se voit pas imposer une réponse "firm".
 */
export function getReductionIntensity(
  ambition: AmbitionLevelKey | string | null | undefined,
): ReductionIntensity {
  return (ambition === 'competitor' || ambition === 'elite' || ambition === 'world_class')
    ? 'firm'
    : 'soft';
}




// ─────────────────────────────────────────────────────────────────────────────
// SCORING VLAMAX UNIFIÉ — source unique partagée par Potentiel & Compass
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Écart relatif VLamax / cible (centre de plage).
 * Positif = au-dessus de la cible (mauvais pour endurance).
 */
export function computeVlamaxGap(
  vlamax: number | null | undefined,
  objectif: string | null | undefined,
  discipline: 'bike' | 'run' | 'swim' = 'bike',
): number | null {
  if (vlamax == null || !Number.isFinite(vlamax) || vlamax <= 0) return null;
  const target = getVlamaxTarget(objectif, discipline);
  if (!target?.ideal || target.ideal <= 0) return null;
  return (vlamax - target.ideal) / target.ideal;
}

/**
 * Limiteur ALERTE : VLamax > 30% au-dessus de la cible idéale.
 * Utilisé pour capper le score VLamax dans le Potentiel Physiologique.
 */
export function isVlamaxAlertLimiter(
  vlamax: number | null | undefined,
  objectif: string | null | undefined,
  discipline: 'bike' | 'run' | 'swim' = 'bike',
): boolean {
  const gap = computeVlamaxGap(vlamax, objectif, discipline);
  return gap !== null && gap > 0.30;
}

/**
 * Score VLamax 0-100 unifié — utilisé par le Potentiel Physiologique ET le Compass.
 * Logique commune :
 *   - dans la plage [min, max]   → 80-100 (centré idéal = 100)
 *   - au-dessous du min          → 60 (sub-optimal, manque de glycolyse)
 *   - au-dessus du max           → décroît linéairement
 *   - si limiteur ALERTE (gap > 30%) → cap dur à 50
 */
export function computeVlamaxScore(
  vlamax: number | null | undefined,
  objectif: string | null | undefined,
  discipline: 'bike' | 'run' | 'swim' = 'bike',
): number {
  if (vlamax == null || !Number.isFinite(vlamax) || vlamax <= 0) return 0;
  const target = getVlamaxTarget(objectif, discipline);
  const { ideal, min, max } = target;

  let raw: number;
  if (vlamax <= min) {
    raw = 60;
  } else if (vlamax >= max) {
    const overflow = (vlamax - max) / Math.max(0.05, max);
    raw = Math.max(20, 70 - overflow * 100);
  } else {
    const distance = Math.abs(vlamax - ideal) / Math.max(0.001, max - min);
    raw = Math.round(100 - distance * 20);
  }

  if (isVlamaxAlertLimiter(vlamax, objectif, discipline)) {
    return Math.min(50, raw);
  }
  return Math.round(raw);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES PRINCIPAUX
// ═══════════════════════════════════════════════════════════════════════════════

export type LorangLimiter = 
  | 'motor'           // Limiteur moteur (VO2max)
  | 'glycolytic'      // Limiteur glycolytique (VLamax trop haute)
  | 'metabolic'       // Limiteur métabolique (FatMax / glycogène)
  | 'durability'      // Limiteur durabilité (TTE / robustesse)
  | 'neuromuscular'   // Limiteur neuromusculaire (force / économie)
  | 'availability';   // Limiteur disponibilité (fatigue / stress)

export type LorangLever = 
  | 'vo2_intervals'         // Intervalles VO2max (développement moteur)
  | 'z2_volume'             // Volume Z2 / Endurance longue
  | 'threshold_work'        // Travail au seuil (FTP/allure seuil)
  | 'force_max'             // Force Max (gym lourde)
  | 'sfr_force_endurance'   // SFR / Force Endurance
  | 'train_low'             // Train Low / Sleep Low
  | 'gut_training'          // Gut Training
  | 'heat_training'         // Heat Training
  | 'hrv_adaptation';       // HRV Rule-Based Adaptation

export type LorangProhibition = 
  | 'sprints'
  | 'micro_intervals'
  | 'erratic_pacing'
  | 'vo2_heavy_blocks'
  | 'train_low';

export type ConfidenceLevel = 'high' | 'moderate' | 'low';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LorangStrategyInput {
  // Données physiologiques
  physiology: {
    vo2max: number | null;
    vo2maxTarget: number;
    ftpKg: number | null;        // FTP/kg (expression aérobie)
    ftpKgTarget: number | null;  // Cible FTP/kg
    vlamax: number | null;
    vlamaxTarget: number;
    tte: number | null;
    tteTarget: number;
    fatmax: number | null;
    fatmaxTarget: number;
    economy: number | null;  // Score économie (0-100)
  };
  
  // Contexte athlète
  athlete: {
    age: number | null;
    discipline: 'IM' | '703' | 'marathon' | 'semi' | '10k' | 'cycling' | 'trail';
    ambition: 'finisher' | 'age_group' | 'competitor' | 'elite' | 'world_class';
    hasGIIssues: boolean;
  };
  
  // Disponibilité
  availability: {
    score: number;          // 0-100
    level: 'high' | 'moderate' | 'low' | 'critical';
    hasAlerts: boolean;
    hrvOutOfRange2Days: boolean;  // HRV hors plage 2 jours consécutifs
  };
  
  // Symptômes terrain (optionnel)
  symptoms?: {
    earlyBurn: boolean;        // Brûlure précoce
    lateExplosion: boolean;    // Explosion tardive
    heavyLegs: boolean;        // Jambes lourdes cardio OK
    digestiveIssues: boolean;  // Problèmes digestifs
    lowCeiling: boolean;       // Plafond bas
    hrDrift: boolean;          // Dérive cardiaque
    noExplosivity: boolean;    // Pas d'explosivité
  };
  
  // Contexte temporel
  context: {
    daysToRace: number | null;
    isRaceWeek: boolean;
    currentPhase: 'base' | 'build' | 'peak' | 'taper' | 'recovery';
  };
  
  // Données charge
  load?: {
    tss7d: number | null;
    tss28d: number | null;
  };
  
  // ✅ Résultat du moteur unifié de limiteurs (source unique de vérité)
  unifiedLimiterResult?: {
    primaryLimiter: string;
    gapAnalysis: Array<{
      metric: string;
      value: number | null;
      target: number;
      gapPercent: number;
      status: "optimal" | "acceptable" | "limiting" | "unknown";
      weightedImpact: number;
    }>;
    aerobicWeaknessDetail: AerobicWeaknessDetail;
  };
}

export interface LorangLeverActivation {
  lever: LorangLever;
  label: string;
  icon: string;
  priority: 1 | 2 | 3;  // 1 = prioritaire
  reason: string;
  prescription: string[];
  warnings: string[];
  isStaffOnly: boolean;
  safetyChecklist?: string[];
}

export interface LorangProhibitionRule {
  prohibition: LorangProhibition;
  label: string;
  reason: string;
  explanation: string;
}


export interface LorangStrategyResult {
  // Limiteur principal identifié
  primaryLimiter: LorangLimiter;
  limiterLabel: string;
  limiterIcon: string;
  limiterExplanation: string;
  
  // Détail faiblesse aérobie (si limiteur = motor)
  aerobicWeaknessDetail: AerobicWeaknessDetail;
  aerobicWeaknessLabel: string | null;
  
  // Leviers activés (max 3)
  activatedLevers: LorangLeverActivation[];
  
  // Interdictions actives
  prohibitions: LorangProhibitionRule[];
  hasSprintBan: boolean;
  
  // Niveau de confiance
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  confidenceReasons: string[];
  
  // Synthèse décision
  summary: {
    mainAction: string;
    whyThis: string;
    whyNotOthers: string;
  };
  
  // Message athlète
  athleteMessage: string;
  
  // Intégration templates
  templateSuggestion: {
    weekType: 'force' | 'endurance' | 'vo2' | 'recovery' | 'mixed';
    weekLabel: string;
    reasoning: string;
  };
  
  // Disclaimer
  disclaimer: string;
  
  // Version
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES LORANG OFFICIELLES
// ═══════════════════════════════════════════════════════════════════════════════

export const LORANG_PHILOSOPHY = {
  principle: "Un athlète n'est jamais optimisé sur tous les fronts simultanément. " +
    "L'art du coaching est de choisir LE bon levier au bon moment.",
  
  disclaimer: "TFCL ne cherche PAS la précision absolue d'un laboratoire. " +
    "TFCL cherche la décision la plus robuste pour orienter l'entraînement. " +
    "La décision coach prime toujours sur l'algorithme.",
  
  athleteExplanation: "Cette stratégie identifie ton facteur limitant principal " +
    "et les leviers prioritaires pour progresser. " +
    "Elle s'adapte à ton profil, ta disponibilité et tes objectifs.",
};

export const LIMITER_DEFINITIONS: Record<LorangLimiter, {
  label: string;
  icon: string;
  description: string;
  symptoms: string[];
}> = {
  motor: {
    label: "Moteur aérobie",
    icon: "🫁",
    description: "Le plafond aérobie (VO2max) limite la performance. " +
      "L'athlète manque de 'cylindrée' pour soutenir des intensités élevées.",
    symptoms: ["Plafond bas", "Incapacité à accélérer", "Essoufflement rapide"],
  },
  glycolytic: {
    label: "Métabolisme glycolytique",
    icon: "🔥",
    description: "La VLamax trop élevée consomme le glycogène trop rapidement. " +
      "L'athlète 's'explose' sur les efforts longs.",
    symptoms: ["Brûlure précoce", "Explosion tardive", "Fatigue fin de course"],
  },
  metabolic: {
    label: "Efficacité énergétique",
    icon: "⛽",
    description: "L'oxydation des lipides (FatMax) ou la gestion du glycogène limite. " +
      "L'athlète manque d'autonomie énergétique.",
    symptoms: ["Problèmes digestifs", "Mur énergétique", "Dépendance aux glucides"],
  },
  neuromuscular: {
    label: "Neuromusculaire",
    icon: "💪",
    description: "La force ou l'économie musculaire limite. " +
      "L'athlète 'pédale carré' ou manque de puissance spécifique.",
    symptoms: ["Jambes lourdes cardio OK", "Économie faible", "Manque de force"],
  },
  durability: {
    label: "Durabilité / TTE",
    icon: "🛡️",
    description: "La capacité à maintenir l'effort dans la durée (TTE) est insuffisante. " +
      "La performance se dégrade avant la fin de l'épreuve.",
    symptoms: ["Chute de puissance après 1-2h", "Dérive cardiaque", "Incapacité à finir fort"],
  },
  availability: {
    label: "Disponibilité",
    icon: "🔋",
    description: "La fatigue, le stress ou le manque de récupération limitent. " +
      "L'athlète ne peut pas absorber la charge nécessaire.",
    symptoms: ["Fatigue chronique", "HRV perturbée", "Stress élevé"],
  },
};

export const LEVER_DEFINITIONS: Record<LorangLever, {
  label: string;
  icon: string;
  description: string;
  isStaffOnly: boolean;
}> = {
  vo2_intervals: {
    label: "Intervalles VO₂max",
    icon: "🫁",
    description: "Développement du plafond aérobie via intervalles haute intensité (3-5min Z5, r3min)",
    isStaffOnly: false,
  },
  z2_volume: {
    label: "Volume Z2 / Endurance",
    icon: "🚴",
    description: "Développement de la base aérobie et de la durabilité via du volume en zone 2",
    isStaffOnly: false,
  },
  force_max: {
    label: "Force Max",
    icon: "🏋️",
    description: "Renforcement neuromusculaire en salle (85-95% 1RM, 3-5 reps)",
    isStaffOnly: false,
  },
  sfr_force_endurance: {
    label: "SFR / Force Endurance",
    icon: "⚙️",
    description: "Travail à basse cadence (40-60 rpm) en zone Sweet Spot/Tempo",
    isStaffOnly: false,
  },
  train_low: {
    label: "Train Low / Sleep Low",
    icon: "🌙",
    description: "Entraînement à jeun ou avec glycogène réduit",
    isStaffOnly: true,
  },
  gut_training: {
    label: "Gut Training",
    icon: "🍌",
    description: "Progression tolérance glucides (60→90→110 g/h)",
    isStaffOnly: false,
  },
  heat_training: {
    label: "Heat Training",
    icon: "🌡️",
    description: "Acclimatation chaleur (30-45 min stress thermique modéré)",
    isStaffOnly: false,
  },
  hrv_adaptation: {
    label: "Adaptation HRV",
    icon: "💓",
    description: "Remplacement séance clé par Z2 si HRV hors plage 2j consécutifs",
    isStaffOnly: false,
  },
  threshold_work: {
    label: "Travail au Seuil",
    icon: "⚡",
    description: "Intervalles et blocs au seuil lactique (FTP/allure seuil) pour améliorer la puissance soutenue",
    isStaffOnly: false,
  },
};

export const PROHIBITION_DEFINITIONS: Record<LorangProhibition, {
  label: string;
  reason: string;
}> = {
  sprints: {
    label: "Sprints",
    reason: "Augmenterait la VLamax, contre-productif pour l'objectif",
  },
  micro_intervals: {
    label: "Micro-intervalles explosifs",
    reason: "Sollicite le système glycolytique rapide",
  },
  erratic_pacing: {
    label: "Pacing erratique",
    reason: "Surconsommation glycogène par variations d'intensité",
  },
  vo2_heavy_blocks: {
    label: "Blocs VO2 lourds",
    reason: "Incompatible avec le travail de force max",
  },
  train_low: {
    label: "Train Low",
    reason: "Risque RED-S ou fatigue excessive dans ce contexte",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CIBLES FTP/KG PAR OBJECTIF ET AMBITION (pour détection faiblesse aérobie)
// ═══════════════════════════════════════════════════════════════════════════════

const FTP_KG_TARGETS: Record<string, Record<string, number>> = {
  IM:       { finisher: 2.5, age_group: 3.0, competitor: 3.5, elite: 4.0, world_class: 4.5 },
  '703':    { finisher: 2.8, age_group: 3.2, competitor: 3.8, elite: 4.3, world_class: 4.8 },
  marathon: { finisher: 2.0, age_group: 2.5, competitor: 3.0, elite: 3.5, world_class: 4.0 },
  semi:     { finisher: 2.2, age_group: 2.7, competitor: 3.2, elite: 3.7, world_class: 4.2 },
  '10k':    { finisher: 2.5, age_group: 3.0, competitor: 3.5, elite: 4.0, world_class: 4.5 },
  cycling:  { finisher: 3.0, age_group: 3.5, competitor: 4.0, elite: 4.5, world_class: 5.0 },
  trail:    { finisher: 2.2, age_group: 2.7, competitor: 3.2, elite: 3.7, world_class: 4.2 },
};

function getFtpKgTarget(discipline: string, ambition: string): number {
  return FTP_KG_TARGETS[discipline]?.[ambition] ?? FTP_KG_TARGETS['703'][ambition] ?? 3.0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSE FAIBLESSE AÉROBIE (VO2max vs FTP/kg)
// ═══════════════════════════════════════════════════════════════════════════════

function computeAerobicWeaknessDetail(
  input: LorangStrategyInput,
  limiter: LorangLimiter
): { detail: AerobicWeaknessDetail; label: string | null } {
  // Uniquement pertinent si le limiteur est "motor"
  if (limiter !== 'motor') {
    return { detail: 'none', label: null };
  }

  const { physiology, athlete } = input;
  const vo2max = physiology.vo2max;
  const ftpKg = physiology.ftpKg;
  const vo2maxTarget = physiology.vo2maxTarget;
  const ftpKgTarget = physiology.ftpKgTarget ?? getFtpKgTarget(athlete.discipline, athlete.ambition);

  // Calcul des gaps
  const vo2maxGap = vo2max !== null ? (vo2max - vo2maxTarget) / vo2maxTarget : null;
  const ftpKgGap = ftpKg !== null && ftpKgTarget > 0 
    ? (ftpKg - ftpKgTarget) / ftpKgTarget 
    : null;

  // Seuils: -10% = limite acceptable, en dessous = faiblesse
  const vo2maxLow = vo2maxGap !== null && vo2maxGap < -0.1;
  const ftpKgLow = ftpKgGap !== null && ftpKgGap < -0.1;

  if (vo2maxLow && ftpKgLow) {
    return {
      detail: 'both_low',
      label: 'Capacité aérobie (VO₂max) ET expression aérobie (FTP/kg) insuffisantes',
    };
  }

  if (vo2maxLow) {
    return {
      detail: 'vo2max_low',
      label: 'Capacité aérobie (VO₂max) insuffisante — plafond trop bas',
    };
  }

  if (ftpKgLow) {
    return {
      detail: 'ftp_kg_low',
      label: 'Expression aérobie (FTP/kg) insuffisante — rendement limité',
    };
  }

  // Si données manquantes mais limiteur moteur identifié
  if (vo2maxGap === null && ftpKgGap === null) {
    return {
      detail: 'none',
      label: 'Données insuffisantes pour préciser la faiblesse aérobie',
    };
  }

  return { detail: 'none', label: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIQUE D'IDENTIFICATION DU LIMITEUR
// ═══════════════════════════════════════════════════════════════════════════════

function identifyPrimaryLimiter(input: LorangStrategyInput): {
  limiter: LorangLimiter;
  reasons: string[];
  confidence: ConfidenceLevel;
} {
  // ✅ Si le résultat du moteur unifié est fourni, l'utiliser directement
  // Cela garantit la cohérence entre la carte "Facteurs Limitants" et les "Leviers d'Action"
  if (input.unifiedLimiterResult) {
    const unified = input.unifiedLimiterResult;
    const mappedLimiter = mapUnifiedToLorangLimiter(unified.primaryLimiter);
    
    // Construire les raisons depuis le gap analysis (inclure aussi les gaps "attention" s'il n'y a pas de "limiting")
    const limitingGapsForReasons = unified.gapAnalysis
      .filter(g => g.status === "limiting")
      .sort((a, b) => b.weightedImpact - a.weightedImpact);
    
    // ✅ FIX BUG TTE 59% sous/au-dessus : ne retenir comme "raison limitante" que les gaps
    // dont le signe correspond effectivement à une faiblesse pour la métrique considérée.
    // - "higher is better" (TTE, VO2max, FTP/kg, VMA, FatMax, W', Durabilité, Économie) : gap < -5%
    // - "lower is better"  (VLamax) : gap > +5%
    const isLowerIsBetterMetric = (m: string) => m === "VLamax";
    const isAttentionLimiting = (g: { metric: string; gapPercent: number }) => {
      const gp = g.gapPercent;
      if (isLowerIsBetterMetric(g.metric)) return gp >= 5;
      return gp <= -5;
    };
    const reasonGaps = limitingGapsForReasons.length > 0 
      ? limitingGapsForReasons 
      : unified.gapAnalysis
          .filter(isAttentionLimiting)
          .sort((a, b) => b.weightedImpact - a.weightedImpact);
    
    // ✅ FIX : phraser selon le SIGNE du gap et la sémantique de la métrique
    const formatGapReason = (g: { metric: string; gapPercent: number; value: number | null; target: number | null }) => {
    const abs = Math.abs(clampPct(g.gapPercent)).toFixed(0);
    if (isLowerIsBetterMetric(g.metric)) {
      // VLamax : un excès au-dessus de la cible = problème
      return g.gapPercent >= 0
        ? `${g.metric} ${abs}% au-dessus de la cible`
        : `${g.metric} ${abs}% sous la cible`;
    }
    // Métriques "plus = mieux" : en-dessous = problème
    return g.gapPercent < 0
        ? `${g.metric} ${abs}% sous la cible`
        : `${g.metric} ${abs}% au-dessus de la cible`;
    };
    const reasons = reasonGaps
      .slice(0, 3)
      .map(formatGapReason);

    
    // Calculer la confiance à partir de l'écart entre les 2 premiers limiteurs
    const gapClarity = limitingGapsForReasons.length > 1 
      ? Math.abs(limitingGapsForReasons[0].weightedImpact - limitingGapsForReasons[1].weightedImpact) 
      : limitingGapsForReasons.length === 1 ? 50 
      : 30; // Confiance réduite si aucun gap "limiting"
    const confidence: ConfidenceLevel = gapClarity > 20 ? 'high' : gapClarity > 10 ? 'moderate' : 'low';
    
    // ✅ FIX: Fallback raison basée sur le limiteur identifié (pas "profil équilibré" quand il y a un limiteur)
    const limiterDef = LIMITER_DEFINITIONS[mappedLimiter];
    const fallbackReason = mappedLimiter !== 'motor' || unified.primaryLimiter !== 'none'
      ? limiterDef.description
      : "Profil équilibré — pas de limiteur majeur";
    
    return {
      limiter: mappedLimiter,
      reasons: reasons.length > 0 ? reasons : [fallbackReason],
      confidence,
    };
  }
  
  // Fallback: détection locale (ancien comportement)
  const { physiology, symptoms } = input;
  const reasons: string[] = [];
  
  const vo2maxGap = physiology.vo2max !== null 
    ? (physiology.vo2max - physiology.vo2maxTarget) / physiology.vo2maxTarget 
    : null;
  const vlamaxGap = physiology.vlamax !== null 
    ? (physiology.vlamax - physiology.vlamaxTarget) / physiology.vlamaxTarget 
    : null;
  const tteGap = physiology.tte !== null 
    ? (physiology.tte - physiology.tteTarget) / physiology.tteTarget 
    : null;
  const fatmaxGap = physiology.fatmax !== null 
    ? (physiology.fatmax - physiology.fatmaxTarget) / physiology.fatmaxTarget 
    : null;
  
  const scores: { limiter: LorangLimiter; score: number; reason: string }[] = [];
  
  if (vo2maxGap !== null && vo2maxGap < -0.1) {
    scores.push({ limiter: 'motor', score: vo2maxGap * 100, reason: `VO2max ${Math.abs(clampPct(vo2maxGap * 100)).toFixed(0)}% sous la cible` });
  }
  if (vlamaxGap !== null && vlamaxGap > 0.15) {
    scores.push({ limiter: 'glycolytic', score: -vlamaxGap * 100, reason: `VLamax ${clampPct(vlamaxGap * 100).toFixed(0)}% au-dessus de la cible` });
  }
  if (fatmaxGap !== null && fatmaxGap < -0.15) {
    scores.push({ limiter: 'metabolic', score: fatmaxGap * 100, reason: `FatMax ${Math.abs(clampPct(fatmaxGap * 100)).toFixed(0)}% sous la cible` });
  }
  if (tteGap !== null && tteGap < -0.1) {
    scores.push({ limiter: 'durability', score: tteGap * 100, reason: `TTE ${Math.abs(clampPct(tteGap * 100)).toFixed(0)}% sous la cible (${physiology.tte}min vs ${physiology.tteTarget}min)` });
  }
  const economyScore = physiology.economy ?? 50;
  if (economyScore < 50) {
    scores.push({ limiter: 'neuromuscular', score: economyScore - 100, reason: `Économie faible (${economyScore}/100)` });
  }
  
  if (symptoms) {
    if (symptoms.earlyBurn || symptoms.lateExplosion) {
      const existing = scores.find(s => s.limiter === 'glycolytic');
      if (existing) existing.score -= 20;
      else scores.push({ limiter: 'glycolytic', score: -30, reason: "Symptômes glycolytiques terrain" });
    }
    if (symptoms.heavyLegs && !symptoms.hrDrift) {
      const existing = scores.find(s => s.limiter === 'neuromuscular');
      if (existing) existing.score -= 20;
      else scores.push({ limiter: 'neuromuscular', score: -30, reason: "Jambes lourdes mais cardio OK" });
    }
    if (symptoms.digestiveIssues) {
      const existing = scores.find(s => s.limiter === 'metabolic');
      if (existing) existing.score -= 15;
      else scores.push({ limiter: 'metabolic', score: -25, reason: "Problèmes digestifs déclarés" });
    }
    if (symptoms.lowCeiling || symptoms.noExplosivity) {
      const existing = scores.find(s => s.limiter === 'motor');
      if (existing) existing.score -= 15;
      else scores.push({ limiter: 'motor', score: -25, reason: "Plafond bas ou pas d'explosivité" });
    }
  }
  
  scores.sort((a, b) => a.score - b.score);
  
  if (scores.length === 0) {
    return { limiter: 'motor', reasons: ["Aucun limiteur identifié clairement — focus moteur par défaut"], confidence: 'low' };
  }
  
  const primary = scores[0];
  const allReasons = scores.slice(0, 3).map(s => s.reason);
  const gapClarity = scores.length > 1 ? Math.abs(scores[0].score - scores[1].score) : 50;
  const confidence: ConfidenceLevel = gapClarity > 20 ? 'high' : gapClarity > 10 ? 'moderate' : 'low';
  
  return { limiter: primary.limiter, reasons: allReasons, confidence };
}

// Mapping des limiteurs unifiés vers les limiteurs Lorang
function mapUnifiedToLorangLimiter(unified: string): LorangLimiter {
  const map: Record<string, LorangLimiter> = {
    aerobic_engine: 'motor',
    glycolytic: 'glycolytic',
    anaerobic_capacity: 'neuromuscular',
    specific_endurance: 'durability',
    metabolic_efficiency: 'metabolic',
    availability: 'motor', // Ne devrait jamais arriver (exclu par le moteur unifié)
    neuromuscular: 'neuromuscular',
    none: 'motor',
  };
  return map[unified] ?? 'motor';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVATION DES LEVIERS
// ═══════════════════════════════════════════════════════════════════════════════

function activateLevers(
  input: LorangStrategyInput,
  primaryLimiter: LorangLimiter
): LorangLeverActivation[] {
  const levers: LorangLeverActivation[] = [];
  const { physiology, athlete, availability, context } = input;
  
  // ✅ Utiliser le gap analysis du moteur unifié pour déterminer TOUS les gaps limitants
  const gaps = input.unifiedLimiterResult?.gapAnalysis ?? [];
  const limitingGaps = gaps
    .filter(g => g.status === "limiting")
    .sort((a, b) => b.weightedImpact - a.weightedImpact);
  
  // Helper: vérifier si une métrique est en gap limiting
  const isMetricLimiting = (metric: string) => limitingGaps.some(g => g.metric === metric);
  // ✅ FIX: Helper étendu — aussi considérer les gaps "attention" si c'est le limiteur principal
  const isMetricFromPrimaryLimiter = (metric: string, limiterTypes: LorangLimiter[]) => {
    if (!limiterTypes.includes(primaryLimiter)) return false;
    const gap = gaps.find(g => g.metric === metric);
    return gap != null && gap.gapPercent !== 0;
  };
  const getMetricGap = (metric: string) => gaps.find(g => g.metric === metric);
  
  // Déterminer le détail de faiblesse aérobie
  const aerobicDetail = input.unifiedLimiterResult?.aerobicWeaknessDetail 
    ?? computeAerobicWeaknessDetail(input, primaryLimiter).detail;
  const ftpKgLow = aerobicDetail === 'ftp_kg_low' || aerobicDetail === 'both_low';
  const vo2maxLow = aerobicDetail === 'vo2max_low' || aerobicDetail === 'both_low';
  
  // Fallback si pas de gap analysis disponible (ancienne logique)
  const useFallback = gaps.length === 0;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LEVIER: Intervalles VO₂max — Si VO2max est limitant
  // ═══════════════════════════════════════════════════════════════════════════
  const vo2maxIsLimiting = useFallback 
    ? primaryLimiter === 'motor'
    : (isMetricLimiting("VO2max") || isMetricFromPrimaryLimiter("VO2max", ['motor']) || (primaryLimiter === 'motor' && vo2maxLow));
  
  if (vo2maxIsLimiting && availability.level !== 'critical' && !context.isRaceWeek) {
    const vo2Gap = getMetricGap("VO2max");
    levers.push({
      lever: 'vo2_intervals',
      label: LEVER_DEFINITIONS.vo2_intervals.label,
      icon: LEVER_DEFINITIONS.vo2_intervals.icon,
      priority: primaryLimiter === 'motor' && vo2maxLow ? 1 : 2,
      reason: vo2Gap && vo2Gap.gapPercent < 0
        ? `VO₂max ${Math.abs(clampPct(vo2Gap.gapPercent)).toFixed(0)}% sous la cible (${vo2Gap.value} vs ${vo2Gap.target} ml/min/kg) — développer le plafond aérobie`

        : "Plafond aérobie limitant — développer VO₂max via intervalles haute intensité",
      prescription: [
        "5×4min Z5 r3min (classique Billat)",
        "3×8min Z4-Z5 r4min",
        "6×3min Z5 r3min",
        "2x/semaine max en phase Build",
      ],
      warnings: [
        "Ne pas combiner avec Force Max la même journée",
        "Récupération 48h entre séances clés",
      ],
      isStaffOnly: false,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVIER: Travail au seuil — Si FTP/kg ou VMA est limitant
  // ═══════════════════════════════════════════════════════════════════════════
  const ftpKgIsLimiting = useFallback 
    ? (primaryLimiter === 'motor' && ftpKgLow)
    : (isMetricLimiting("FTP/kg") || isMetricLimiting("VMA") || isMetricFromPrimaryLimiter("FTP/kg", ['motor']) || isMetricFromPrimaryLimiter("VMA", ['motor']) || ftpKgLow);
  
  if (ftpKgIsLimiting && availability.level !== 'critical' && !context.isRaceWeek) {
    const ftpGap = getMetricGap("FTP/kg") || getMetricGap("VMA");
    levers.push({
      lever: 'threshold_work',
      label: LEVER_DEFINITIONS.threshold_work.label,
      icon: LEVER_DEFINITIONS.threshold_work.icon,
      priority: (primaryLimiter === 'motor' && ftpKgLow) || isMetricLimiting("FTP/kg") || isMetricLimiting("VMA") ? 1 : 2,
      reason: ftpGap && ftpGap.gapPercent < 0
        ? `${ftpGap.metric} ${Math.abs(clampPct(ftpGap.gapPercent)).toFixed(0)}% sous la cible (${ftpGap.value?.toFixed(1)} vs ${ftpGap.target?.toFixed(1)}) — développer la puissance soutenue`

        : "FTP/kg insuffisant par rapport à la cible — développer l'expression aérobie via travail au seuil",
      prescription: [
        "2×20min au seuil (FTP/allure seuil)",
        "Sweet Spot 88-93% FTP / allure semi",
        "Intervalles tempo 10-20min",
        "Progression : durée au seuil +5min/semaine",
      ],
      warnings: [
        "Ne pas combiner avec blocs VO2max le même jour",
        "Récupération 48h entre séances clés",
      ],
      isStaffOnly: false,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVIER: Volume Z2 / Endurance — Si TTE, VLamax ou FatMax est limitant
  // ═══════════════════════════════════════════════════════════════════════════
  const tteIsLimiting = useFallback 
    ? primaryLimiter === 'durability'
    : (isMetricLimiting("TTE") || isMetricFromPrimaryLimiter("TTE", ['durability']));
  const vlamaxIsLimiting = useFallback 
    ? primaryLimiter === 'glycolytic'
    : (isMetricLimiting("VLamax") || isMetricFromPrimaryLimiter("VLamax", ['glycolytic']));
  const fatmaxIsLimiting = useFallback 
    ? primaryLimiter === 'metabolic'
    : (isMetricLimiting("FatMax") || isMetricFromPrimaryLimiter("FatMax", ['metabolic']));
  
  const shouldActivateZ2 = (tteIsLimiting || vlamaxIsLimiting || fatmaxIsLimiting) 
    && availability.level !== 'critical' && !context.isRaceWeek;

  if (shouldActivateZ2) {
    const tteGap = getMetricGap("TTE");
    const vlamaxGap = getMetricGap("VLamax");

    // Agressivité modulée par l'ambition (cible universelle inchangée).
    const ambition = (athlete as any).ambition || 'age_group';
    const reductionIntensity = getReductionIntensity(ambition);
    const isSoft = reductionIntensity === 'soft' && vlamaxIsLimiting && !tteIsLimiting;

    // Déterminer la raison principale
    let z2Reason: string;
    if (tteIsLimiting && tteGap && tteGap.gapPercent < 0) {
      z2Reason = `TTE ${Math.abs(clampPct(tteGap.gapPercent)).toFixed(0)}% sous la cible (${tteGap.value}min vs ${tteGap.target}min) — développer la durabilité`;

    } else if (vlamaxIsLimiting && vlamaxGap) {
      z2Reason = isSoft
        ? `VLamax ${Math.abs(clampPct(vlamaxGap.gapPercent)).toFixed(0)}% au-dessus de la cible — construire progressivement la base aérobie (approche douce, ambition ${ambition})`
        : `VLamax ${Math.abs(clampPct(vlamaxGap.gapPercent)).toFixed(0)}% au-dessus de la cible — volume Z2 pour abaisser la glycolyse`;
    } else {
      z2Reason = "Efficacité énergétique limitante — augmenter le volume aérobie de base";
    }

    const softPrescription = [
      "Ajouter 1 sortie Z2 longue/sem (1h30-2h vélo / 60-90min CAP)",
      "Garder de la variété : 1 séance intensité conservée/sem",
      "Z2 avec finish tempo léger 15-20min (progressif)",
      "Progression douce +5-8%/sem sur volume aérobie",
    ];
    const firmPrescription = tteIsLimiting
      ? [
          "Sorties longues Z2 progressives (2-4h vélo / 1h30-2h30 CAP)",
          "2×20-30min au seuil pour augmenter le TTE",
          "Z2 + bloc tempo final 20-30min",
          "Progression charge +10%/semaine max",
        ]
      : [
          "Sorties longues Z2 progressives (2-4h vélo / 1h30-2h30 CAP)",
          "Z2 + bloc tempo final 20-30min",
          "3-4 sorties Z2/semaine en phase Base",
        ];

    levers.push({
      lever: 'z2_volume',
      label: LEVER_DEFINITIONS.z2_volume.label,
      icon: LEVER_DEFINITIONS.z2_volume.icon,
      // Priorité abaissée en mode soft pour ne pas monopoliser tout le plan.
      priority: isSoft
        ? 2
        : (primaryLimiter === 'durability' || primaryLimiter === 'glycolytic' || primaryLimiter === 'metabolic') ? 1 : 2,
      reason: z2Reason,
      prescription: isSoft ? softPrescription : firmPrescription,
      warnings: isSoft
        ? [
            "Approche progressive — la base se construit sur 8-12 semaines",
            "Ne pas supprimer complètement l'intensité (variété maintenue)",
          ]
        : [
            "Progression volume max +10%/semaine",
            "Maintenir au moins 1 jour OFF ou récup active",
          ],
      isStaffOnly: false,
    });
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // LEVIER: Force Max — Si économie faible ou âge > 35 ou neuromusculaire limitant
  // ═══════════════════════════════════════════════════════════════════════════
  // LEVIER 1: Force Max
  const shouldActivateForceMax = (
    (athlete.age !== null && athlete.age > 35) ||
    (physiology.economy !== null && physiology.economy < 50) ||
    primaryLimiter === 'neuromuscular'
  ) && availability.level !== 'critical' && !context.isRaceWeek;
  
  if (shouldActivateForceMax) {
    levers.push({
      lever: 'force_max',
      label: LEVER_DEFINITIONS.force_max.label,
      icon: LEVER_DEFINITIONS.force_max.icon,
      priority: primaryLimiter === 'neuromuscular' ? 1 : 2,
      reason: athlete.age && athlete.age > 35 
        ? "Âge >35 ans — maintien force neuromusculaire essentiel"
        : "Économie faible — renforcement musculaire nécessaire",
      prescription: [
        "Gym lourde 85–95% 1RM",
        "3–5 répétitions par série",
        "2–3 séries max",
        "1–2x/semaine (hors semaines de course)",
      ],
      warnings: [
        "Ne pas combiner avec gros blocs VO2 la même semaine",
        "Récupération 48h minimum avant séance clé",
      ],
      isStaffOnly: false,
    });
  }
  
  // LEVIER 2: SFR / Force Endurance
  // Seuil modulé par l'ambition (mêmes multiplicateurs que Sprint Ban).
  const sfrAmbition = (athlete as any).ambition || 'age_group';
  const sfrMultiplier = getVlamaxSprintBanMultiplier(sfrAmbition);
  const sfrIntensity = getReductionIntensity(sfrAmbition);
  const shouldActivateSFR = (
    primaryLimiter === 'glycolytic' ||
    (physiology.vlamax !== null && physiology.vlamax > physiology.vlamaxTarget * sfrMultiplier)
  ) && availability.level !== 'critical';
  
  if (shouldActivateSFR) {
    const sfrSoft = sfrIntensity === 'soft';
    levers.push({
      lever: 'sfr_force_endurance',
      label: LEVER_DEFINITIONS.sfr_force_endurance.label,
      icon: LEVER_DEFINITIONS.sfr_force_endurance.icon,
      // Mode doux : priorité 2 (levier complémentaire, pas central).
      priority: sfrSoft ? 2 : (primaryLimiter === 'glycolytic' ? 1 : 2),
      reason: sfrSoft
        ? `VLamax un peu élevée — travail basse cadence en complément (approche progressive, ambition ${sfrAmbition})`
        : "VLamax élevée — travail basse cadence pour réduire sollicitation glycolytique",
      prescription: sfrSoft
        ? [
            "Cadence 50–65 rpm (transition douce)",
            "Zone tempo / Sweet Spot bas",
            "Blocs de 5–10 min",
            "1x/semaine max en phase Build",
          ]
        : [
            "Cadence 40–60 rpm",
            "Zone Sweet Spot / Tempo",
            "Blocs de 10–20 min",
            "2–3x/semaine en phase Build",
          ],
      warnings: [
        "Progression progressive de la durée",
        "Surveiller les tensions genoux",
      ],
      isStaffOnly: false,
    });
  }

  
  // LEVIER 3: Train Low (Staff Only)
  const isLongDistance = ['IM', '703', 'marathon', 'trail'].includes(athlete.discipline);
  const daysToRace = context.daysToRace ?? 999;
  const shouldActivateTrainLow = (
    isLongDistance &&
    availability.score > 60 &&
    daysToRace > 14 &&
    (primaryLimiter === 'metabolic' || primaryLimiter === 'glycolytic')
  );
  
  if (shouldActivateTrainLow) {
    levers.push({
      lever: 'train_low',
      label: LEVER_DEFINITIONS.train_low.label,
      icon: LEVER_DEFINITIONS.train_low.icon,
      priority: 3,
      reason: "Objectif longue distance — amélioration oxydation lipidique",
      prescription: [
        "Sorties à jeun ou glycogène réduit",
        "Max 1–2x/semaine",
        "Intensité Z1-Z2 uniquement",
        "Ravitaillement normal post-séance",
      ],
      warnings: [
        "⚠️ Protocole Staff uniquement",
        "Interdit <14j avant course",
        "Risque RED-S — surveiller signes",
      ],
      isStaffOnly: true,
      safetyChecklist: [
        "Pas de signes de sous-alimentation chronique",
        "Cycles hormonaux normaux (femmes)",
        "Pas de perte de poids non intentionnelle",
        "Sommeil et humeur stables",
      ],
    });
  }
  
  // LEVIER 4: Gut Training
  const shouldActivateGutTraining = (
    isLongDistance &&
    (athlete.hasGIIssues || input.symptoms?.digestiveIssues)
  ) && availability.level !== 'critical';
  
  if (shouldActivateGutTraining) {
    levers.push({
      lever: 'gut_training',
      label: LEVER_DEFINITIONS.gut_training.label,
      icon: LEVER_DEFINITIONS.gut_training.icon,
      priority: primaryLimiter === 'metabolic' ? 1 : 2,
      reason: "Problèmes GI ou objectif longue distance — entraînement tolérance glucides",
      prescription: [
        "Progression 60 → 90 → 110 g/h",
        "Simulation nutrition course sur sorties longues",
        "Tester différents produits",
        "Journal des tolérances",
      ],
      warnings: [
        "Progression sur 4-6 semaines minimum",
        "Ne pas forcer si nausées persistantes",
      ],
      isStaffOnly: false,
    });
  }
  
  // LEVIER 5: Heat Training (optionnel — activable si prépa chaleur)
  // Non activé par défaut, à intégrer sur demande
  
  // LEVIER 6: HRV Adaptation
  if (availability.hrvOutOfRange2Days) {
    levers.push({
      lever: 'hrv_adaptation',
      label: LEVER_DEFINITIONS.hrv_adaptation.label,
      icon: LEVER_DEFINITIONS.hrv_adaptation.icon,
      priority: 1,  // Toujours prioritaire si activé
      reason: "HRV hors plage 2 jours consécutifs — adaptation automatique",
      prescription: [
        "Remplacer séance clé par Z2 60-90min",
        "Maintenir durée, réduire intensité",
        "Réévaluer après 24-48h",
      ],
      warnings: [
        "Règle Lorang officielle",
        "Ne pas ignorer — risque surmenage",
      ],
      isStaffOnly: false,
    });
  }
  
  // Limiter à 4 leviers max, triés par priorité
  return levers
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RÈGLES D'INTERDICTION
// ═══════════════════════════════════════════════════════════════════════════════

function computeProhibitions(
  input: LorangStrategyInput,
  primaryLimiter: LorangLimiter,
  activatedLevers: LorangLeverActivation[]
): LorangProhibitionRule[] {
  const prohibitions: LorangProhibitionRule[] = [];
  const { physiology, athlete, availability } = input;
  
  const discipline = athlete.discipline;
  const ambition = (athlete as any).ambition || 'age_group';
  
  // Sprint Ban applies ONLY to long-distance disciplines where VLamax reduction is a goal
  // AND only for athletes with performance ambition (not Finisher)
  const isLongDistance = ['IM', '703', 'marathon', 'trail'].includes(discipline);
  const isSemiOrShorter = ['semi', '10K', '5K'].includes(discipline);
  const isFinisher = ambition === 'finisher';
  
  // For semi/shorter distances: sprints are BENEFICIAL (neuromuscular, economy) → NO Sprint Ban
  // For Finisher ambition: VLamax optimization is irrelevant → NO Sprint Ban
  const shouldCheckSprintBan = isLongDistance && !isFinisher;
  
  const vlamaxTooHigh = physiology.vlamax !== null && 
    physiology.vlamaxTarget > 0 &&
    physiology.vlamax > physiology.vlamaxTarget * 1.1;
  
  // Sprint Ban Mode — only for long distance + non-finisher + VLamax actually too high
  if (shouldCheckSprintBan && vlamaxTooHigh) {
    prohibitions.push({
      prohibition: 'sprints',
      label: PROHIBITION_DEFINITIONS.sprints.label,
      reason: PROHIBITION_DEFINITIONS.sprints.reason,
      explanation: "Les sprints sollicitent fortement le système glycolytique rapide, " +
        "ce qui augmenterait la VLamax. Or, pour un objectif longue distance, " +
        "on cherche à la réduire pour optimiser l'utilisation des lipides.",
    });
    
    prohibitions.push({
      prohibition: 'micro_intervals',
      label: PROHIBITION_DEFINITIONS.micro_intervals.label,
      reason: PROHIBITION_DEFINITIONS.micro_intervals.reason,
      explanation: "Les micro-intervalles explosifs (10-20s all-out) développent " +
        "la puissance glycolytique, incompatible avec l'objectif de réduction VLamax.",
    });
    
    prohibitions.push({
      prohibition: 'erratic_pacing',
      label: PROHIBITION_DEFINITIONS.erratic_pacing.label,
      reason: PROHIBITION_DEFINITIONS.erratic_pacing.reason,
      explanation: "Un pacing irrégulier (accélérations/décélérations) surconsomme " +
        "le glycogène par rapport à un effort régulier. Privilégier un effort constant.",
    });
  }
  
  // Interdiction blocs VO2 si Force Max activé
  const forceMaxActive = activatedLevers.some(l => l.lever === 'force_max');
  if (forceMaxActive) {
    prohibitions.push({
      prohibition: 'vo2_heavy_blocks',
      label: PROHIBITION_DEFINITIONS.vo2_heavy_blocks.label,
      reason: PROHIBITION_DEFINITIONS.vo2_heavy_blocks.reason,
      explanation: "Le travail de force max nécessite une récupération neuromusculaire " +
        "incompatible avec les blocs VO2 intensifs. Séparer ces stimuli dans le temps.",
    });
  }
  
  // Interdiction Train Low si disponibilité faible
  if (availability.level === 'low' || availability.level === 'critical') {
    prohibitions.push({
      prohibition: 'train_low',
      label: PROHIBITION_DEFINITIONS.train_low.label,
      reason: PROHIBITION_DEFINITIONS.train_low.reason,
      explanation: "La disponibilité actuelle ne permet pas les protocoles restrictifs. " +
        "Priorité à la récupération et à l'alimentation adéquate.",
    });
  }
  
  return prohibitions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUGGESTION TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

function suggestTemplateWeek(
  primaryLimiter: LorangLimiter,
  activatedLevers: LorangLeverActivation[],
  context: LorangStrategyInput['context']
): LorangStrategyResult['templateSuggestion'] {
  // Phase taper/recovery = toujours récup
  if (context.currentPhase === 'taper' || context.currentPhase === 'recovery') {
    return {
      weekType: 'recovery',
      weekLabel: "Semaine Récupération",
      reasoning: "Phase de récupération/affûtage — maintien sans surcharge",
    };
  }
  
  // Force Max prioritaire
  const forceMaxPriority = activatedLevers.find(l => l.lever === 'force_max' && l.priority === 1);
  if (forceMaxPriority) {
    return {
      weekType: 'force',
      weekLabel: "Semaine Force / Neuro",
      reasoning: "Limiteur neuromusculaire identifié — priorité au renforcement",
    };
  }
  
  // Limiteur moteur
  if (primaryLimiter === 'motor') {
    return {
      weekType: 'vo2',
      weekLabel: "Semaine Développement VO2",
      reasoning: "Plafond aérobie limitant — focus développement moteur",
    };
  }
  
  // Limiteur glycolytique
  if (primaryLimiter === 'glycolytic') {
    return {
      weekType: 'endurance',
      weekLabel: "Semaine Endurance / SFR",
      reasoning: "VLamax trop élevée — volume Z2 + travail force endurance",
    };
  }
  
  // Limiteur durabilité / TTE
  if (primaryLimiter === 'durability') {
    return {
      weekType: 'endurance',
      weekLabel: "Semaine Durabilité / TTE",
      reasoning: "TTE insuffisant — volume structuré + blocs au seuil pour renforcer la durabilité",
    };
  }

  // Limiteur métabolique
  if (primaryLimiter === 'metabolic') {
    return {
      weekType: 'endurance',
      weekLabel: "Semaine Endurance Métabolique",
      reasoning: "Efficacité énergétique limitante — focus Z2 long et FatMax",
    };
  }
  
  // Défaut
  return {
    weekType: 'mixed',
    weekLabel: "Semaine Équilibrée",
    reasoning: "Profil sans limiteur majeur — maintien des acquis",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export function computeLorangStrategy(input: LorangStrategyInput): LorangStrategyResult {
  // 1. Identification du limiteur
  const limiterResult = identifyPrimaryLimiter(input);
  const limiterDef = LIMITER_DEFINITIONS[limiterResult.limiter];
  
  // 2. Calcul du détail de faiblesse aérobie (si limiteur = motor)
  const aerobicAnalysis = computeAerobicWeaknessDetail(input, limiterResult.limiter);
  
  // 3. Activation des leviers
  const activatedLevers = activateLevers(input, limiterResult.limiter);
  
  // 4. Calcul des interdictions
  const prohibitions = computeProhibitions(input, limiterResult.limiter, activatedLevers);
  const hasSprintBan = prohibitions.some(p => p.prohibition === 'sprints');
  
  // 5. Suggestion template
  const templateSuggestion = suggestTemplateWeek(
    limiterResult.limiter, 
    activatedLevers, 
    input.context
  );
  
  // 6. Synthèse
  const primaryLever = activatedLevers[0];
  const summary = {
    mainAction: primaryLever 
      ? `Focus ${primaryLever.label}` 
      : "Maintenir l'équilibre actuel",
    whyThis: limiterResult.reasons[0] || "Profil équilibré",
    whyNotOthers: prohibitions.length > 0
      ? `Éviter: ${prohibitions.map(p => p.label).join(', ')}`
      : "Aucune contre-indication majeure",
  };
  
  // 7. Message athlète
  const athleteMessage = generateAthleteMessage(limiterResult.limiter, activatedLevers, hasSprintBan);
  
  // 8. Confiance globale
  const confidenceLabel = limiterResult.confidence === 'high' ? "Élevée"
    : limiterResult.confidence === 'moderate' ? "Modérée"
    : "Faible";
  
  // 9. Explication enrichie pour limiteur moteur
  const enrichedExplanation = limiterResult.limiter === 'motor' && aerobicAnalysis.label
    ? `${limiterDef.description} → ${aerobicAnalysis.label}`
    : limiterDef.description;
  
  return {
    primaryLimiter: limiterResult.limiter,
    limiterLabel: limiterDef.label,
    limiterIcon: limiterDef.icon,
    limiterExplanation: enrichedExplanation,
    
    aerobicWeaknessDetail: aerobicAnalysis.detail,
    aerobicWeaknessLabel: aerobicAnalysis.label,
    
    activatedLevers,
    
    prohibitions,
    hasSprintBan,
    
    confidence: limiterResult.confidence,
    confidenceLabel,
    confidenceReasons: limiterResult.reasons,
    
    summary,
    athleteMessage,
    templateSuggestion,
    
    disclaimer: LORANG_PHILOSOPHY.disclaimer,
    version: METHOD_VERSION_DISPLAY,
  };
}

function generateAthleteMessage(
  limiter: LorangLimiter,
  levers: LorangLeverActivation[],
  hasSprintBan: boolean
): string {
  const limiterMessages: Record<LorangLimiter, string> = {
    motor: "Ton plafond aérobie peut encore progresser. On va travailler ton 'moteur' avec des séances d'intensité ciblées.",
    glycolytic: "Ton système glycolytique consomme trop vite ton carburant. On va l'optimiser avec du travail d'endurance spécifique.",
    metabolic: "Ton efficacité énergétique peut progresser. Focus sur l'utilisation des lipides et la tolérance glucides.",
    durability: "Ta capacité à tenir l'effort dans la durée est insuffisante. On va renforcer ton TTE avec du volume structuré et du travail au seuil.",
    neuromuscular: "Tes muscles peuvent gagner en force et en économie. Un travail neuromusculaire ciblé va t'aider.",
    availability: "Ta récupération est prioritaire. On adapte le plan pour te permettre de régénérer avant de charger.",
  };
  
  let message = limiterMessages[limiter];
  
  if (hasSprintBan) {
    message += " On évite les sprints pour l'instant — ils iraient à l'encontre de ton objectif.";
  }
  
  if (levers.length > 0) {
    message += ` Levier principal : ${levers[0].label}.`;
  }
  
  return message;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS COMPLÉMENTAIRES
// ═══════════════════════════════════════════════════════════════════════════════

export function getAvailabilityLevel(score: number): 'high' | 'moderate' | 'low' | 'critical' {
  if (score >= 70) return 'high';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'low';
  return 'critical';
}

export function getAvailabilityEmoji(level: 'high' | 'moderate' | 'low' | 'critical'): string {
  switch (level) {
    case 'high': return '🟢';
    case 'moderate': return '🟡';
    case 'low': return '🟠';
    case 'critical': return '🔴';
  }
}
