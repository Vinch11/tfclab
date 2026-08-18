/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL Decorrelation Guard™ — VO₂max et VLamax sont indépendantes
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * OBSERVATION SOURCE
 * INSCYD — "The State of Endurance Performance & Optimization 2025"
 * (N = 9 468 athlètes) : la corrélation entre VO₂max et VLamax est ≈ 0.
 * Ce sont deux leviers INDÉPENDANTS : un athlète peut avoir une grosse
 * cylindrée aérobie ET une VLamax élevée, ou l'inverse.
 *
 * CONSÉQUENCE PRATIQUE
 * Une projection qui fait simultanément monter la VO₂max au maximum ET chuter
 * la VLamax au maximum décrit un "double jackpot" rarement observé sur un même
 * bloc. On ne l'interdit pas (c'est possible), mais on l'amortit et on l'annote.
 *
 * ⚠️ Statistique DESCRIPTIVE terrain : garde-fou de plausibilité uniquement,
 * jamais une calibration de nos coefficients Mader (anti-circularité).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** Seuils au-delà desquels un delta est considéré comme "amplitude forte". */
export const DECORRELATION_VO2_STRONG_PCT = 3.0;   // +3 % VO₂max sur le bloc
export const DECORRELATION_VLA_STRONG_PCT = -4.0;  // −4 % VLamax sur le bloc

/** Facteur d'amortissement appliqué à l'effet secondaire du couple. */
export const DECORRELATION_DAMP = 0.7;

export const DECORRELATION_NOTE =
  "Projection amortie : VO₂max et VLamax sont statistiquement indépendantes " +
  "(r ≈ 0). Une progression maximale simultanée sur les deux est rare sur un même bloc.";

export interface DecorrelatableMetric {
  id: string;
  deltaMidPct: number;
  deltaMin: number;
  deltaMax: number;
  current: number | null;
  projected: number | null;
  available: boolean;
  capped?: boolean;
  capNote?: string | null;
  [k: string]: unknown;
}

/**
 * Amortit le plus petit des deux effets quand VO₂max ↑ fort ET VLamax ↓ fort.
 * L'effet dominant (celui du levier) est conservé intact ; c'est le "bonus
 * collatéral" qui est réduit.
 */
export function applyDecorrelationGuard<T extends DecorrelatableMetric>(metrics: T[]): T[] {
  const vo2 = metrics.find((m) => m.id === "vo2max");
  const vla = metrics.find((m) => m.id === "vlamax");
  if (!vo2?.available || !vla?.available) return metrics;

  const strongVo2 = vo2.deltaMidPct >= DECORRELATION_VO2_STRONG_PCT;
  const strongVla = vla.deltaMidPct <= DECORRELATION_VLA_STRONG_PCT;
  if (!strongVo2 || !strongVla) return metrics;

  // Effet secondaire = celui dont l'amplitude relative est la plus faible.
  const secondary = Math.abs(vo2.deltaMidPct) <= Math.abs(vla.deltaMidPct) ? vo2 : vla;

  const damp = (v: number) => Math.round(v * DECORRELATION_DAMP * 10) / 10;
  const newMid = damp(secondary.deltaMidPct);
  const projected =
    secondary.current !== null && Number.isFinite(secondary.current)
      ? Math.round(secondary.current * (1 + newMid / 100) * 100) / 100
      : null;

  return metrics.map((m) =>
    m === secondary
      ? {
          ...m,
          deltaMidPct: newMid,
          deltaMin: damp(m.deltaMin),
          deltaMax: damp(m.deltaMax),
          projected,
          capped: true,
          capNote: m.capNote ? `${m.capNote} ${DECORRELATION_NOTE}` : DECORRELATION_NOTE,
        }
      : m,
  );
}
