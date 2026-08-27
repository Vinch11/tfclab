/**
 * =============================================
 * PERFORMANCE RANGES - PLAGES DE PERFORMANCE RÉALISTES
 * =============================================
 * 
 * Remplace la logique d'objectifs "absolus" par des PLAGES RÉALISTES
 * contextualisées selon : âge, profil métabolique, niveau, discipline.
 * 
 * PRINCIPE FONDAMENTAL:
 * Aucun écran ne doit afficher une "cible unique" sans plage.
 * La physiologie humaine fonctionne par plages de probabilité, pas par valeurs fixes.
 * 
 * STRUCTURE:
 * - Zone réaliste (12-24 mois) : atteignable avec entraînement régulier
 * - Zone ambitieuse : demande conditions optimales (volume, récupération, progression)
 * - Zone élite : statistiquement improbable sans génétique/volume exceptionnels
 */

import { getPerformanceAgeFactor, getTTEAgeFactor, getVo2maxAgeFactor } from "@/lib/v2/unifiedLimiterDetection";

// =============================================
// TYPES CENTRAUX
// =============================================

export type PerformanceMetric = "FTP_KG" | "FTP" | "TTE" | "VO2MAX" | "VLAMAX" | "VMA";

export interface PerformanceRangeContext {
  age: number | null;
  discipline: string;
  vlamaxEffectif: number | null;
  vo2max: number | null;
  weeklyVolume: number | null;
  currentValue: number | null;
  profileSummary?: string;
}

export interface RangeZone {
  min: number;
  max: number;
  label: string;
}

export interface PerformanceRange {
  metric: PerformanceMetric;
  unit: string;
  realistic: RangeZone;
  ambitious: RangeZone;
  elite: RangeZone;
  currentValue: number | null;
  context: PerformanceRangeContext;
  confidence: number;
  pedagogicalNote: string;
  warningNote?: string;
}

// =============================================
// TEXTE PÉDAGOGIQUE STANDARD
// =============================================

export const PERFORMANCE_RANGE_DISCLAIMER = `Ces plages tiennent compte de l'âge, du profil métabolique et du contexte d'entraînement.
Une valeur hors plage réaliste n'est pas impossible, mais statistiquement peu probable
sans conditions exceptionnelles (génétique, volume, historique).`;

export const WHY_NO_SINGLE_TARGET = `Parce que la physiologie humaine fonctionne par plages de probabilité,
pas par valeurs fixes. Two For Coaching Lab privilégie la précision réaliste
plutôt que la promesse irréaliste.`;

// =============================================
// AJUSTEMENTS CONTEXTUELS
// =============================================

// Note pédagogique par tranche d'âge. Les paliers (30/40/50/60 ans) et les
// libellés reprennent volontairement ceux de getPerformanceAgeFactor /
// getTTEAgeFactor / getVo2maxAgeFactor (unifiedLimiterDetection.ts) — ce
// fichier calculait auparavant ses propres deltas d'âge avec des paliers
// différents (40/45/50/55/60) et des magnitudes non alignées, produisant des
// plages contradictoires entre ce module (Dashboard) et le moteur de
// diagnostic pour un même âge. Les facteurs multiplicatifs canoniques sont
// désormais l'unique source, convertis en delta additif via ageDeltaFromFactor.
function getAgeAdjustmentNote(age: number | null): string {
  if (!age || age < 30) return "";
  if (age < 40) return `À ${age} ans, potentiel encore significatif.`;
  if (age < 50) return `À ${age} ans, potentiel encore significatif avec récupération adaptée.`;
  if (age < 60) return `À ${age} ans, progression possible mais modérée.`;
  return `À ${age} ans, les adaptations sont plus lentes. Privilégier la régularité.`;
}

// Convertit un facteur multiplicatif d'âge en delta additif sur une plage,
// à partir du point médian de la zone réaliste comme valeur de référence.
function ageDeltaFromFactor(referenceValue: number, factor: number): number {
  return referenceValue * (factor - 1);
}

interface VLamaxAdjustment {
  ftpKgDelta: number;
  tteDelta: number;
  note: string;
}

