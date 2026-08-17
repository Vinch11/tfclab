/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL Trainability Caps™ — bornes de réalisme des projections d'adaptation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * OBJET
 * Les projections de `adaptationPredictor` sont exprimées en % de variation
 * relative. Sans borne absolue, un plan long (durationFactor jusqu'à 2.5) peut
 * produire des projections physiologiquement impossibles (ex. +12 ml/kg/min de
 * VO₂max en 3 mois, ou une bascule VLamax de −0.15 mmol/L/s en 6 semaines).
 *
 * SOURCE DES BORNES
 * INSCYD — "The State of Endurance Performance & Optimization 2025"
 * (N = 9 468 athlètes, 474 organisations, 43 pays, diagnostics répétés
 * intra-athlète / intra-sport, changements positifs uniquement).
 *   • VO₂max        : gains typiques ~2–3 ml·min⁻¹·kg⁻¹ / mois, extrêmes ~5
 *   • MLSS          : gains typiques ~0.5–1.5 ml·min⁻¹·kg⁻¹ / mois
 *   • VLamax        : |Δ| < ~0.1 mmol·L⁻¹·s⁻¹ / mois, bidirectionnel, lent
 *   • %VO₂max@MLSS  : adaptations plus faibles et plus resserrées que MLSS abs.
 *
 * ⚠️ ANTI-CIRCULARITÉ — Ce rapport est produit avec un modèle Mader-Heck, comme
 * TFCL. Il n'est donc utilisé ICI que comme GARDE-FOU de plausibilité sur des
 * VITESSES D'ADAPTATION observées (statistique descriptive terrain), jamais
 * comme référence de calibration de nos coefficients métaboliques.
 * Voir `src/lib/v2/literatureReferences.ts` pour les ancrages de calibration.
 *
 * Aucune borne n'est définie pour TTE / durabilité / économie : le rapport ne
 * documente pas ces vitesses d'adaptation → on ne fabrique pas de plafond.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type CappedMetricId = "vo2max" | "vlamax" | "lt2" | "fatmax";

export interface TrainabilityCap {
  /** Amplitude mensuelle "typique" haute — sert à borner la valeur médiane projetée. */
  typicalPerMonth: number;
  /** Amplitude mensuelle plafond (rare mais observée) — borne la borne haute. */
  ceilingPerMonth: number;
  /** Unité de la métrique (absolue, pas en %). */
  unit: string;
  /** Justification affichable. */
  rationale: string;
}

/** Semaines par mois (moyenne calendaire). */
export const WEEKS_PER_MONTH = 4.345;

export const TRAINABILITY_CAPS: Record<CappedMetricId, TrainabilityCap> = {
  vo2max: {
    typicalPerMonth: 3.0,
    ceilingPerMonth: 5.0,
    unit: "mL/kg/min",
    rationale:
      "Gains VO₂max observés ~2–3 mL/kg/min par mois chez l'athlète déjà entraîné (extrêmes ~5).",
  },
  lt2: {
    // lt2 est exprimé chez nous en % VO₂max (utilisation fractionnelle au seuil).
    typicalPerMonth: 1.0,
    ceilingPerMonth: 2.0,
    unit: "pt % VO₂max",
    rationale:
      "L'utilisation fractionnelle au MLSS évolue lentement : adaptations plus faibles et plus resserrées que le MLSS absolu.",
  },
  vlamax: {
    typicalPerMonth: 0.06,
    ceilingPerMonth: 0.1,
    unit: "mmol/L/s",
    rationale:
      "VLamax est bidirectionnelle mais lente : |Δ| < 0.1 mmol/L/s par mois dans la grande majorité des cas.",
  },
  fatmax: {
    // fatmax est exprimé chez nous en % FTP (position de l'ancre FatMax).
    typicalPerMonth: 1.5,
    ceilingPerMonth: 3.0,
    unit: "pt % FTP",
    rationale:
      "FatMax suit le couple VO₂max/VLamax : son déplacement relatif reste modeste sur un bloc.",
  },
};

export interface CapResult {
  /** Delta médian (%) après plafonnement. */
  midPct: number;
  /** Borne basse (%) après plafonnement. */
  minPct: number;
  /** Borne haute (%) après plafonnement. */
  maxPct: number;
  /** true si au moins une borne a été réduite. */
  capped: boolean;
  /** Explication courte affichable dans l'UI (null si non plafonné). */
  capNote: string | null;
}

/** Nombre de mois d'entraînement représentés par une durée en semaines. */
export function monthsFromWeeks(weeks: number | undefined | null): number {
  if (!weeks || !Number.isFinite(weeks) || weeks <= 0) return 6 / WEEKS_PER_MONTH; // défaut = 6 sem
  return weeks / WEEKS_PER_MONTH;
}

/**
 * Plafonne un delta relatif (%) pour qu'il ne dépasse pas la vitesse d'adaptation
 * réaliste de la métrique sur la durée considérée.
 *
 * @param metric      métrique concernée (les métriques non listées ne sont pas plafonnées)
 * @param currentValue valeur actuelle absolue (mL/kg/min, mmol/L/s, % VO₂max, % FTP)
 * @param minPct/maxPct amplitudes relatives projetées (déjà mises à l'échelle de la durée)
 * @param months       durée du bloc en mois
 */
export function capDeltaPct(
  metric: string,
  currentValue: number | null,
  minPct: number,
  maxPct: number,
  months: number,
): CapResult {
  const rawMid = (minPct + maxPct) / 2;
  const untouched: CapResult = { midPct: rawMid, minPct, maxPct, capped: false, capNote: null };

  const cap = TRAINABILITY_CAPS[metric as CappedMetricId];
  if (!cap) return untouched;
  if (currentValue === null || !Number.isFinite(currentValue) || currentValue === 0) return untouched;
  if (!Number.isFinite(months) || months <= 0) return untouched;

  const abs = Math.abs(currentValue);
  // Amplitudes absolues maximales admissibles sur la période
  const maxTypicalAbs = cap.typicalPerMonth * months;
  const maxCeilingAbs = cap.ceilingPerMonth * months;
  // Converties en % de la valeur actuelle
  const maxTypicalPct = (maxTypicalAbs / abs) * 100;
  const maxCeilingPct = (maxCeilingAbs / abs) * 100;

  const clampSigned = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));

  const cappedMin = clampSigned(minPct, maxCeilingPct);
  const cappedMax = clampSigned(maxPct, maxCeilingPct);
  const cappedMid = clampSigned(rawMid, maxTypicalPct);

  const capped =
    Math.abs(cappedMin - minPct) > 1e-6 ||
    Math.abs(cappedMax - maxPct) > 1e-6 ||
    Math.abs(cappedMid - rawMid) > 1e-6;

  if (!capped) return untouched;

  const perMonthAbs = (Math.abs(cappedMid) / 100) * abs / months;
  return {
    midPct: cappedMid,
    minPct: cappedMin,
    maxPct: cappedMax,
    capped: true,
    capNote:
      `Projection plafonnée à ${perMonthAbs.toFixed(perMonthAbs < 1 ? 2 : 1)} ${cap.unit}/mois. ${cap.rationale}`,
  };
}
