/**
 * CALIBRATION LAYER OFFICIEL — Two For Coaching Lab™
 * 
 * Mécanisme AVANT/APRÈS (calibration) pour connecter les tests aux calculs V2
 * 
 * ARCHITECTURE:
 * - MODELLED: Valeurs issues des estimations/modèles sans tests
 * - TESTED: Valeurs issues des tests terrain TFCL
 * - EFFECTIVE: Fusion pondérée (ce que l'app affiche)
 * 
 * RÈGLE: Les tests ne remplacent PAS les calculs, ils les pondèrent.
 */

// =============================================
// TYPES
// =============================================

export type CalibrationSource = "LAB" | "TEST_TFCL" | "MODELLED" | "UNKNOWN";

export interface CalibrationValue {
  value: number | null;
  source: CalibrationSource;
  confidence: number; // 0-1
  date?: string;
  protocol?: string;
}

export interface CalibrationMetric {
  modelled: CalibrationValue;
  tested: CalibrationValue | null;
  effective: CalibrationValue;
  weight_test: number; // Poids utilisé pour la fusion
  delta: number | null; // Différence effective - modelled
  calibrationImpact: CalibrationImpact;
}

export interface CalibrationImpact {
  confidenceBoost: number;
  precisionBoost: number;
  message: string;
  quality: "high" | "medium" | "low";
}

export interface BeforeAfterSummary {
  metric: string;
  before: {
    value: number | null;
    confidence: number;
    source: CalibrationSource;
    label: string;
  };
  after: {
    value: number | null;
    confidence: number;
    source: CalibrationSource;
    label: string;
  };
  delta: number | null;
  deltaPercent: number | null;
  impact: CalibrationImpact;
}

export interface CalibrationWeights {
  vlamax: number;
  tte: number;
  fatmax: number;
}

export interface CalibrationResult {
  vlamax: CalibrationMetric;
  tte: CalibrationMetric;
  fatmax: CalibrationMetric | null;
  summary: BeforeAfterSummary[];
  weights: CalibrationWeights;
  globalConfidence: number;
  calibrationNotes: string[];
}

// =============================================
// INPUT TYPES
// =============================================

export interface AthleteModelData {
  // VLamax modélisée
  vlamax_modelled: number | null;
  vlamax_modelled_confidence: number;
  vlamax_modelled_source?: string;
  
  // TTE modélisé
  tte_modelled: number | null;
  tte_modelled_confidence: number;
  
  // FatMax (si module actif)
  fatmax_modelled?: {
    low: number;
    optimal: number;
    high: number;
  } | null;
  
  // Contexte
  objectif: string;
  fatigueIndex?: number;
}

export interface TestData {
  id: string;
  type: string;
  sport: string;
  date: string;
  
  // Résultats
  value: number | null;
  confidence: number;
  
  // Qualité
  protocolQuality: 1 | 2 | 3 | 4 | 5;
  validityStatus: "OK" | "WARNING" | "INVALID";
  variance?: number; // Écart entre répétitions
  
  // Données brutes pour VLamax/TTE
  rawData?: Record<string, number>;
}

// =============================================
// CONSTANTES
// =============================================

const W_TEST_BASE = 0.40;
const W_TEST_MIN = 0.15;
const W_TEST_MAX = 0.80;

const CONFIDENCE_BOOST_MAP = {
  high: 0.15,
  medium: 0.10,
  low: 0.05,
};

// =============================================
// CALCUL DU POIDS TEST (w_test)
// =============================================

/**
 * Calcule le poids du test pour la fusion AVANT/APRÈS
 * 
 * Règles:
 * - Base: 0.40
 * - +0.10 si protocolQuality = 4
 * - +0.20 si protocolQuality = 5
 * - -0.15 si protocolQuality <= 2
 * - -0.10 si fatigueIndex > 70
 * - Clamp entre 0.15 et 0.80
 */
export function computeTestWeight(
  test: TestData,
  fatigueIndex?: number
): number {
  let w = W_TEST_BASE;
  
  // Ajustement qualité protocole
  if (test.protocolQuality === 5) {
    w += 0.20;
  } else if (test.protocolQuality === 4) {
    w += 0.10;
  } else if (test.protocolQuality <= 2) {
    w -= 0.15;
  }
  
  // Ajustement validité
  if (test.validityStatus === "WARNING") {
    w -= 0.10;
  } else if (test.validityStatus === "INVALID") {
    w -= 0.25;
  }
  
  // Ajustement variance (si disponible)
  if (test.variance !== undefined) {
    if (test.variance > 10) w -= 0.10;
    else if (test.variance > 5) w -= 0.05;
  }
  
  // Ajustement fatigue
  if (fatigueIndex !== undefined && fatigueIndex > 70) {
    w -= 0.10;
  }
  
  // Clamp final
  return Math.max(W_TEST_MIN, Math.min(W_TEST_MAX, w));
}

