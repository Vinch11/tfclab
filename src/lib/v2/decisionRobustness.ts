/**
 * TFCL Decision Robustness Curve™
 * 
 * Ce module calcule la "robustesse décisionnelle" - la capacité à prendre
 * des décisions d'entraînement fiables avec les données disponibles.
 * 
 * PHILOSOPHIE:
 * - Plus de précision ≠ toujours meilleures décisions (rendements décroissants)
 * - TFCL optimise la robustesse décisionnelle, pas la précision absolue
 * - Les tests labo sont recommandés quand la précision supplémentaire est nécessaire
 */

// ============================================
// TYPES
// ============================================

export interface PrecisionInput {
  // VLamax
  vlamaxValue?: number | null;
  vlamaxConfidence?: number; // 0-1
  vlamaxSource?: string | null; // "measured" | "field_test" | "estimated" | "default"
  vlamaxPercentile?: number | null; // position dans le cluster (0-100)
  
  // TTE
  tteValue?: number | null;
  tteConfidence?: number; // 0-1
  tteSource?: string | null;
  
  // VO2max
  vo2maxValue?: number | null;
  vo2maxConfidence?: number; // 0-1
  vo2maxSource?: string | null;
  
  // Tests TFCL Reference Week
  p30sPresent?: boolean;
  p60sPresent?: boolean;
  map5minPresent?: boolean;
  protocolQuality?: number; // 1-5
  
  // Calibration
  clusterCalibrationAvailable?: boolean;
  
  // Contexte athlète
  ambition?: "finisher" | "competitor" | "elite";
  objectif?: string; // "marathon" | "im" | "703" etc.
}

export interface PrecisionBreakdown {
  base: number;
  vlamaxContribution: number;
  tteContribution: number;
  vo2maxContribution: number;
  clusterContribution: number;
  testsContribution: number;
  protocolBonus: number;
}

export interface PrecisionScore {
  score: number; // 0-100
  breakdown: PrecisionBreakdown;
  decisionQuality: number; // 0-100 (sur la courbe)
  zone: "illusion" | "robust" | "absolute";
  zoneLabel: string;
}

export interface LabRecommendation {
  recommended: boolean;
  reasons: string[];
  severity: "none" | "suggested" | "recommended" | "strongly_recommended";
}

// ============================================
// DECISION QUALITY CURVE (rendements décroissants)
// ============================================

/**
 * Calcule la qualité de décision à partir de la précision
 * Courbe avec rendements décroissants: monte vite au début, plateau ensuite
 */
export function decisionQualityFromPrecision(precisionPct: number): number {
  const p = Math.max(0, Math.min(100, precisionPct)) / 100;
  // Fonction exponentielle avec plateau
  const y = 100 * (1 - Math.exp(-4.5 * p));
  return Math.max(0, Math.min(100, Math.round(y * 10) / 10));
}

/**
 * Génère les points de la courbe pour le graphique
 */
export function generateDecisionCurvePoints(steps: number = 50): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100;
    const y = decisionQualityFromPrecision(x);
    points.push({ x, y });
  }
  return points;
}

// ============================================
// PRECISION SCORE CALCULATION
// ============================================

const PROTOCOL_BONUS_MAP: Record<number, number> = {
  1: 0,
  2: 2,
  3: 5,
  4: 8,
  5: 10,
};

/**
 * Calcule le score de précision TFCL basé sur les données réelles disponibles
 */
export function computePrecisionScoreTFCL(input: PrecisionInput): PrecisionScore {
  // Base de départ
  const base = 15;
  
  // Contribution VLamax (max 25)
  const vlamaxConf = input.vlamaxConfidence ?? 0;
  const vlamaxContribution = Math.round(25 * vlamaxConf * 10) / 10;
  
  // Contribution TTE (max 20)
  const tteConf = input.tteConfidence ?? 0;
  const tteContribution = Math.round(20 * tteConf * 10) / 10;
  
  // Contribution VO2max (max 10, seulement si présent)
  let vo2maxContribution = 0;
  if (input.vo2maxValue != null) {
    const vo2Conf = input.vo2maxConfidence ?? 0.5;
    vo2maxContribution = Math.round(10 * vo2Conf * 10) / 10;
  }
  
  // Bonus calibration cluster (10)
  const clusterContribution = input.clusterCalibrationAvailable ? 10 : 0;
  
  // Bonus tests P30/P60/MAP présents (10)
  const testsPresent = input.p30sPresent && input.p60sPresent && input.map5minPresent;
  const testsContribution = testsPresent ? 10 : 0;
  
  // Bonus qualité protocole (0-10)
  const protocolBonus = PROTOCOL_BONUS_MAP[input.protocolQuality ?? 3] ?? 5;
  
  // Score total
  const rawScore = base + vlamaxContribution + tteContribution + vo2maxContribution + 
                   clusterContribution + testsContribution + protocolBonus;
  const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));
  
  // Qualité de décision sur la courbe
  const decisionQuality = decisionQualityFromPrecision(score);
  
  // Déterminer la zone
  let zone: "illusion" | "robust" | "absolute";
  let zoneLabel: string;
  
  if (score < 35) {
    zone = "illusion";
    zoneLabel = "Illusion de précision";
  } else if (score < 75) {
    zone = "robust";
    zoneLabel = "Décision robuste (TFCL)";
  } else {
    zone = "absolute";
    zoneLabel = "Précision absolue (tests labo)";
  }
  
  return {
    score,
    breakdown: {
      base,
      vlamaxContribution,
      tteContribution,
      vo2maxContribution,
      clusterContribution,
      testsContribution,
      protocolBonus,
    },
    decisionQuality,
    zone,
    zoneLabel,
  };
}

