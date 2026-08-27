// =============================================
// SCORE ENVELOPE — FORMAT UNIVERSEL STAFF-GRADE
// Supprime l'illusion de précision, renforce la crédibilité scientifique
// =============================================
import { getVLamaxRange, getTTETargetByAmbition, normalizeObjective } from "@/lib/physiologicalTargets";
import type { AmbitionLevel } from "@/types/ambitionLevel";

/**
 * Source de la donnée
 */
export type ScoreSource = 
  | "MEASURED"   // 🔬 Données labo / test direct
  | "ESTIMATED"  // 🧪 Test terrain / estimation fiable
  | "MODELLED"   // 🧠 Modèle indirect / croisement
  | "DERIVED"    // 🔁 Calculé à partir d'autres métriques
  | "UNKNOWN";   // ❔ Données insuffisantes

/**
 * Label de confiance lisible
 */
export type ConfidenceLabel = "FAIBLE" | "MODÉRÉE" | "ÉLEVÉE";

/**
 * Enveloppe universelle pour tous les scores
 */
export interface ScoreEnvelope {
  metricId: string;
  label: string;
  value: number | null;
  range: { low: number; high: number } | null;
  unit?: string;
  source: ScoreSource;
  confidence: number; // 0..1
  confidenceLabel: ConfidenceLabel;
  uncertaintyNote: string;
  contextNote: string;
  why: string[];
  recommendations: string[];
}

/**
 * Plage simplifiée pour affichage athlète
 */
export interface ScoreRangeSummary {
  value: number | null;
  rangeText: string;
  confidenceText: string;
  simpleMessage: string;
}

// =============================================
// HELPERS
// =============================================

/**
 * Détermine le label de confiance à partir du score 0-1
 */
export function clampConfidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= 0.75) return "ÉLEVÉE";
  if (confidence >= 0.45) return "MODÉRÉE";
  return "FAIBLE";
}

/**
 * Formate une plage pour affichage
 */
export function formatRange(low: number, high: number, unit: string = ""): string {
  const suffix = unit ? ` ${unit}` : "";
  return `${low.toFixed(2)}–${high.toFixed(2)}${suffix}`;
}

/**
 * Formate une plage pour affichage entier
 */
export function formatRangeInt(low: number, high: number, unit: string = ""): string {
  const suffix = unit ? ` ${unit}` : "";
  return `${Math.round(low)}–${Math.round(high)}${suffix}`;
}

/**
 * Obtient la marge d'incertitude selon la métrique et la confiance
 */
export function getUncertaintyRange(
  metricId: string, 
  confidence: number
): { margin: number; note: string } {
  const margins: Record<string, { base: number; perConfidence: number }> = {
    vlamax: { base: 0.03, perConfidence: 0.12 },
    tte: { base: 3, perConfidence: 15 },
    potentielPhysiologique: { base: 10, perConfidence: 25 },
    robustesse: { base: 8, perConfidence: 20 },
    glycolyticRisk: { base: 10, perConfidence: 30 },
    capInjuryRisk: { base: 10, perConfidence: 25 },
    nutritionGh: { base: 10, perConfidence: 25 },
    ftpKg: { base: 0.1, perConfidence: 0.4 },
  };

  const config = margins[metricId] || { base: 5, perConfidence: 15 };
  const margin = config.base + (1 - confidence) * config.perConfidence;
  
  const note = confidence >= 0.75 
    ? "Marge d'erreur réduite grâce à des données de qualité."
    : confidence >= 0.45 
      ? "Marge d'erreur modérée — interpréter avec prudence."
      : "Marge d'erreur élevée — données insuffisantes.";

  return { margin, note };
}

/**
 * Cibles contextualisées par métrique et objectif
 */
export interface ContextTarget {
  min: number;
  max: number;
  ideal: number;
  note: string;
}