// =============================================
// FUSION MODELLED + TESTED → EFFECTIVE
// =============================================

/**
 * Fusionne la valeur modélisée et testée pour produire la valeur effective
 * 
 * Formule: effective = (1 - w_test) × modelled + w_test × tested
 */
export function blendValues(
  modelled: number | null,
  tested: number | null,
  weight: number
): number | null {
  if (tested === null) return modelled;
  if (modelled === null) return tested;
  
  return (1 - weight) * modelled + weight * tested;
}

/**
 * Fusionne les valeurs de confiance
 */
export function blendConfidence(
  modelledConf: number,
  testedConf: number,
  weight: number,
  qualityBoost: number
): number {
  const baseBlend = (1 - weight) * modelledConf + weight * testedConf;
  return Math.min(0.95, baseBlend + qualityBoost);
}

// =============================================
// COMPUTE MODEL OUTPUTS (sans tests)
// =============================================

export function computeModelOutputs(
  data: AthleteModelData
): {
  vlamax: CalibrationValue;
  tte: CalibrationValue;
  fatmax: CalibrationValue | null;
} {
  return {
    vlamax: {
      value: data.vlamax_modelled,
      source: data.vlamax_modelled_source === "LAB" ? "LAB" : "MODELLED",
      confidence: data.vlamax_modelled_confidence,
    },
    tte: {
      value: data.tte_modelled,
      source: "MODELLED",
      confidence: data.tte_modelled_confidence,
    },
    fatmax: data.fatmax_modelled ? {
      value: data.fatmax_modelled.optimal,
      source: "MODELLED",
      confidence: 0.60,
    } : null,
  };
}

// =============================================
// COMPUTE TEST OUTPUTS (si tests disponibles)
// =============================================

export function computeTestOutputs(
  tests: TestData[]
): {
  vlamax: CalibrationValue | null;
  tte: CalibrationValue | null;
} {
  // Trouver le test VLamax le plus récent et valide
  const vlamaxTests = tests
    .filter(t => 
      t.type.includes("VLAMAX") || 
      t.type.includes("SPRINT") ||
      t.type === "bike_vlamax_sprint_15s" ||
      t.type === "run_vlamax_sprint_15s_12min"
    )
    .filter(t => t.validityStatus !== "INVALID")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Trouver le test TTE le plus récent et valide
  const tteTests = tests
    .filter(t => 
      t.type.includes("TTE") ||
      t.type === "bike_tte_ftp" ||
      t.type === "run_tte"
    )
    .filter(t => t.validityStatus !== "INVALID")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return {
    vlamax: vlamaxTests.length > 0 ? {
      value: vlamaxTests[0].value,
      source: "TEST_TFCL",
      confidence: vlamaxTests[0].confidence,
      date: vlamaxTests[0].date,
      protocol: vlamaxTests[0].type,
    } : null,
    tte: tteTests.length > 0 ? {
      value: tteTests[0].value,
      source: "TEST_TFCL",
      confidence: tteTests[0].confidence,
      date: tteTests[0].date,
      protocol: tteTests[0].type,
    } : null,
  };
}

// =============================================
// BLEND OUTPUTS (fusion avec pondération)
// =============================================