function getVLamaxAdjustment(vlamax: number | null, discipline: string): VLamaxAdjustment {
  if (!vlamax) return { ftpKgDelta: 0, tteDelta: 0, note: "" };
  
  const isLongDistance = ["IM", "Ironman", "Marathon", "Ultra", "TrailLong", "703", "Half"].includes(discipline);
  
  if (isLongDistance) {
    // VLamax basse = favorable pour longue distance
    if (vlamax <= 0.35) {
      return { 
        ftpKgDelta: 0.1, 
        tteDelta: 3, 
        note: "Profil métabolique favorable (VLamax basse)." 
      };
    }
    if (vlamax >= 0.50) {
      return { 
        ftpKgDelta: -0.1, 
        tteDelta: -3, 
        note: "VLamax élevée : plages ajustées vers le bas pour la longue distance." 
      };
    }
  } else {
    // Courte distance : VLamax haute pas pénalisante
    if (vlamax >= 0.55) {
      return { 
        ftpKgDelta: 0.05, 
        tteDelta: 0, 
        note: "Profil explosif cohérent avec distance courte." 
      };
    }
  }
  
  return { ftpKgDelta: 0, tteDelta: 0, note: "" };
}

function getVO2maxAdjustment(vo2max: number | null): { ftpKgDelta: number; note: string } {
  if (!vo2max) return { ftpKgDelta: 0, note: "" };
  
  if (vo2max >= 65) {
    return { ftpKgDelta: 0.15, note: "VO2max élevée : potentiel aérobie supérieur." };
  }
  if (vo2max >= 55) {
    return { ftpKgDelta: 0.05, note: "VO2max correcte." };
  }
  if (vo2max < 45) {
    return { ftpKgDelta: -0.1, note: "VO2max limitante : axe de travail prioritaire." };
  }
  
  return { ftpKgDelta: 0, note: "" };
}

// =============================================
// PLAGES DE BASE PAR DISCIPLINE (avant ajustements)
// =============================================

interface BasePlages {
  realistic: [number, number];
  ambitious: [number, number];
  elite: [number, number];
}

const FTP_KG_BASE_RANGES: Record<string, BasePlages> = {
  IM: { realistic: [3.8, 4.2], ambitious: [4.3, 4.6], elite: [4.7, 5.2] },
  Ironman: { realistic: [3.8, 4.2], ambitious: [4.3, 4.6], elite: [4.7, 5.2] },
  "703": { realistic: [4.0, 4.4], ambitious: [4.5, 4.8], elite: [4.9, 5.4] },
  Half: { realistic: [4.0, 4.4], ambitious: [4.5, 4.8], elite: [4.9, 5.4] },
  Marathon: { realistic: [3.5, 4.0], ambitious: [4.1, 4.4], elite: [4.5, 5.0] },
  Semi: { realistic: [3.7, 4.2], ambitious: [4.3, 4.6], elite: [4.7, 5.2] },
  Sprint: { realistic: [4.2, 4.6], ambitious: [4.7, 5.0], elite: [5.1, 5.6] },
  Olympic: { realistic: [4.0, 4.4], ambitious: [4.5, 4.8], elite: [4.9, 5.3] },
  Velo: { realistic: [3.8, 4.3], ambitious: [4.4, 4.8], elite: [4.9, 5.5] },
};

const TTE_BASE_RANGES: Record<string, BasePlages> = {
  IM: { realistic: [50, 60], ambitious: [61, 70], elite: [71, 85] },
  Ironman: { realistic: [50, 60], ambitious: [61, 70], elite: [71, 85] },
  "703": { realistic: [45, 55], ambitious: [56, 65], elite: [66, 75] },
  Half: { realistic: [45, 55], ambitious: [56, 65], elite: [66, 75] },
  Marathon: { realistic: [45, 55], ambitious: [56, 65], elite: [66, 75] },
  Semi: { realistic: [40, 48], ambitious: [49, 55], elite: [56, 65] },
  Sprint: { realistic: [30, 40], ambitious: [41, 50], elite: [51, 60] },
  Olympic: { realistic: [35, 45], ambitious: [46, 55], elite: [56, 65] },
  Velo: { realistic: [40, 50], ambitious: [51, 60], elite: [61, 75] },
};

const VLAMAX_BASE_RANGES: Record<string, BasePlages> = {
  IM: { realistic: [0.30, 0.45], ambitious: [0.25, 0.35], elite: [0.20, 0.30] },
  Ironman: { realistic: [0.30, 0.45], ambitious: [0.25, 0.35], elite: [0.20, 0.30] },
  "703": { realistic: [0.35, 0.50], ambitious: [0.30, 0.42], elite: [0.25, 0.35] },
  Half: { realistic: [0.35, 0.50], ambitious: [0.30, 0.42], elite: [0.25, 0.35] },
  Marathon: { realistic: [0.35, 0.50], ambitious: [0.30, 0.42], elite: [0.25, 0.38] },
  Semi: { realistic: [0.40, 0.55], ambitious: [0.35, 0.48], elite: [0.30, 0.42] },
  Sprint: { realistic: [0.50, 0.70], ambitious: [0.55, 0.75], elite: [0.60, 0.80] },
  Olympic: { realistic: [0.45, 0.60], ambitious: [0.40, 0.55], elite: [0.35, 0.50] },
  Velo: { realistic: [0.35, 0.50], ambitious: [0.30, 0.45], elite: [0.25, 0.40] },
};