export function getContextTargets(
  metricId: string, 
  objectif: string, 
  age?: number | null,
  sport?: string,
  ambition?: AmbitionLevel
): ContextTarget | null {
  // VLamax targets — délègue à la source unique (physiologicalTargets.ts)
  // pour respecter à la fois l'objectif, le niveau d'ambition et le sport (offset CAP).
  if (metricId === "vlamax") {
    const range = getVLamaxRange(objectif, ambition, sport);
    const normalized = normalizeObjective(objectif);
    return {
      min: range.min,
      max: range.max,
      ideal: range.optimal,
      note: `Cible VLamax ${normalized}${ambition ? ` (${ambition})` : ""}${sport ? ` — sport ${sport}` : ""}`,
    };
  }

  // TTE targets (minutes) — délègue à la source unique (physiologicalTargets.ts),
  // comme la branche VLamax ci-dessus. Avant ce fix : table locale figée
  // (IM 55-70, 70.3 48-60, Marathon 45-60...) divergente de la cible
  // canonique réellement utilisée pour le verdict TTE (tteEffectif.ts via
  // ttePro.ts::getTTETarget) — pouvait afficher un verdict "cible atteinte"
  // et une note de contexte "cible non atteinte" sur la même carte pour le
  // même athlète (audit Batch 3).
  if (metricId === "tte") {
    const ideal = getTTETargetByAmbition(objectif, ambition, age ?? null);
    return {
      min: ideal,
      max: Math.round(ideal * 1.2),
      ideal,
      note: ambition ? `ambition ${ambition}` : "cible par défaut (age_group)",
    };
  }

  // FTP/kg targets avec ajustement âge
  if (metricId === "ftpKg") {
    let ageAdjustment = 0;
    if (age && age >= 50) ageAdjustment = -0.2;
    else if (age && age >= 40) ageAdjustment = -0.1;
    
    const baseTargets: Record<string, ContextTarget> = {
      IM: { min: 3.5, max: 4.5, ideal: 4.0, note: "IM: puissance relative endurance" },
      Ironman: { min: 3.5, max: 4.5, ideal: 4.0, note: "IM: puissance relative endurance" },
      "703": { min: 3.8, max: 4.8, ideal: 4.2, note: "70.3: puissance relative + endurance" },
      Marathon: { min: 3.2, max: 4.2, ideal: 3.7, note: "Marathon: référence CAP" },
      Semi: { min: 3.4, max: 4.4, ideal: 3.9, note: "Semi: référence CAP" },
    };
    
    const target = baseTargets[objectif] || baseTargets.IM;
    return {
      min: target.min + ageAdjustment,
      max: target.max + ageAdjustment,
      ideal: target.ideal + ageAdjustment,
      note: target.note + (age && age >= 40 ? ` (ajusté pour ${age} ans)` : ""),
    };
  }

  return null;
}

/**
 * Obtient les cibles FTP/kg par niveau (plausible / ambitieux / élite)
 */
export interface FtpKgLevelTargets {
  plausible: { min: number; max: number; label: string };
  ambitieux: { min: number; max: number; label: string };
  eliteImprobable: { min: number; max: number; label: string };
  warning: string;
}

export function getFtpKgLevelTargets(
  objectif: string,
  age?: number | null,
  currentFtpKg?: number | null
): FtpKgLevelTargets {
  let ageAdjustment = 0;
  let ageNote = "";
  
  if (age && age >= 55) {
    ageAdjustment = -0.3;
    ageNote = `À ${age} ans, les gains sont plus lents et les cibles ajustées.`;
  } else if (age && age >= 50) {
    ageAdjustment = -0.2;
    ageNote = `À ${age} ans, progression possible mais modérée.`;
  } else if (age && age >= 40) {
    ageAdjustment = -0.1;
    ageNote = `À ${age} ans, potentiel encore significatif.`;
  }

  const base = {
    IM: { plausible: [3.8, 4.2], ambitieux: [4.3, 4.6], elite: [4.7, 5.2] },
    "703": { plausible: [4.0, 4.4], ambitieux: [4.5, 4.8], elite: [4.9, 5.4] },
    Marathon: { plausible: [3.5, 4.0], ambitieux: [4.1, 4.4], elite: [4.5, 5.0] },
    Semi: { plausible: [3.7, 4.2], ambitieux: [4.3, 4.6], elite: [4.7, 5.2] },
  };

  const targets = base[objectif as keyof typeof base] || base.IM;

  return {
    plausible: {
      min: targets.plausible[0] + ageAdjustment,
      max: targets.plausible[1] + ageAdjustment,
      label: "Plausible à 12–24 mois",
    },
    ambitieux: {
      min: targets.ambitieux[0] + ageAdjustment,
      max: targets.ambitieux[1] + ageAdjustment,
      label: "Ambitieux",
    },
    eliteImprobable: {
      min: targets.elite[0] + ageAdjustment,
      max: targets.elite[1] + ageAdjustment,
      label: "Élite / improbable",
    },
    warning: ageNote || "Ces cibles sont indicatives et dépendent de nombreux facteurs individuels.",
  };
}

