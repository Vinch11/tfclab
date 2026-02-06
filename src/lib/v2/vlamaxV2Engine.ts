/**
 * VLamax TFCL V2 Engine — Staff-Grade
 * 
 * Architecture:
 * - vlamax_raw: sortie mathématique brute (interne)
 * - vlamax_effective: clampée + lissée + contextualisée (visible UI/rapports)
 * 
 * Fonctionnalités:
 * 1. Bornage physiologique par sport (clamp obligatoire)
 * 2. Séparation raw vs effective
 * 3. Lissage EWMA anti-bruit (sauf tests protocolaires)
 * 4. Marge d'erreur calculée (±)
 * 5. Score de confiance obligatoire
 * 6. Journal de calibration (traçabilité)
 */

// =============================================
// TYPES
// =============================================

export type VLamaxV2Source = 
  | "test_labo"          // Mesure lactate lab → confiance 0.90-0.95
  | "test_terrain"       // Test terrain protocolaire validé → 0.70-0.80
  | "semaine_reference"  // Semaine de référence TFCL → 0.75
  | "estimation"         // Estimation continue (FTP/kg, Pmax/kg) → 0.40-0.60
  | "unknown";           // Aucune donnée

export type SportContext = "velo" | "cap" | "natation";

export interface VLamaxV2Result {
  /** Valeur brute issue du calcul (interne uniquement) */
  raw: number | null;
  /** Valeur effective: clampée + lissée (seule valeur affichée) */
  effective: number | null;
  /** Source de la donnée */
  source: VLamaxV2Source;
  /** Score de confiance [0-1] */
  confidence: number;
  /** Marge d'erreur ± en mmol/L/s */
  errorMargin: number;
  /** Plage: effective ± errorMargin */
  range: { low: number; high: number } | null;
  /** Label pour affichage */
  label: string;
  /** Verrouillée (mesure labo) */
  isLocked: boolean;
  /** Variation détectée nécessitant confirmation */
  variationWarning: boolean;
  /** Message de variation si applicable */
  variationMessage?: string;
  /** Sport concerné */
  sport: SportContext;
  /** Détails pour tooltip staff */
  details: string;
  /** Entrée de journal de calibration */
  calibrationLog: CalibrationLogEntry;
}

export interface CalibrationLogEntry {
  date: string;
  source: VLamaxV2Source;
  rawValue: number | null;
  effectiveValue: number | null;
  previousValue: number | null;
  variationPct: number | null;
  confidence: number;
  errorMargin: number;
  reason: string;
  sources: string[];
  smoothingApplied: boolean;
}

// =============================================
// CONSTANTES PHYSIOLOGIQUES
// =============================================

/** Bornes physiologiques par sport (mmol/L/s) */
export const PHYSIOLOGICAL_BOUNDS: Record<SportContext, { min: number; max: number }> = {
  velo:     { min: 0.20, max: 1.05 },
  cap:      { min: 0.20, max: 0.90 },
  natation: { min: 0.20, max: 0.85 },
};

/** Marges d'erreur de base par source */
const BASE_ERROR_MARGINS: Record<VLamaxV2Source, number> = {
  test_labo:          0.02,
  semaine_reference:  0.04,
  test_terrain:       0.04,
  estimation:         0.06,
  unknown:            0.10,
};

/** Seuil de variation pour déclencher un warning (15%) */
const VARIATION_THRESHOLD = 0.15;

/** EWMA alpha par défaut */
const EWMA_ALPHA = 0.3;

// =============================================
// CLAMP PHYSIOLOGIQUE
// =============================================

export function clampVLamax(value: number, sport: SportContext): number {
  const bounds = PHYSIOLOGICAL_BOUNDS[sport];
  return Math.max(bounds.min, Math.min(bounds.max, value));
}

// =============================================
// EWMA SMOOTHING
// =============================================

/**
 * Applique un lissage EWMA.
 * NE PAS appliquer si source = test_labo | semaine_reference | test_terrain protocolaire validé
 */
export function applyEWMA(
  newValue: number, 
  previousValue: number | null, 
  alpha: number = EWMA_ALPHA
): number {
  if (previousValue === null) return newValue;
  return alpha * newValue + (1 - alpha) * previousValue;
}