const VO2MAX_BASE_RANGES: Record<string, BasePlages> = {
  IM: { realistic: [50, 58], ambitious: [59, 65], elite: [66, 75] },
  Ironman: { realistic: [50, 58], ambitious: [59, 65], elite: [66, 75] },
  "703": { realistic: [52, 60], ambitious: [61, 68], elite: [69, 78] },
  Half: { realistic: [52, 60], ambitious: [61, 68], elite: [69, 78] },
  Marathon: { realistic: [55, 62], ambitious: [63, 70], elite: [71, 82] },
  Semi: { realistic: [52, 60], ambitious: [61, 68], elite: [69, 78] },
  Sprint: { realistic: [55, 62], ambitious: [63, 70], elite: [71, 80] },
  Olympic: { realistic: [55, 62], ambitious: [63, 70], elite: [71, 80] },
  Velo: { realistic: [52, 60], ambitious: [61, 68], elite: [69, 80] },
};

// =============================================
// MOTEUR DE CALCUL DES PLAGES
// =============================================

export function computeFtpKgRange(context: PerformanceRangeContext): PerformanceRange {
  const discipline = context.discipline || "IM";
  const base = FTP_KG_BASE_RANGES[discipline] || FTP_KG_BASE_RANGES.IM;
  
  // Calcul des ajustements
  const ftpKgAgeDelta = ageDeltaFromFactor(
    (base.realistic[0] + base.realistic[1]) / 2,
    getPerformanceAgeFactor(context.age)
  );
  const vlamaxAdj = getVLamaxAdjustment(context.vlamaxEffectif, discipline);
  const vo2Adj = getVO2maxAdjustment(context.vo2max);

  const totalDelta = ftpKgAgeDelta + vlamaxAdj.ftpKgDelta + vo2Adj.ftpKgDelta;

  // Construction des notes
  const notes = [getAgeAdjustmentNote(context.age), vlamaxAdj.note, vo2Adj.note].filter(Boolean);
  const contextNote = notes.length > 0 
    ? notes.join(" ") 
    : "Plages standards pour le profil.";
  
  // Vérification warning si valeur actuelle dépasse ambitieux
  let warningNote: string | undefined;
  if (context.currentValue && context.currentValue > base.ambitious[1] + totalDelta) {
    warningNote = "⚠️ Objectif très exigeant – validation coach recommandée";
  }
  
  // Calcul de la confiance
  let confidence = 0.7;
  if (context.age) confidence += 0.1;
  if (context.vlamaxEffectif) confidence += 0.1;
  if (context.vo2max) confidence += 0.05;
  if (context.weeklyVolume) confidence += 0.05;
  
  return {
    metric: "FTP_KG",
    unit: "W/kg",
    realistic: {
      min: Math.round((base.realistic[0] + totalDelta) * 100) / 100,
      max: Math.round((base.realistic[1] + totalDelta) * 100) / 100,
      label: "Plage réaliste (12-24 mois)",
    },
    ambitious: {
      min: Math.round((base.ambitious[0] + totalDelta) * 100) / 100,
      max: Math.round((base.ambitious[1] + totalDelta) * 100) / 100,
      label: "Plage ambitieuse",
    },
    elite: {
      min: Math.round((base.elite[0] + totalDelta) * 100) / 100,
      max: Math.round((base.elite[1] + totalDelta) * 100) / 100,
      label: "Zone élite / improbable",
    },
    currentValue: context.currentValue,
    context,
    confidence: Math.min(confidence, 1),
    pedagogicalNote: contextNote,
    warningNote,
  };
}