// =============================================
// BUILDERS — Création de ScoreEnvelope
// =============================================

/**
 * Crée un ScoreEnvelope pour VLamax
 */
export function buildVLamaxEnvelope(
  value: number | null,
  source: ScoreSource,
  confidence: number,
  objectif: string,
  details?: { why?: string[]; recommendations?: string[] }
): ScoreEnvelope {
  const { margin, note: uncertaintyNote } = getUncertaintyRange("vlamax", confidence);
  const targets = getContextTargets("vlamax", objectif);
  
  let range: { low: number; high: number } | null = null;
  if (value !== null) {
    range = {
      low: Math.max(0.10, value - margin),
      high: Math.min(1.20, value + margin),
    };
  }

  const contextNote = targets 
    ? `Cible ${objectif}: ${targets.min.toFixed(2)}–${targets.max.toFixed(2)} — ${targets.note}`
    : `Objectif ${objectif}`;

  // Générer les recommandations par défaut
  const defaultWhy: string[] = [];
  const defaultRecommendations: string[] = [];

  if (source === "MEASURED") {
    defaultWhy.push("Valeur issue d'un test lactate ou labo.");
  } else if (source === "ESTIMATED") {
    defaultWhy.push("Estimée via test terrain (sprint, rampe, etc.).");
    defaultRecommendations.push("Confirmer avec un test lactate pour plus de précision.");
  } else if (source === "MODELLED") {
    defaultWhy.push("Modélisée à partir de FTP, TTE et puissance max.");
    defaultRecommendations.push("Réaliser un test VLamax terrain pour confirmer.");
    defaultRecommendations.push("Interpréter avec prudence — marge d'erreur élevée.");
  } else {
    defaultWhy.push("Données insuffisantes pour calculer VLamax.");
    defaultRecommendations.push("Ajouter FTP, poids et puissance max dans le snapshot.");
    defaultRecommendations.push("Réaliser un test VLamax terrain.");
  }

  if (value !== null && targets) {
    if (value < targets.min) {
      defaultWhy.push(`VLamax basse (${value.toFixed(2)}) vs cible (${targets.min.toFixed(2)}).`);
      defaultRecommendations.push("Possibilité de travailler la puissance explosive si besoin.");
    } else if (value > targets.max) {
      defaultWhy.push(`VLamax haute (${value.toFixed(2)}) vs cible (${targets.max.toFixed(2)}).`);
      defaultRecommendations.push("Prioriser tempo long et Z2 pour réduire VLamax.");
    } else {
      defaultWhy.push(`VLamax dans la cible (${targets.min.toFixed(2)}–${targets.max.toFixed(2)}).`);
    }
  }

  return {
    metricId: "vlamax",
    label: "VLamax effectif",
    value,
    range,
    unit: "mmol/L/s",
    source,
    confidence,
    confidenceLabel: clampConfidenceLabel(confidence),
    uncertaintyNote,
    contextNote,
    why: details?.why || defaultWhy,
    recommendations: details?.recommendations || defaultRecommendations,
  };
}

/**
 * Crée un ScoreEnvelope pour TTE
 */