/** Détermine si le lissage doit être appliqué */
function shouldSmooth(source: VLamaxV2Source): boolean {
  // Pas de lissage pour les sources protocolaires fiables
  return source === "estimation";
}

// =============================================
// MARGE D'ERREUR
// =============================================

export interface ErrorMarginFactors {
  /** Nombre de sources concordantes (1-5) */
  sourceCount: number;
  /** Stabilité temporelle: écart-type des dernières valeurs normalisé [0-1, 0=stable] */
  temporalStability: number;
  /** Fraîcheur des données en jours */
  dataAgeDays: number;
}

/**
 * Calcule la marge d'erreur ajustée
 */
export function computeErrorMargin(
  source: VLamaxV2Source,
  factors?: Partial<ErrorMarginFactors>
): number {
  let margin = BASE_ERROR_MARGINS[source];
  
  if (!factors) return margin;
  
  const { sourceCount = 1, temporalStability = 0.5, dataAgeDays = 0 } = factors;
  
  // Bonus concordance: plus de sources → marge réduite
  if (sourceCount >= 3) margin *= 0.80;
  else if (sourceCount >= 2) margin *= 0.90;
  
  // Pénalité instabilité temporelle
  if (temporalStability > 0.7) margin *= 1.20;
  else if (temporalStability > 0.5) margin *= 1.10;
  
  // Pénalité données anciennes
  if (dataAgeDays > 56) margin *= 1.30;      // > 8 semaines
  else if (dataAgeDays > 28) margin *= 1.15;  // > 4 semaines
  else if (dataAgeDays > 14) margin *= 1.05;  // > 2 semaines
  
  // Borner la marge entre 0.01 et 0.12
  return Math.max(0.01, Math.min(0.12, Number(margin.toFixed(3))));
}

// =============================================
// SCORE DE CONFIANCE
// =============================================

export function computeConfidenceScore(
  source: VLamaxV2Source,
  factors?: Partial<ErrorMarginFactors>
): number {
  // Base par source
  const baseConfidence: Record<VLamaxV2Source, number> = {
    test_labo:          0.92,
    semaine_reference:  0.78,
    test_terrain:       0.75,
    estimation:         0.50,
    unknown:            0.15,
  };
  
  let confidence = baseConfidence[source];
  
  if (!factors) return confidence;
  
  const { sourceCount = 1, temporalStability = 0.5, dataAgeDays = 0 } = factors;
  
  // Bonus sources multiples
  if (sourceCount >= 3) confidence += 0.08;
  else if (sourceCount >= 2) confidence += 0.04;
  
  // Bonus stabilité
  if (temporalStability < 0.3) confidence += 0.05;
  else if (temporalStability > 0.7) confidence -= 0.08;
  
  // Pénalité ancienneté
  if (dataAgeDays > 56) confidence -= 0.15;
  else if (dataAgeDays > 28) confidence -= 0.08;
  else if (dataAgeDays > 14) confidence -= 0.03;
  
  return Math.max(0.10, Math.min(0.95, Number(confidence.toFixed(2))));
}

// =============================================
// DÉTECTION DE VARIATION
// =============================================

function detectVariation(
  newValue: number,
  previousValue: number | null
): { warning: boolean; message?: string; variationPct: number | null } {
  if (previousValue === null || previousValue === 0) {
    return { warning: false, variationPct: null };
  }
  
  const variationPct = Math.abs(newValue - previousValue) / previousValue;
  
  if (variationPct > VARIATION_THRESHOLD) {
    const direction = newValue > previousValue ? "hausse" : "baisse";
    return {
      warning: true,
      variationPct,
      message: `Variation ${direction} de ${(variationPct * 100).toFixed(0)}% détectée — à confirmer par un test`,
    };
  }
  
  return { warning: false, variationPct };
}

// =============================================
// MOTEUR PRINCIPAL
// =============================================