// ============================================
// LAB RECOMMENDATION LOGIC
// ============================================

/**
 * Détermine si un test labo est recommandé
 */
export function computeLabRecommendation(
  input: PrecisionInput,
  precisionScore: number
): LabRecommendation {
  const reasons: string[] = [];
  let severity: LabRecommendation["severity"] = "none";
  
  // Critère 1: Score de précision trop bas
  if (precisionScore < 55) {
    reasons.push("Score de précision insuffisant pour des décisions fiables");
    severity = "recommended";
  }
  
  // Critère 2: VLamax outlier (hors P10-P90)
  if (input.vlamaxPercentile != null) {
    if (input.vlamaxPercentile < 10 || input.vlamaxPercentile > 90) {
      reasons.push("VLamax en dehors de la plage typique du cluster (P10-P90)");
      severity = severity === "none" ? "suggested" : severity;
    }
  }
  
  // Critère 3: Incohérence majeure détectée
  const hasIncoherence = detectMajorIncoherence(input);
  if (hasIncoherence.detected) {
    reasons.push(hasIncoherence.reason);
    severity = "recommended";
  }
  
  // Critère 4: Ambition ELITE + objectif majeur + confiance basse
  const isEliteContext = input.ambition === "elite" && 
    ["marathon", "im", "ironman", "kona"].some(obj => 
      input.objectif?.toLowerCase().includes(obj)
    );
  const lowConfidence = (input.vlamaxConfidence ?? 0) < 0.70;
  
  if (isEliteContext && lowConfidence) {
    reasons.push("Ambition Elite avec objectif majeur nécessite une précision élevée");
    severity = "strongly_recommended";
  }
  
  return {
    recommended: reasons.length > 0,
    reasons,
    severity,
  };
}

/**
 * Détecte les incohérences majeures dans le profil
 */
function detectMajorIncoherence(input: PrecisionInput): { detected: boolean; reason: string } {
  // Incohérence: VLamax très haute + VO2max très haute + TTE très haut
  // (physiologiquement improbable)
  const vlamaxHigh = (input.vlamaxValue ?? 0) > 0.55;
  const vo2maxHigh = (input.vo2maxValue ?? 0) > 65;
  const tteHigh = (input.tteValue ?? 0) > 55;
  
  if (vlamaxHigh && vo2maxHigh && tteHigh) {
    return {
      detected: true,
      reason: "Profil physiologiquement atypique : VLamax élevée avec VO2max et TTE très hauts",
    };
  }
  
  // Incohérence: VLamax très basse mais faible endurance
  const vlamaxLow = (input.vlamaxValue ?? 0.5) < 0.28;
  const tteLow = (input.tteValue ?? 40) < 30;
  
  if (vlamaxLow && tteLow) {
    return {
      detected: true,
      reason: "Incohérence : VLamax très basse mais TTE faible",
    };
  }
  
  return { detected: false, reason: "" };
}

// ============================================
// ZONES DEFINITION (pour le graphique)
// ============================================

export interface DecisionZone {
  id: "illusion" | "robust" | "absolute";
  label: string;
  description: string;
  xStart: number;
  xEnd: number;
  color: string;
}

export const DECISION_ZONES: DecisionZone[] = [
  {
    id: "illusion",
    label: "Illusion de précision",
    description: "Chiffres isolés sans contexte ni validation",
    xStart: 0,
    xEnd: 35,
    color: "hsl(0, 60%, 50%)", // Rouge
  },
  {
    id: "robust",
    label: "Décision robuste (TFCL)",
    description: "Plages + confiance + contexte = décisions fiables",
    xStart: 35,
    xEnd: 75,
    color: "hsl(142, 60%, 45%)", // Vert
  },
  {
    id: "absolute",
    label: "Précision absolue",
    description: "Tests laboratoire pour précision maximale",
    xStart: 75,
    xEnd: 100,
    color: "hsl(220, 60%, 50%)", // Bleu
  },
];

// ============================================
// MESSAGES & INTERPRETATION
// ============================================

export function getDecisionMessage(precisionScore: number, labReco: LabRecommendation): string {
  if (labReco.severity === "strongly_recommended") {
    return "Test labo fortement recommandé pour ce contexte élite.";
  }
  if (labReco.recommended) {
    return "Test labo recommandé pour lever une incertitude spécifique.";
  }
  if (precisionScore >= 55) {
    return "Précision suffisante pour des décisions robustes.";
  }
  return "Données insuffisantes pour une décision fiable.";
}

export function getZoneAdvice(zone: "illusion" | "robust" | "absolute"): string {
  switch (zone) {
    case "illusion":
      return "⚠️ Danger : les décisions basées sur des chiffres isolés sans validation peuvent être contre-productives. Enrichir le profil avec plus de données contextuelles.";
    case "robust":
      return "✅ Zone optimale TFCL : les plages de confiance et le contexte permettent des décisions d'entraînement robustes au quotidien.";
    case "absolute":
      return "🔬 Précision maximale atteinte. Les tests labo apportent une valeur ajoutée marginale pour la plupart des décisions, mais peuvent être utiles pour des cas spécifiques.";
  }
}