export function buildTTEEnvelope(
  value: number | null,
  source: ScoreSource,
  confidence: number,
  objectif: string,
  target?: number | null,
  details?: { why?: string[]; recommendations?: string[] }
): ScoreEnvelope {
  const { margin, note: uncertaintyNote } = getUncertaintyRange("tte", confidence);
  const targets = getContextTargets("tte", objectif);

  let range: { low: number; high: number } | null = null;
  if (value !== null) {
    range = {
      low: Math.max(20, value - margin),
      high: Math.min(90, value + margin),
    };
  }

  const defaultWhy: string[] = [];
  const defaultRecommendations: string[] = [];

  if (source === "MEASURED") {
    defaultWhy.push("TTE observé via test spécifique.");
  } else if (source === "ESTIMATED") {
    defaultWhy.push("TTE estimé via charge récente (TSS 7j).");
    defaultRecommendations.push("Valider avec un test TTE terrain pour plus de précision.");
  } else if (source === "MODELLED") {
    defaultWhy.push("TTE modélisé — données partielles.");
    defaultRecommendations.push("Renseigner TSS 7j ou réaliser un test TTE.");
  }

  // Le `target` externe (déjà résolu ambition/âge par tteEffectif.ts) fait
  // toujours autorité quand il est fourni — `targets.ideal` n'est qu'un
  // repli. contextNote DOIT dériver de cette même valeur résolue (et non
  // d'un second calcul séparé via `targets.min`/`targets.max`), sinon les
  // deux peuvent diverger et se contredire sur la même carte quand le
  // `target` externe et `getContextTargets` ne résolvent pas exactement au
  // même chiffre (ex. ambition non transmise à ce niveau).
  const actualTarget = target ?? targets?.ideal ?? 50;
  const contextNote = targets
    ? `Cible ${objectif} : durabilité ≥ ${actualTarget} min${targets.note ? ` — ${targets.note}` : ""}`
    : `Objectif ${objectif}`;
  if (value !== null) {
    if (value < actualTarget) {
      defaultWhy.push(`TTE insuffisant (${value} min) vs cible (${actualTarget} min).`);
      defaultRecommendations.push("Développer l'endurance au seuil : intervalles longs 88-95% FTP.");
    } else {
      defaultWhy.push(`TTE satisfaisant (${value} min ≥ cible ${actualTarget} min).`);
    }
  }

  return {
    metricId: "tte",
    label: "TTE effectif",
    value,
    range,
    unit: "min",
    source,
    confidence,
    confidenceLabel: clampConfidenceLabel(confidence),
    uncertaintyNote,
    contextNote,
    why: details?.why || defaultWhy,
    recommendations: details?.recommendations || defaultRecommendations,
  };
}

/**
 * Crée un ScoreEnvelope pour Potentiel Physiologique
 */
export function buildPotentielEnvelope(
  score: number,
  confidence: number,
  objectif: string,
  details?: { 
    why?: string[]; 
    recommendations?: string[];
    vlamaxConf?: number;
    tteConf?: number;
    crrConf?: number;
  }
): ScoreEnvelope {
  // Calcul de la marge selon confiance globale
  const globalConf = details 
    ? Math.min(confidence, details.vlamaxConf ?? 1, details.tteConf ?? 1, details.crrConf ?? 1)
    : confidence;
  
  let margin: number;
  if (globalConf >= 0.85) margin = 10;
  else if (globalConf >= 0.65) margin = 15;
  else if (globalConf >= 0.45) margin = 20;
  else margin = 25;

  const range = {
    low: Math.max(0, score - margin),
    high: Math.min(100, score + margin),
  };

  const uncertaintyNote = globalConf < 0.45 
    ? "⚠️ Score indicatif uniquement — confiance très faible."
    : globalConf < 0.65 
      ? "Score à interpréter avec prudence — marge ±15-20 points."
      : "Score fiable avec marge d'erreur réduite.";

  const defaultWhy = [
    "Score de cohérence entre capacités et objectif.",
    `Basé sur VLamax, TTE, FTP/kg et fraîcheur.`,
    globalConf < 0.65 ? "Confiance globale réduite par données manquantes." : "",
  ].filter(Boolean);

  const defaultRecommendations = score < 60 
    ? ["Analyser les axes limitants dans le détail.", "Compléter les données manquantes."]
    : score < 80 
      ? ["Travailler les axes faibles identifiés."]
      : ["Maintenir l'équilibre actuel.", "Affiner le détail sur les dernières semaines."];

  return {
    metricId: "potentielPhysiologique",
    label: "Potentiel Physiologique",
    value: score,
    range,
    unit: "%",
    source: "DERIVED",
    confidence: globalConf,
    confidenceLabel: clampConfidenceLabel(globalConf),
    uncertaintyNote,
    contextNote: `Indicateur de cohérence pour ${objectif} — pas une prédiction de performance.`,
    why: details?.why || defaultWhy,
    recommendations: details?.recommendations || defaultRecommendations,
  };
}