export function computeTTERange(context: PerformanceRangeContext): PerformanceRange {
  const discipline = context.discipline || "IM";
  const base = TTE_BASE_RANGES[discipline] || TTE_BASE_RANGES.IM;
  
  const tteAgeDelta = ageDeltaFromFactor(
    (base.realistic[0] + base.realistic[1]) / 2,
    getTTEAgeFactor(context.age)
  );
  const vlamaxAdj = getVLamaxAdjustment(context.vlamaxEffectif, discipline);

  const totalDelta = tteAgeDelta + vlamaxAdj.tteDelta;

  const notes = [getAgeAdjustmentNote(context.age), vlamaxAdj.note].filter(Boolean);
  const contextNote = notes.length > 0 
    ? notes.join(" ") 
    : "Plages TTE standards pour le profil.";
  
  let warningNote: string | undefined;
  if (context.currentValue && context.currentValue > base.ambitious[1] + totalDelta) {
    warningNote = "⚠️ TTE très exigeant – nécessite volume conséquent";
  }
  
  let confidence = 0.65;
  if (context.age) confidence += 0.1;
  if (context.vlamaxEffectif) confidence += 0.15;
  
  return {
    metric: "TTE",
    unit: "min",
    realistic: {
      min: Math.round(base.realistic[0] + totalDelta),
      max: Math.round(base.realistic[1] + totalDelta),
      label: "Plage réaliste",
    },
    ambitious: {
      min: Math.round(base.ambitious[0] + totalDelta),
      max: Math.round(base.ambitious[1] + totalDelta),
      label: "Plage ambitieuse",
    },
    elite: {
      min: Math.round(base.elite[0] + totalDelta),
      max: Math.round(base.elite[1] + totalDelta),
      label: "Zone élite",
    },
    currentValue: context.currentValue,
    context,
    confidence: Math.min(confidence, 1),
    pedagogicalNote: contextNote,
    warningNote,
  };
}

export function computeVLamaxRange(context: PerformanceRangeContext): PerformanceRange {
  const discipline = context.discipline || "IM";
  const base = VLAMAX_BASE_RANGES[discipline] || VLAMAX_BASE_RANGES.IM;
  
  // Note: VLamax ranges are inverted for long distance (lower is better)
  const isLongDistance = ["IM", "Ironman", "Marathon", "Ultra", "TrailLong", "703", "Half"].includes(discipline);
  
  const contextNote = isLongDistance
    ? "Pour la longue distance, une VLamax plus basse favorise l'économie glycogène."
    : "Pour les distances courtes, une VLamax modérée à haute soutient la puissance.";
  
  let warningNote: string | undefined;
  if (isLongDistance && context.currentValue && context.currentValue > base.realistic[1]) {
    warningNote = "⚠️ VLamax élevée pour l'objectif – travail aérobie Z2 recommandé";
  }
  
  return {
    metric: "VLAMAX",
    unit: "mmol/L/s",
    realistic: {
      min: base.realistic[0],
      max: base.realistic[1],
      label: "Plage cohérente",
    },
    ambitious: {
      min: base.ambitious[0],
      max: base.ambitious[1],
      label: "Plage optimisée",
    },
    elite: {
      min: base.elite[0],
      max: base.elite[1],
      label: "Zone élite",
    },
    currentValue: context.currentValue,
    context,
    confidence: context.vlamaxEffectif ? 0.75 : 0.5,
    pedagogicalNote: contextNote,
    warningNote,
  };
}

export function computeVO2maxRange(context: PerformanceRangeContext): PerformanceRange {
  const discipline = context.discipline || "IM";
  const base = VO2MAX_BASE_RANGES[discipline] || VO2MAX_BASE_RANGES.IM;
  
  const totalDelta = ageDeltaFromFactor(
    (base.realistic[0] + base.realistic[1]) / 2,
    getVo2maxAgeFactor(context.age)
  );

  const contextNote = getAgeAdjustmentNote(context.age) || "Plages VO2max standards.";
  
  return {
    metric: "VO2MAX",
    unit: "ml/min/kg",
    realistic: {
      min: Math.round(base.realistic[0] + totalDelta),
      max: Math.round(base.realistic[1] + totalDelta),
      label: "Plage réaliste",
    },
    ambitious: {
      min: Math.round(base.ambitious[0] + totalDelta),
      max: Math.round(base.ambitious[1] + totalDelta),
      label: "Plage ambitieuse",
    },
    elite: {
      min: Math.round(base.elite[0] + totalDelta),
      max: Math.round(base.elite[1] + totalDelta),
      label: "Zone élite",
    },
    currentValue: context.currentValue,
    context,
    confidence: context.vo2max ? 0.85 : 0.5,
    pedagogicalNote: contextNote,
  };
}

// =============================================
// FONCTION UTILITAIRE GLOBALE
// =============================================

export function computePerformanceRange(
  metric: PerformanceMetric,
  context: PerformanceRangeContext
): PerformanceRange {
  switch (metric) {
    case "FTP_KG":
    case "FTP":
      return computeFtpKgRange(context);
    case "TTE":
      return computeTTERange(context);
    case "VLAMAX":
      return computeVLamaxRange(context);
    case "VO2MAX":
      return computeVO2maxRange(context);
    default:
      return computeFtpKgRange(context);
  }
}