export interface VLamaxV2Input {
  /** Valeur VLamax brute calculée */
  rawValue: number | null;
  /** Source de la valeur */
  source: VLamaxV2Source;
  /** Sport pour le bornage */
  sport: SportContext;
  /** Valeur précédente connue (pour EWMA + détection variation) */
  previousEffective?: number | null;
  /** Facteurs pour marge d'erreur et confiance */
  factors?: Partial<ErrorMarginFactors>;
  /** Sources textuelles pour le journal */
  sourceLabels?: string[];
  /** Raison du recalcul */
  reason?: string;
}

/**
 * Calcul VLamax V2 staff-grade complet
 * raw → clamp → smooth (si applicable) → effective + confidence + errorMargin + log
 */
export function computeVLamaxV2(input: VLamaxV2Input): VLamaxV2Result {
  const {
    rawValue,
    source,
    sport,
    previousEffective = null,
    factors,
    sourceLabels = [],
    reason = "Recalcul automatique",
  } = input;

  // Cas null
  if (rawValue === null || !Number.isFinite(rawValue) || rawValue <= 0) {
    const log: CalibrationLogEntry = {
      date: new Date().toISOString(),
      source,
      rawValue: null,
      effectiveValue: null,
      previousValue: previousEffective ?? null,
      variationPct: null,
      confidence: 0.15,
      errorMargin: 0.10,
      reason: "Aucune donnée disponible",
      sources: sourceLabels,
      smoothingApplied: false,
    };

    return {
      raw: null,
      effective: null,
      source,
      confidence: 0.15,
      errorMargin: 0.10,
      range: null,
      label: "VLamax (non disponible)",
      isLocked: false,
      variationWarning: false,
      sport,
      details: "Aucune donnée exploitable pour estimer la VLamax.",
      calibrationLog: log,
    };
  }

  // 1. Clamp physiologique
  const clamped = clampVLamax(rawValue, sport);

  // 2. Lissage EWMA (sauf sources protocolaires)
  const smooth = shouldSmooth(source);
  const effective = smooth
    ? clampVLamax(applyEWMA(clamped, previousEffective), sport)
    : clamped;

  // 3. Confiance
  const confidence = computeConfidenceScore(source, factors);

  // 4. Marge d'erreur
  const errorMargin = computeErrorMargin(source, factors);

  // 5. Plage
  const bounds = PHYSIOLOGICAL_BOUNDS[sport];
  const range = {
    low: Math.max(bounds.min, Number((effective - errorMargin).toFixed(2))),
    high: Math.min(bounds.max, Number((effective + errorMargin).toFixed(2))),
  };

  // 6. Détection de variation
  const variation = detectVariation(effective, previousEffective);

  // 7. Labels
  const isLocked = source === "test_labo";
  const sourceLabelsMap: Record<VLamaxV2Source, string> = {
    test_labo:          "VLamax (mesurée labo)",
    semaine_reference:  "VLamax (semaine ref.)",
    test_terrain:       "VLamax (test terrain)",
    estimation:         "VLamax (estimée)",
    unknown:            "VLamax (non disponible)",
  };

  // 8. Journal
  const log: CalibrationLogEntry = {
    date: new Date().toISOString(),
    source,
    rawValue: Number(rawValue.toFixed(3)),
    effectiveValue: Number(effective.toFixed(2)),
    previousValue: previousEffective ?? null,
    variationPct: variation.variationPct,
    confidence,
    errorMargin,
    reason,
    sources: sourceLabels,
    smoothingApplied: smooth,
  };

  // 9. Détails staff
  const detailParts: string[] = [];
  detailParts.push(`Brut: ${rawValue.toFixed(3)}`);
  if (smooth && previousEffective !== null) {
    detailParts.push(`EWMA α=${EWMA_ALPHA} appliqué`);
  }
  detailParts.push(`Effectif: ${effective.toFixed(2)} ± ${errorMargin.toFixed(2)}`);
  detailParts.push(`Confiance: ${(confidence * 100).toFixed(0)}%`);
  if (sourceLabels.length > 0) {
    detailParts.push(`Sources: ${sourceLabels.join(", ")}`);
  }

  return {
    raw: Number(rawValue.toFixed(3)),
    effective: Number(effective.toFixed(2)),
    source,
    confidence,
    errorMargin,
    range,
    label: sourceLabelsMap[source],
    isLocked,
    variationWarning: variation.warning && !isLocked,
    variationMessage: variation.message,
    sport,
    details: detailParts.join(" · "),
    calibrationLog: log,
  };
}

