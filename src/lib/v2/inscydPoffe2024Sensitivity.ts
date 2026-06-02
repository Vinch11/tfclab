/**
 * INSCYD Poffé 2024 — Sensitivity & Validation Reference (BIKE MLSS)
 *
 * Source: Poffé C, Van Dael K, Van Schuylenbergh R (2024).
 *   "INSCYD physiological performance software is valid to determine the maximal lactate
 *    steady state in male and female cyclists."
 *   Frontiers in Sports and Active Living, 6:1376876.
 *   DOI: 10.3389/fspor.2024.1376876
 *
 * Usage: propagation d'incertitude sur PMLSS bike à partir des écarts typiques
 *        des mesures VO2max et VLamax (test-retest publié par les auteurs).
 *
 * Résultats clés de la publi (N=29 cyclistes, 19H / 10F) :
 *  - Corrélation PMLSS_INSCYD vs PMLSS (gold-standard 2-5 trials) : r=0.992 global
 *  - Bias moyen : +4.6 W global (+6.6 W H, +0.8 W F n.s.)
 *  - MLSS atteint à 76.6 ± 5.8 % VO2max
 *  - Sensibilité VO2max ±3.3 ml/kg/min  → ±17 W (~7%) sur PMLSS
 *  - Sensibilité VLamax ±0.11 mmol/L/s → ±12-15 W (~5%) sur PMLSS
 *  - Erreur typique MLSS gold-standard : ~3%
 */

export const INSCYD_POFFE_2024 = {
  doi: '10.3389/fspor.2024.1376876',
  citation:
    'Poffé, Van Dael & Van Schuylenbergh (2024). Frontiers Sports Active Living 6:1376876.',
  n: 29,
  pearsonR: 0.992,
  meanBiasW: 4.6,
  pctVO2maxAtMLSS: 76.6,
  typicalErrorMLSSPct: 3.0,
  // Sensitivities (publication-grade test-retest)
  vo2maxStepMlKgMin: 3.3,
  pmlssPctPerVO2maxStep: 0.07, // ±7% PMLSS per ±3.3 ml/kg/min
  vlamaxStepMmolLS: 0.11,
  pmlssPctPerVlamaxStep: 0.05, // ±5% PMLSS per ±0.11 mmol/L/s
} as const;

export interface MLSSConfidenceInput {
  /** Estimated PMLSS (W) — typically our Mader-Heck output */
  pmlssW: number;
  /** Confidence on VO2max input, 0-1. 1 = lab-grade. */
  vo2maxConfidence?: number;
  /** Confidence on VLamax input, 0-1. */
  vlamaxConfidence?: number;
}

export interface MLSSConfidenceInterval {
  pmlssW: number;
  /** ± Watts (1-sigma equivalent). */
  uncertaintyW: number;
  /** ± percent of PMLSS. */
  uncertaintyPct: number;
  lowW: number;
  highW: number;
  /** Quality verdict suitable for UI badging. */
  quality: 'lab' | 'field' | 'estimated';
  /** Human-readable rationale citing Poffé 2024. */
  rationale: string;
}

/**
 * Propagates measurement uncertainty on VO2max and VLamax to PMLSS,
 * using the sensitivities published by Poffé et al. 2024.
 *
 * Confidence inputs scale the published step:
 *   effective_step = published_step * (2 - confidence)
 *   (confidence=1 → published step; confidence=0.5 → 1.5x; confidence=0 → 2x)
 */
export function computeMLSSConfidenceInterval(
  input: MLSSConfidenceInput
): MLSSConfidenceInterval {
  const { pmlssW } = input;
  const vConf = clamp01(input.vo2maxConfidence ?? 0.8);
  const lConf = clamp01(input.vlamaxConfidence ?? 0.8);

  // Worst-case per-source pct error scaled by inverse confidence
  const vo2Err = INSCYD_POFFE_2024.pmlssPctPerVO2maxStep * (2 - vConf);
  const vlaErr = INSCYD_POFFE_2024.pmlssPctPerVlamaxStep * (2 - lConf);

  // Quadratic sum (independent sources) + 3% irreducible gold-standard error
  const irreducible = INSCYD_POFFE_2024.typicalErrorMLSSPct / 100;
  const totalPct = Math.sqrt(vo2Err * vo2Err + vlaErr * vlaErr + irreducible * irreducible);

  const uncertaintyW = Math.round(pmlssW * totalPct);
  const uncertaintyPct = Number((totalPct * 100).toFixed(1));

  const avgConf = (vConf + lConf) / 2;
  const quality: MLSSConfidenceInterval['quality'] =
    avgConf >= 0.85 ? 'lab' : avgConf >= 0.6 ? 'field' : 'estimated';

  return {
    pmlssW: Math.round(pmlssW),
    uncertaintyW,
    uncertaintyPct,
    lowW: Math.round(pmlssW - uncertaintyW),
    highW: Math.round(pmlssW + uncertaintyW),
    quality,
    rationale: `Intervalle ±${uncertaintyW} W (±${uncertaintyPct}%) propagé depuis les sensibilités VO2max (±${INSCYD_POFFE_2024.vo2maxStepMlKgMin} ml/kg/min → ±7% PMLSS) et VLamax (±${INSCYD_POFFE_2024.vlamaxStepMmolLS} mmol/L/s → ±5% PMLSS) publiées par Poffé et al. 2024 (N=29, r=0.99 vs MLSS gold-standard).`,
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