// =============================================
// HELPER: Déterminer la zone où se trouve la valeur actuelle
// =============================================

export type PerformanceZone = "below" | "realistic" | "ambitious" | "elite" | "above";

export function getCurrentZone(value: number | null, range: PerformanceRange): PerformanceZone {
  if (value === null) return "below";
  
  // Pour VLamax en longue distance, inverser la logique (plus bas = mieux)
  const isVLamaxLongDistance = range.metric === "VLAMAX" && 
    ["IM", "Ironman", "Marathon", "Ultra", "TrailLong", "703", "Half"].includes(range.context.discipline);
  
  if (isVLamaxLongDistance) {
    if (value <= range.elite.max) return "elite";
    if (value <= range.ambitious.max) return "ambitious";
    if (value <= range.realistic.max) return "realistic";
    return "above"; // Trop haute pour l'objectif
  }
  
  // Logique standard (plus haut = mieux)
  if (value >= range.elite.min) return "elite";
  if (value >= range.ambitious.min) return "ambitious";
  if (value >= range.realistic.min) return "realistic";
  return "below";
}

// =============================================
// GÉNÉRATION DE TEXTE INTERPRÉTATIF
// =============================================

export function generateRangeInterpretation(range: PerformanceRange): string {
  const { metric, context, currentValue, realistic, ambitious, elite } = range;
  const { age, discipline, vlamaxEffectif, vo2max } = context;
  
  const metricLabel = {
    FTP_KG: "FTP/kg",
    FTP: "FTP",
    TTE: "TTE",
    VO2MAX: "VO2max",
    VLAMAX: "VLamax",
    VMA: "VMA",
  }[metric];
  
  const disciplineLabel = {
    IM: "Ironman",
    Ironman: "Ironman",
    "703": "70.3",
    Half: "Half Ironman",
    Marathon: "Marathon",
    Semi: "Semi-Marathon",
    Sprint: "Sprint",
    Olympic: "Olympique",
  }[discipline] || discipline;
  
  let text = "";
  
  // Contexte âge
  if (age) {
    text += `À ${age} ans, `;
  }
  
  // Contexte profil métabolique
  if (vlamaxEffectif !== null && vo2max !== null) {
    if (vlamaxEffectif <= 0.38 && vo2max >= 55) {
      text += "avec un profil métabolique favorable (VLamax basse, VO2max correcte), ";
    } else if (vlamaxEffectif >= 0.50) {
      text += "avec un VLamax élevé, ";
    }
  } else if (vlamaxEffectif !== null) {
    if (vlamaxEffectif <= 0.38) {
      text += "avec un VLamax bas, ";
    }
  }
  
  // Plages
  text += `un ${metricLabel} de ${realistic.min}–${realistic.max} ${range.unit} `;
  text += `est physiologiquement cohérent pour un objectif ${disciplineLabel}. `;
  
  // Zone ambitieuse/élite
  text += `Des valeurs de ${ambitious.min}–${ambitious.max} ${range.unit} sont ambitieuses. `;
  text += `Au-delà de ${elite.min} ${range.unit}, `;
  text += "cela nécessiterait une augmentation majeure du volume ou une génétique exceptionnelle.";
  
  return text;
}

// =============================================
// EXPORT DES CONSTANTES POUR L'ACADEMY
// =============================================

export const ACADEMY_RANGES_CHAPTER = {
  title: "Pourquoi Two For Coaching Lab ne fixe jamais d'objectifs uniques",
  sections: [
    {
      title: "Variabilité interindividuelle",
      content: `Deux athlètes avec le même âge, le même volume et le même objectif
n'auront pas les mêmes plages réalistes. La génétique, l'historique
d'entraînement et la capacité de récupération créent des différences majeures.`
    },
    {
      title: "Effet de l'âge",
      content: `À partir de 40 ans, le potentiel de progression ralentit.
À 50 ans, les gains sont plus lents et les cibles ajustées de 0.2 à 0.3 W/kg.
À 55+ ans, privilégier la régularité plutôt que l'absolu.`
    },
    {
      title: "Limites des modèles",
      content: `Aucun modèle ne peut prédire avec certitude le potentiel individuel.
Les plages proposées sont des probabilités statistiques, pas des promesses.
La physiologie réelle peut différer significativement des modèles.`
    },
    {
      title: "Dangers des objectifs irréalistes",
      content: `Un objectif trop ambitieux peut mener à :
- Surentraînement et blessures
- Démotivation et abandon
- Stratégies nutritionnelles inadaptées
- Contre-performance le jour J`
    }
  ]
};