export function blendOutputs(
  modelled: { vlamax: CalibrationValue; tte: CalibrationValue; fatmax: CalibrationValue | null },
  tested: { vlamax: CalibrationValue | null; tte: CalibrationValue | null },
  tests: TestData[],
  fatigueIndex?: number
): CalibrationResult {
  const notes: string[] = [];
  
  // ===== VLamax =====
  let vlamaxWeightTest = 0;
  let vlamaxEffective: CalibrationValue;
  let vlamaxImpact: CalibrationImpact;
  
  if (tested.vlamax && tested.vlamax.value !== null) {
    const relevantTest = tests.find(t => 
      t.type.includes("VLAMAX") || t.type.includes("SPRINT")
    );
    
    vlamaxWeightTest = relevantTest 
      ? computeTestWeight(relevantTest, fatigueIndex)
      : W_TEST_BASE;
    
    const effectiveValue = blendValues(
      modelled.vlamax.value, 
      tested.vlamax.value, 
      vlamaxWeightTest
    );
    
    const quality = vlamaxWeightTest >= 0.60 ? "high" : vlamaxWeightTest >= 0.40 ? "medium" : "low";
    const confidenceBoost = CONFIDENCE_BOOST_MAP[quality];
    
    vlamaxEffective = {
      value: effectiveValue,
      source: "TEST_TFCL",
      confidence: blendConfidence(
        modelled.vlamax.confidence,
        tested.vlamax.confidence,
        vlamaxWeightTest,
        confidenceBoost
      ),
      date: tested.vlamax.date,
      protocol: tested.vlamax.protocol,
    };
    
    vlamaxImpact = {
      confidenceBoost,
      precisionBoost: quality === "high" ? 0.05 : quality === "medium" ? 0.03 : 0.01,
      message: quality === "high" 
        ? "Test haute qualité → calibration renforcée"
        : quality === "medium"
          ? "Test qualité moyenne → calibration modérée"
          : "Test faible qualité → impact limité",
      quality,
    };
    
    notes.push(`VLamax calibrée par test (w=${vlamaxWeightTest.toFixed(2)})`);
  } else {
    vlamaxEffective = { ...modelled.vlamax };
    vlamaxImpact = {
      confidenceBoost: 0,
      precisionBoost: 0,
      message: "Aucun test VLamax disponible",
      quality: "low",
    };
  }
  
  // ===== TTE =====
  let tteWeightTest = 0;
  let tteEffective: CalibrationValue;
  let tteImpact: CalibrationImpact;
  
  if (tested.tte && tested.tte.value !== null) {
    const relevantTest = tests.find(t => t.type.includes("TTE"));
    
    tteWeightTest = relevantTest 
      ? computeTestWeight(relevantTest, fatigueIndex)
      : W_TEST_BASE;
    
    const effectiveValue = blendValues(
      modelled.tte.value,
      tested.tte.value,
      tteWeightTest
    );
    
    const quality = tteWeightTest >= 0.60 ? "high" : tteWeightTest >= 0.40 ? "medium" : "low";
    const confidenceBoost = CONFIDENCE_BOOST_MAP[quality];
    
    tteEffective = {
      value: effectiveValue,
      source: "TEST_TFCL",
      confidence: blendConfidence(
        modelled.tte.confidence,
        tested.tte.confidence,
        tteWeightTest,
        confidenceBoost
      ),
      date: tested.tte.date,
      protocol: tested.tte.protocol,
    };
    
    tteImpact = {
      confidenceBoost,
      precisionBoost: quality === "high" ? 0.05 : quality === "medium" ? 0.03 : 0.01,
      message: quality === "high"
        ? "TTE mesuré haute qualité"
        : quality === "medium"
          ? "TTE mesuré qualité moyenne"
          : "TTE mesuré faible qualité",
      quality,
    };
    
    notes.push(`TTE calibré par test (w=${tteWeightTest.toFixed(2)})`);
  } else {
    tteEffective = { ...modelled.tte };
    tteImpact = {
      confidenceBoost: 0,
      precisionBoost: 0,
      message: "Aucun test TTE disponible",
      quality: "low",
    };
  }
  
  // ===== FatMax (recalculé avec effective values) =====
  let fatmaxMetric: CalibrationMetric | null = null;
  if (modelled.fatmax) {
    // FatMax dépend de VLamax effective et TTE effective
    // Recalcul simplifié: si VLamax plus basse → FatMax plus haute
    // Politique projet (insufficient-data-no-fake-defaults) : si l'une des VLamax
    // manque, on court-circuite le recalcul plutôt que faker delta=0.
    const vlamaxEffValue = vlamaxEffective.value ?? null;
    const vlamaxModValue = modelled.vlamax.value ?? null;
    const hasBothVlamax = vlamaxEffValue != null && vlamaxEffValue > 0
                       && vlamaxModValue != null && vlamaxModValue > 0;
    const vlamaxDelta = hasBothVlamax ? (vlamaxEffValue! - vlamaxModValue!) : 0;
    const fatmaxAdjustment = hasBothVlamax ? -vlamaxDelta * 10 : 0; // ~10W par 0.1 de VLamax

    fatmaxMetric = {
      modelled: modelled.fatmax,
      tested: null,
      effective: {
        value: (modelled.fatmax.value ?? 0) + fatmaxAdjustment,
        source: tested.vlamax ? "TEST_TFCL" : "MODELLED",
        confidence: Math.min(0.85, modelled.fatmax.confidence + (vlamaxImpact.confidenceBoost * 0.5)),
      },
      weight_test: vlamaxWeightTest * 0.5,
      delta: fatmaxAdjustment,

      calibrationImpact: {
        confidenceBoost: vlamaxImpact.confidenceBoost * 0.5,
        precisionBoost: vlamaxImpact.precisionBoost * 0.5,
        message: tested.vlamax 
          ? "FatMax recalculé avec VLamax calibrée"
          : "FatMax basé sur modèle uniquement",
        quality: tested.vlamax ? "medium" : "low",
      },
    };
  }
  
  // ===== Build Summary =====
  const summary: BeforeAfterSummary[] = [
    buildBeforeAfterSummary(
      "VLamax",
      modelled.vlamax,
      vlamaxEffective,
      vlamaxImpact
    ),
    buildBeforeAfterSummary(
      "TTE",
      modelled.tte,
      tteEffective,
      tteImpact
    ),
  ];
  
  if (fatmaxMetric) {
    summary.push(buildBeforeAfterSummary(
      "FatMax",
      modelled.fatmax!,
      fatmaxMetric.effective,
      fatmaxMetric.calibrationImpact
    ));
  }
  
  // Global confidence
  const globalConfidence = (
    vlamaxEffective.confidence * 0.5 +
    tteEffective.confidence * 0.3 +
    (fatmaxMetric?.effective.confidence ?? 0.5) * 0.2
  );
  
  return {
    vlamax: {
      modelled: modelled.vlamax,
      tested: tested.vlamax,
      effective: vlamaxEffective,
      weight_test: vlamaxWeightTest,
      delta: vlamaxEffective.value !== null && modelled.vlamax.value !== null
        ? vlamaxEffective.value - modelled.vlamax.value
        : null,
      calibrationImpact: vlamaxImpact,
    },
    tte: {
      modelled: modelled.tte,
      tested: tested.tte,
      effective: tteEffective,
      weight_test: tteWeightTest,
      delta: tteEffective.value !== null && modelled.tte.value !== null
        ? tteEffective.value - modelled.tte.value
        : null,
      calibrationImpact: tteImpact,
    },
    fatmax: fatmaxMetric,
    summary,
    weights: {
      vlamax: vlamaxWeightTest,
      tte: tteWeightTest,
      fatmax: fatmaxMetric?.weight_test ?? 0,
    },
    globalConfidence,
    calibrationNotes: notes,
  };
}

