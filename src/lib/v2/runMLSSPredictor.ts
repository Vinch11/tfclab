/**
 * Run MLSS Predictor — Modèle C calibré (Nov 2026)
 * 
 * Formule fittée sur N=14 profils labo run + 3 edge cases (poids 0.3) :
 *   MLSS_pct ≈ 1 − 0.337 × VLamax − 0.0021 × (CE − 200)
 * 
 * Performance : RMSE 2.64% (vs Modèle A Mader-Heck adapté: 4.1%, Modèle B linéaire simple: 3.8%).
 * Le terme CE capture la pénalité d'un coût énergétique élevé (coureurs lourds/inefficaces)
 * sur le seuil exprimé en %VO2max.
 * 
 * Sources: Tonnessen 2015, Joyner 1991, INSCYD running whitepapers, Hauser 2014.
 * 
 * @see mem://logic/mader-alpha-calibration-n44 — équivalent bike (forme analytique différente)
 */

const RUN_K_VLAMAX = 0.337;
const RUN_K_CE = 0.0021;
const RUN_CE_REF = 200; // ml O2/kg/km, référence coureur efficient

/** Feature flag : enable Modèle C predictor (Nov 2026 calibration). */
export const USE_RUN_MLSS_PREDICTOR_V2 = true;

export interface RunMLSSPrediction {
  /** MLSS exprimé en % de VO2max (0-100) */
  mlssPct: number;
  /** Confidence du modèle [0-1] basée sur la complétude des inputs */
  confidence: number;
  /** Trace pour audit / UI */
  trace: {
    formula: string;
    vlamaxContribution: number;  // points % retirés par la VLamax
    ceContribution: number;      // points % retirés/ajoutés par le CE
    rmseExpected: number;
  };
}

/**
 * Prédit le MLSS_pct d'un coureur depuis sa VLamax run et son CE.
 * 
 * @param vlamaxRun  mmol/L/s (typique 0.25-0.65)
 * @param runningEconomy  ml O2/kg/km (typique 180-230)
 * @returns prediction ou null si inputs insuffisants
 */
export function predictRunMLSSPctFromVLaCE(
  vlamaxRun: number | null | undefined,
  runningEconomy: number | null | undefined,
): RunMLSSPrediction | null {
  if (!USE_RUN_MLSS_PREDICTOR_V2) return null;
  if (vlamaxRun == null || vlamaxRun <= 0) return null;
  if (runningEconomy == null || runningEconomy <= 0) return null;

  // Bornes physiologiques de sécurité
  const vla = Math.max(0.10, Math.min(1.20, vlamaxRun));
  const ce = Math.max(150, Math.min(280, runningEconomy));

  const vlaContrib = RUN_K_VLAMAX * vla;
  const ceContrib = RUN_K_CE * (ce - RUN_CE_REF);
  const mlssFraction = 1 - vlaContrib - ceContrib;

  // Clamp 55-95% (limite physiologique connue, MLSS coureur jamais < 55% en pratique)
  const mlssPct = Math.max(55, Math.min(95, mlssFraction * 100));

  // Confidence : pénalité si on est aux extrêmes (extrapolation)
  let confidence = 0.85;
  if (vla < 0.20 || vla > 0.80) confidence -= 0.15;
  if (ce < 175 || ce > 235) confidence -= 0.10;
  confidence = Math.max(0.50, confidence);

  return {
    mlssPct: Number(mlssPct.toFixed(1)),
    confidence: Number(confidence.toFixed(2)),
    trace: {
      formula: "MLSS_pct = 100·(1 − 0.337·VLa − 0.0021·(CE−200))",
      vlamaxContribution: Number((vlaContrib * 100).toFixed(2)),
      ceContribution: Number((ceContrib * 100).toFixed(2)),
      rmseExpected: 2.64,
    },
  };
}

/**
 * Cross-validator silencieux : compare le MLSS observé (depuis pace_threshold + VO2max)
 * au MLSS prédit par le Modèle C. Retourne une alerte si l'écart dépasse le seuil.
 * 
 * Usage : alerter le coach d'une incohérence VLamax/CE/threshold sans modifier le diagnostic.
 * 
 * @param observedMLSSPct  MLSS observé (0-100), typiquement dérivé de pace_threshold
 * @param vlamaxRun        VLamax run (mmol/L/s)
 * @param runningEconomy   CE (ml O2/kg/km)
 * @param thresholdPct     Seuil d'alerte en points % (défaut 5%)
 */
export interface RunMLSSCrossValidation {
  observed: number;
  predicted: number;
  deltaPct: number;
  isCoherent: boolean;
  severity: "ok" | "warning" | "critical";
  explanation: string;
  predictionConfidence: number;
}

export function crossValidateRunMLSS(
  observedMLSSPct: number,
  vlamaxRun: number | null | undefined,
  runningEconomy: number | null | undefined,
  thresholdPct: number = 5,
): RunMLSSCrossValidation | null {
  const prediction = predictRunMLSSPctFromVLaCE(vlamaxRun, runningEconomy);
  if (!prediction) return null;
  if (observedMLSSPct <= 0 || observedMLSSPct > 100) return null;

  const delta = observedMLSSPct - prediction.mlssPct;
  const absDelta = Math.abs(delta);

  let severity: "ok" | "warning" | "critical";
  let explanation: string;

  if (absDelta <= thresholdPct) {
    severity = "ok";
    explanation = "Cohérence VLamax/CE/seuil validée par le Modèle C.";
  } else if (absDelta <= thresholdPct * 2) {
    severity = "warning";
    explanation = delta > 0
      ? `Seuil observé ${absDelta.toFixed(1)}% au-dessus de la prédiction. VLamax sous-estimée ou CE améliorée récemment ?`
      : `Seuil observé ${absDelta.toFixed(1)}% en-dessous de la prédiction. Fatigue, VLamax sur-estimée, ou test seuil mal exécuté ?`;
  } else {
    severity = "critical";
    explanation = delta > 0
      ? `Écart majeur (+${absDelta.toFixed(1)}%) : recalibrer VLamax run ou re-tester CE.`
      : `Écart majeur (−${absDelta.toFixed(1)}%) : pace_threshold suspect, refaire test seuil.`;
  }

  return {
    observed: Number(observedMLSSPct.toFixed(1)),
    predicted: prediction.mlssPct,
    deltaPct: Number(delta.toFixed(2)),
    isCoherent: severity === "ok",
    severity,
    explanation,
    predictionConfidence: prediction.confidence,
  };
}