/**
 * Crée un ScoreEnvelope pour Nutrition (g/h)
 */
export function buildNutritionEnvelope(
  minGh: number | null,
  maxGh: number | null,
  confidence: number,
  riskLevel: "low" | "moderate" | "high" | "critical",
  objectif: string,
  details?: { why?: string[]; recommendations?: string[] }
): ScoreEnvelope {
  const value = minGh !== null && maxGh !== null ? (minGh + maxGh) / 2 : null;
  const range = minGh !== null && maxGh !== null 
    ? { low: minGh, high: maxGh }
    : null;

  const uncertaintyNote = confidence < 0.5 
    ? "Estimation grossière — tester en entraînement."
    : confidence < 0.75 
      ? "Estimation raisonnable — affiner selon tolérance."
      : "Estimation fiable basée sur profil métabolique.";

  const riskLabels = {
    low: "Risque faible",
    moderate: "Risque modéré",
    high: "Risque élevé",
    critical: "Risque critique",
  };

  const defaultWhy = [
    `Estimation basée sur VLamax et objectif ${objectif}.`,
    `Risque nutritionnel: ${riskLabels[riskLevel]}.`,
  ];

  const defaultRecommendations = riskLevel === "high" || riskLevel === "critical"
    ? ["Tester la tolérance glucidique en entraînement.", "Prévoir plan B nutritionnel."]
    : ["Valider les quantités sur sorties longues."];

  return {
    metricId: "nutritionGh",
    label: "Apport glucidique recommandé",
    value,
    range,
    unit: "g/h",
    source: "MODELLED",
    confidence,
    confidenceLabel: clampConfidenceLabel(confidence),
    uncertaintyNote,
    contextNote: `Pour ${objectif} — à adapter selon tolérance individuelle.`,
    why: details?.why || defaultWhy,
    recommendations: details?.recommendations || defaultRecommendations,
  };
}

/**
 * Crée un ScoreEnvelope pour Robustesse (Compass)
 */
export function buildRobustesseEnvelope(
  score: number,
  confidence: number,
  objectif: string,
  details?: { tteConf?: number; crrConf?: number; injuryRisk?: number }
): ScoreEnvelope {
  const globalConf = Math.min(confidence, details?.tteConf ?? 1, details?.crrConf ?? 1);
  
  let margin: number;
  if (globalConf >= 0.75) margin = 8;
  else if (globalConf >= 0.50) margin = 15;
  else margin = 20;

  const range = {
    low: Math.max(0, score - margin),
    high: Math.min(100, score + margin),
  };

  return {
    metricId: "robustesse",
    label: "Robustesse",
    value: score,
    range,
    unit: "/100",
    source: "DERIVED",
    confidence: globalConf,
    confidenceLabel: clampConfidenceLabel(globalConf),
    uncertaintyNote: globalConf < 0.50 ? "Données incomplètes — score indicatif." : "Score basé sur TTE, charge et risque blessure.",
    contextNote: `Axe robustesse du Compass pour ${objectif}.`,
    why: ["Combinaison TTE, charge récente et risque blessure."],
    recommendations: score < 60 ? ["Renforcer la durabilité via travail au seuil."] : [],
  };
}

/**
 * Crée un ScoreEnvelope pour Risque blessure CAP
 */
export function buildCAPRiskEnvelope(
  level: number, // 0-3
  confidence: number,
  details?: { vlamaxValue?: number | null; tteValue?: number | null }
): ScoreEnvelope {
  const score = level * 33; // 0, 33, 66, 100
  const { margin } = getUncertaintyRange("capInjuryRisk", confidence);
  
  const range = {
    low: Math.max(0, score - margin),
    high: Math.min(100, score + margin),
  };

  const levelLabels = ["Faible", "Modéré", "Élevé", "Critique"];
  const label = levelLabels[level] || "Inconnu";

  const hasData = details?.vlamaxValue != null || details?.tteValue != null;

  return {
    metricId: "capInjuryRisk",
    label: `Risque blessure CAP: ${label}`,
    value: score,
    range,
    unit: "/100",
    source: hasData ? "MODELLED" : "UNKNOWN",
    confidence,
    confidenceLabel: clampConfidenceLabel(confidence),
    uncertaintyNote: !hasData ? "⚠️ Données CAP manquantes — incertitude élevée." : "Basé sur profil VLamax/TTE.",
    contextNote: "Risque théorique de blessure liée à la charge en course à pied.",
    why: [
      `Niveau de risque: ${label} (${level}/3).`,
      details?.vlamaxValue != null ? `VLamax: ${details.vlamaxValue.toFixed(2)}` : "VLamax non renseignée.",
    ],
    recommendations: level >= 2 
      ? ["Réduire le volume CAP haute intensité.", "Surveiller signes de fatigue."]
      : [],
  };
}