// =============================================
// FORMATAGE AFFICHAGE
// =============================================

/**
 * Affichage athlète: VLamax ≈ 0.39 (jamais plus de 2 décimales, jamais la valeur brute)
 */
export function formatVLamaxAthlete(result: VLamaxV2Result): string {
  if (result.effective === null) return "—";
  if (result.isLocked) return result.effective.toFixed(2);
  return `≈ ${result.effective.toFixed(2)}`;
}

/**
 * Affichage coach/staff: VLamax = 0.39 ± 0.05 (Test terrain)
 */
export function formatVLamaxStaff(result: VLamaxV2Result): string {
  if (result.effective === null) return "— (données insuffisantes)";
  return `${result.effective.toFixed(2)} ± ${result.errorMargin.toFixed(2)}`;
}

/**
 * Affichage compact avec plage: 0.39 [0.34–0.44]
 */
export function formatVLamaxRange(result: VLamaxV2Result): string {
  if (result.effective === null || !result.range) return "—";
  return `${result.effective.toFixed(2)} [${result.range.low.toFixed(2)}–${result.range.high.toFixed(2)}]`;
}

// =============================================
// TEXTE ACADEMY / RAPPORT STAFF
// =============================================

export const VLAMAX_V2_ACADEMY_TEXT = {
  title: "Pourquoi ma VLamax n'est pas un chiffre absolu",
  body: `La VLamax est une estimation physiologique continue, influencée par la qualité des données, la fatigue, et le type de test utilisé.

TFCL affiche volontairement une valeur avec marge d'erreur et niveau de confiance, car la décision d'entraînement dépend davantage de la tendance et de la zone physiologique que d'un chiffre isolé.

Une variation de ±0.02 est physiologiquement normale et ne justifie pas à elle seule un changement de stratégie.`,
};

// =============================================
// HELPERS UI
// =============================================

/** Labels humains pour la source de la donnée */
export function getV2SourceLabel(source: VLamaxV2Source): string {
  switch (source) {
    case "test_labo":         return "Test labo";
    case "semaine_reference": return "Sem. référence";
    case "test_terrain":      return "Test terrain";
    case "estimation":        return "Estimation";
    case "unknown":           return "Non déterminée";
  }
}

/** Emoji pour la source */
export function getV2SourceEmoji(source: VLamaxV2Source): string {
  switch (source) {
    case "test_labo":         return "🧪";
    case "semaine_reference": return "📋";
    case "test_terrain":      return "🏃";
    case "estimation":        return "📐";
    case "unknown":           return "❓";
  }
}

export function getV2SourceColor(source: VLamaxV2Source): string {
  switch (source) {
    case "test_labo":         return "text-green-600 dark:text-green-400";
    case "semaine_reference": return "text-blue-600 dark:text-blue-400";
    case "test_terrain":      return "text-emerald-600 dark:text-emerald-400";
    case "estimation":        return "text-amber-600 dark:text-amber-400";
    case "unknown":           return "text-muted-foreground";
  }
}

export function getV2SourceBgColor(source: VLamaxV2Source): string {
  switch (source) {
    case "test_labo":         return "bg-green-100 dark:bg-green-900/30";
    case "semaine_reference": return "bg-blue-100 dark:bg-blue-900/30";
    case "test_terrain":      return "bg-emerald-100 dark:bg-emerald-900/30";
    case "estimation":        return "bg-amber-100 dark:bg-amber-900/30";
    case "unknown":           return "bg-muted";
  }
}

/** @deprecated Kept for internal use only - not displayed to coaches */
export function getV2ConfidenceColor(confidence: number): string {
  if (confidence >= 0.75) return "text-green-600 dark:text-green-400";
  if (confidence >= 0.50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

/** @deprecated Kept for internal use only - not displayed to coaches */
export function getV2ConfidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return "Très fiable";
  if (confidence >= 0.70) return "Fiable";
  if (confidence >= 0.50) return "Modéré";
  if (confidence >= 0.35) return "Faible";
  return "Fragile";
}
