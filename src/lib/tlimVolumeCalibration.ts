/**
 * TLIM VOLUME CALIBRATION — 30/30 Billat
 * ─────────────────────────────────────
 * Calibre le VOLUME (nb de répétitions 30s) des séances 30/30 Billat
 * (BILLAT_RUN_30_30_INTRO/PRO) sur le Tlim@vVO2max mesuré de l'athlète
 * (protocole BILLAT_RUN_TLIM_TEST — Billat 1996), plutôt que le palier
 * fixe "Intro/Pro" générique existant.
 *
 * Règle appliquée — reprise TEXTUELLEMENT de la fiche BILLAT_RUN_TLIM_TEST
 * du catalogue (workoutLibrary.ts), déjà écrite mais jamais reliée à une
 * donnée persistée avant ce module :
 *   tlim 4 min → 2×6 reps (12 reps = 6 min à vVO2max)
 *   tlim 6 min → 2×8 reps (16 reps = 8 min à vVO2max)
 *   tlim 8 min → 3×8 reps (24 reps = 12 min à vVO2max)
 * Interpolation linéaire entre ces 3 ancres (en nombre de reps, l'unité
 * prescriptible). En dehors de la fenêtre mesurée :
 *   - tlim < 4 min : plancher à l'ancre 4 min (12 reps) — Billat qualifie
 *     ce niveau de "capacité VO2max très limitée" ; on ne descend pas plus
 *     bas plutôt que d'extrapoler sans données.
 *   - tlim > 8 min : plafond à l'ancre 8 min (24 reps) — Billat 2000 :
 *     "temps à VO2max optimal = 10-20 min par séance, au-delà = rendements
 *     décroissants et fatigue excessive" (texte déjà présent sur la fiche
 *     BILLAT_RUN_30_30_PRO). On ne prescrit jamais plus que 3×8.
 *
 * Note de précision (cf. échange avec le coach) : ce calibrage est un
 * DOSAGE STATIQUE — un seul nombre mesuré une fois, transformé en un
 * volume total pour toute la séance — PAS un modèle dynamique comme W'bal
 * (CP/W', Skiba 2012, cf. criticalPowerModel.ts) qui suit la déplétion/
 * reconstitution seconde par seconde. C'est un progrès réel par rapport au
 * palier fixe existant, mais pas la même précision qu'un modèle Vitesse
 * Critique/D' (qui n'existe pas dans cette bibliothèque).
 */

export interface Billat3030Calibration {
  /** Nombre total de répétitions de 30s à vVO2max */
  totalReps: number;
  /** Nombre de séries (regroupement, cohérent avec la convention du catalogue) */
  seriesCount: number;
  /** Répétitions par série (totalReps / seriesCount, arrondi) */
  repsPerSeries: number;
  /** Temps total accumulé à vVO2max (minutes) — totalReps × 0.5 */
  totalTimeAtVo2maxMin: number;
  /** Valeur Tlim (min) utilisée pour ce calcul */
  tlimMinUsed: number;
  /** true si tlimMinUsed a été plafonné/plancher (hors fenêtre des ancres mesurées) */
  clamped: boolean;
}

const ANCHORS: Array<{ tlimMin: number; reps: number }> = [
  { tlimMin: 4, reps: 12 }, // 2×6
  { tlimMin: 6, reps: 16 }, // 2×8
  { tlimMin: 8, reps: 24 }, // 3×8
];

/**
 * Calibre le volume 30/30 Billat à partir du Tlim@vVO2max mesuré.
 * Retourne `null` si aucune valeur exploitable (donnée absente, ≤0 ou NaN)
 * — l'appelant doit alors retomber sur le calibrage classique (palier fixe
 * Intro/Pro existant), sans modifier la fiche.
 */
export function calibrateBillat3030FromTlim(
  tlimMin: number | null | undefined,
): Billat3030Calibration | null {
  if (tlimMin == null || !Number.isFinite(tlimMin) || tlimMin <= 0) return null;

  const first = ANCHORS[0];
  const last = ANCHORS[ANCHORS.length - 1];

  let reps: number;
  let clamped = false;

  if (tlimMin <= first.tlimMin) {
    reps = first.reps;
    clamped = tlimMin < first.tlimMin;
  } else if (tlimMin >= last.tlimMin) {
    reps = last.reps;
    clamped = tlimMin > last.tlimMin;
  } else {
    let lo = first;
    let hi = last;
    for (let i = 0; i < ANCHORS.length - 1; i++) {
      if (tlimMin >= ANCHORS[i].tlimMin && tlimMin <= ANCHORS[i + 1].tlimMin) {
        lo = ANCHORS[i];
        hi = ANCHORS[i + 1];
        break;
      }
    }
    const frac = (tlimMin - lo.tlimMin) / (hi.tlimMin - lo.tlimMin);
    reps = lo.reps + frac * (hi.reps - lo.reps);
  }

  const totalReps = Math.round(reps);
  // Convention catalogue : 2 séries jusqu'à 20 reps (2×6 à 2×10), 3 séries
  // au-delà (3×8+) — reproduit exactement la progression déjà documentée
  // dans BILLAT_RUN_30_30_PRO (S1=2×8, S2=2×10, S3=3×8, S4=3×10).
  const seriesCount = totalReps <= 20 ? 2 : 3;
  const repsPerSeries = Math.round(totalReps / seriesCount);

  return {
    totalReps,
    seriesCount,
    repsPerSeries,
    totalTimeAtVo2maxMin: Math.round(totalReps * 0.5 * 10) / 10,
    tlimMinUsed: tlimMin,
    clamped,
  };
}

/** Formatte une calibration en résumé lisible pour l'affichage fiche. */
export function formatBillat3030Summary(calib: Billat3030Calibration): string {
  const clampNote = calib.clamped
    ? (calib.tlimMinUsed < 4
        ? " (plancher — capacité VO2max limitée)"
        : " (plafond — au-delà, rendements décroissants selon Billat 2000)")
    : "";
  return `${calib.seriesCount}×${calib.repsPerSeries} reps de 30s à vVO2max (${calib.totalTimeAtVo2maxMin} min accumulées) — calibré sur Tlim@vVO2max = ${calib.tlimMinUsed} min${clampNote}`;
}