// =============================================
// FORMATTERS POUR AFFICHAGE
// =============================================

/**
 * Formate un ScoreEnvelope pour affichage simple (mode ATHLÈTE)
 */
export function formatEnvelopeForAthlete(envelope: ScoreEnvelope): ScoreRangeSummary {
  const rangeText = envelope.range 
    ? envelope.metricId === "vlamax" || envelope.metricId === "ftpKg"
      ? `${envelope.range.low.toFixed(2)}–${envelope.range.high.toFixed(2)}`
      : `${Math.round(envelope.range.low)}–${Math.round(envelope.range.high)}`
    : "—";

  const confidenceText = envelope.confidenceLabel === "ÉLEVÉE" 
    ? "✓ Données fiables"
    : envelope.confidenceLabel === "MODÉRÉE"
      ? "⚡ Estimation"
      : "⚠️ À confirmer";

  const simpleMessage = envelope.recommendations[0] || envelope.contextNote;

  return {
    value: envelope.value,
    rangeText,
    confidenceText,
    simpleMessage,
  };
}

/**
 * Formate un ScoreEnvelope pour affichage staff complet
 */
export function formatEnvelopeForStaff(envelope: ScoreEnvelope): string {
  const valueStr = envelope.value !== null 
    ? envelope.metricId === "vlamax" || envelope.metricId === "ftpKg"
      ? envelope.value.toFixed(2)
      : String(Math.round(envelope.value))
    : "—";

  const rangeStr = envelope.range
    ? envelope.metricId === "vlamax" || envelope.metricId === "ftpKg"
      ? `(≈${envelope.range.low.toFixed(2)}–${envelope.range.high.toFixed(2)})`
      : `(≈${Math.round(envelope.range.low)}–${Math.round(envelope.range.high)})`
    : "";

  const sourceIcon = {
    MEASURED: "🔬",
    ESTIMATED: "🧪",
    MODELLED: "🧠",
    DERIVED: "🔁",
    UNKNOWN: "❔",
  }[envelope.source];

  const confLabel = envelope.confidence >= 0.8 ? "élevée" : envelope.confidence >= 0.6 ? "modérée" : envelope.confidence >= 0.4 ? "limitée" : "exploratoire";

  return `${valueStr} ${envelope.unit || ""} ${rangeStr} — ${sourceIcon} ${envelope.source.toLowerCase()} — fiabilité ${confLabel}`;
}

/**
 * Obtient l'icône de source
 */
export function getSourceIcon(source: ScoreSource): string {
  return {
    MEASURED: "🔬",
    ESTIMATED: "🧪",
    MODELLED: "🧠",
    DERIVED: "🔁",
    UNKNOWN: "❔",
  }[source];
}

/**
 * Obtient le label de source en français
 */
export function getSourceLabel(source: ScoreSource): string {
  return {
    MEASURED: "Mesuré",
    ESTIMATED: "Estimé",
    MODELLED: "Modélisé",
    DERIVED: "Calculé",
    UNKNOWN: "Inconnu",
  }[source];
}

/**
 * Obtient la classe CSS pour la confiance
 */
export function getConfidenceCssClass(confidence: number): string {
  if (confidence >= 0.75) return "text-green-600";
  if (confidence >= 0.45) return "text-yellow-600";
  return "text-red-600";
}

/**
 * Obtient la classe CSS pour le badge de confiance
 */
export function getConfidenceBadgeClass(confidence: number): string {
  if (confidence >= 0.75) return "bg-green-100 text-green-800";
  if (confidence >= 0.45) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}