// =============================================
// BUILD BEFORE/AFTER SUMMARY
// =============================================

export function buildBeforeAfterSummary(
  metric: string,
  before: CalibrationValue,
  after: CalibrationValue,
  impact: CalibrationImpact
): BeforeAfterSummary {
  const delta = after.value !== null && before.value !== null
    ? after.value - before.value
    : null;
  
  const deltaPercent = delta !== null && before.value !== null && before.value !== 0
    ? (delta / before.value) * 100
    : null;
  
  const getSourceLabel = (source: CalibrationSource): string => {
    switch (source) {
      case "LAB": return "Mesure labo";
      case "TEST_TFCL": return "Test TFCL";
      case "MODELLED": return "Modèle";
      case "UNKNOWN": return "Inconnu";
    }
  };
  
  return {
    metric,
    before: {
      value: before.value,
      confidence: before.confidence,
      source: before.source,
      label: getSourceLabel(before.source),
    },
    after: {
      value: after.value,
      confidence: after.confidence,
      source: after.source,
      label: getSourceLabel(after.source),
    },
    delta,
    deltaPercent,
    impact,
  };
}

// =============================================
// MAIN CALIBRATION FUNCTION
// =============================================

export function computeCalibration(
  modelData: AthleteModelData,
  tests: TestData[]
): CalibrationResult {
  const modelOutputs = computeModelOutputs(modelData);
  const testOutputs = computeTestOutputs(tests);
  
  return blendOutputs(
    modelOutputs,
    testOutputs,
    tests,
    modelData.fatigueIndex
  );
}

// =============================================
// UI HELPERS
// =============================================

export function getImpactColor(quality: "high" | "medium" | "low"): string {
  switch (quality) {
    case "high": return "text-green-600 dark:text-green-400";
    case "medium": return "text-amber-600 dark:text-amber-400";
    case "low": return "text-muted-foreground";
  }
}

export function getImpactBgColor(quality: "high" | "medium" | "low"): string {
  switch (quality) {
    case "high": return "bg-green-100 dark:bg-green-900/30";
    case "medium": return "bg-amber-100 dark:bg-amber-900/30";
    case "low": return "bg-muted";
  }
}

export function formatCalibrationDelta(delta: number | null, metric: string): string {
  if (delta === null) return "—";
  const sign = delta >= 0 ? "+" : "";
  
  if (metric === "VLamax") {
    return `${sign}${delta.toFixed(2)}`;
  }
  if (metric === "TTE") {
    return `${sign}${delta.toFixed(0)} min`;
  }
  if (metric === "FatMax") {
    return `${sign}${delta.toFixed(0)} W`;
  }
  return `${sign}${delta.toFixed(2)}`;
}

export function getCalibrationStatusMessage(result: CalibrationResult): string {
  const hasVlamaxTest = result.vlamax.tested !== null;
  const hasTteTest = result.tte.tested !== null;
  
  if (hasVlamaxTest && hasTteTest) {
    return "Profil calibré par tests TFCL — confiance renforcée";
  }
  if (hasVlamaxTest || hasTteTest) {
    return "Calibration partielle — compléter les tests recommandé";
  }
  return "Aucun test disponible — valeurs modélisées uniquement";
}
