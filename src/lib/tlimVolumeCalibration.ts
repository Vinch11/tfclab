/**
 * TLIM VOLUME CALIBRATION — 30/30 Billat
 * ─────────────────────────────────────
 * Calibre le VOLUME (nb de répétitions 30s) des séances 30/30 Billat
 * (BILLAT_RUN_30_30_INTRO/PRO) sur le Tlim@vVO2max mesuré de l'athlète
 * (protocole BILLAT_RUN_TLIM_TEST — Billat 1996), plutôt que le palier
 * fixe "Intro/Pro" générique existant.
 *
 * ── Ce qui est TRAÇABLE (sourcé, vérifié dans la littérature) ──────────
 * - Tlim@vVO2max moyen ≈ 6 min chez des coureurs entraînés, avec un
 *   coefficient de variation TEST-RETEST ≈ 25% (Billat & Koralsztein,
 *   "Significance of the velocity at VO2max and time to exhaustion at
 *   this velocity", 1996). Une mesure UNIQUE de "6 min" peut donc varier
 *   entre ~4.5 et ~7.5 min sur un simple retest, sans changement
 *   physiologique réel — d'où la fourchette basse/haute ci-dessous plutôt
 *   qu'un chiffre sec.
 * - Un protocole intermittent 30s@100%vVO2max / 30s@50%vVO2max jusqu'à
 *   épuisement permet d'accumuler BEAUCOUP plus de temps réel à VO2max
 *   qu'un effort continu comparable (Billat et al., "Time limit and time
 *   at VO2max during a continuous and an intermittent run", 2000 — 19
 *   répétitions → 7min51 de temps à VO2max, contre 2min42 pour la
 *   condition continue de référence de cette étude). Ce résultat confirme
 *   le PRINCIPE (l'intermittent prolonge le temps à VO2max) mais sa
 *   condition continue de comparaison était à vΔ50, PAS à 100% vVO2max
 *   (= pas exactement notre Tlim de référence) : le ratio ×2.9 observé
 *   dans cette étude précise NE SE TRANSPOSE PAS tel quel en "multiplie
 *   le Tlim continu à 100% vVO2max par 2 (ou 2.9) pour obtenir le temps
 *   de travail 30/30" — ce serait une extrapolation au-delà de ce que
 *   cette étude démontre.
 *
 * ── Ce qui NE L'EST PAS (hérité, pas re-dérivé) ─────────────────────────
 * Les 3 ancres ci-dessous sont reprises TEXTUELLEMENT de la fiche
 * BILLAT_RUN_TLIM_TEST du catalogue (workoutLibrary.ts), déjà écrites
 * avant ce module mais jamais reliées à une donnée persistée :
 *   tlim 4 min → 2×6 reps (12 reps = 6 min de travail)
 *   tlim 6 min → 2×8 reps (16 reps = 8 min de travail)
 *   tlim 8 min → 3×8 reps (24 reps = 12 min de travail)
 * Je n'ai pas trouvé, dans les sources accessibles depuis cet
 * environnement, de formule publiée reliant précisément "Tlim continu à
 * 100% vVO2max" à un volume 30/30 optimal (ni pour un ratio ×1.5 — ce que
 * ces ancres impliquent implicitement — ni pour ×2). Elles restent donc
 * un héritage du catalogue, pas une valeur re-dérivée d'un principe
 * physiologique vérifié ici. Interpolation linéaire entre ces 3 ancres
 * (en nombre de reps, l'unité prescriptible) ; en dehors de la fenêtre
 * mesurée :
 *   - tlim < 4 min : plancher à l'ancre 4 min — Billat qualifie ce niveau
 *     de "capacité VO2max très limitée" ; on ne descend pas plus bas
 *     plutôt que d'extrapoler sans données.
 *   - tlim > 8 min : plafond à l'ancre 8 min — Billat 2000 : "temps à
 *     VO2max optimal = 10-20 min par séance, au-delà = rendements
 *     décroissants et fatigue excessive" (texte déjà présent sur la fiche
 *     BILLAT_RUN_30_30_PRO). On ne prescrit jamais plus que 3×8.
 *
 * Note de précision (cf. échange avec le coach) : ce calibrage est un
 * DOSAGE STATIQUE — un ou plusieurs nombres mesurés une fois, transformés
 * en un volume total pour toute la séance — PAS un modèle dynamique comme
 * W'bal (CP/W', Skiba 2012, cf. criticalPowerModel.ts) qui suit la
 * déplétion/reconstitution seconde par seconde. C'est un progrès réel par
 * rapport au palier fixe existant, mais pas la même précision qu'un
 * modèle Vitesse Critique/D' (qui n'existe pas dans cette bibliothèque).
 */

/**
 * Coefficient de variation test-retest du Tlim@vVO2max (Billat & Koralsztein
 * 1996). Utilisé pour dériver une fourchette basse/haute plutôt qu'un
 * chiffre unique — une seule mesure de Tlim est intrinsèquement bruitée.
 */
const TLIM_TEST_RETEST_CV = 0.25;

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

export interface Billat3030Range {
  /** Calibration au Tlim mesuré tel quel — valeur "recommandée" à afficher en premier. */
  mid: Billat3030Calibration;
  /** Calibration à Tlim × (1 − CV) — borne basse de la fourchette de fiabilité test-retest. */
  low: Billat3030Calibration;
  /** Calibration à Tlim × (1 + CV) — borne haute. */
  high: Billat3030Calibration;
  /** CV utilisé pour dériver low/high (0.25 — Billat & Koralsztein 1996). */
  cvUsed: number;
}

/**
 * Variante "fourchette" de calibrateBillat3030FromTlim, tenant compte du CV
 * test-retest ≈25% du protocole Tlim (Billat & Koralsztein 1996) plutôt que
 * de traiter la mesure comme une valeur exacte. Retourne `null` dans les
 * mêmes conditions que la fonction ponctuelle (donnée absente/invalide).
 */
export function calibrateBillat3030RangeFromTlim(
  tlimMin: number | null | undefined,
): Billat3030Range | null {
  const mid = calibrateBillat3030FromTlim(tlimMin);
  if (!mid) return null;
  const low = calibrateBillat3030FromTlim(tlimMin! * (1 - TLIM_TEST_RETEST_CV))!;
  const high = calibrateBillat3030FromTlim(tlimMin! * (1 + TLIM_TEST_RETEST_CV))!;
  return { mid, low, high, cvUsed: TLIM_TEST_RETEST_CV };
}

/** Formatte une fourchette de calibration en résumé lisible pour l'affichage fiche. */
export function formatBillat3030RangeSummary(range: Billat3030Range): string {
  const { mid, low, high } = range;
  const clampNote = mid.clamped
    ? (mid.tlimMinUsed < 4
        ? " (plancher — capacité VO2max limitée)"
        : " (plafond — au-delà, rendements décroissants selon Billat 2000)")
    : "";
  const sameVolume = low.totalReps === high.totalReps;
  const rangeNote = sameVolume
    ? ""
    : ` — fourchette ${low.seriesCount}×${low.repsPerSeries} à ${high.seriesCount}×${high.repsPerSeries} compte tenu de la variabilité test-retest du test Tlim (±${Math.round(range.cvUsed * 100)}%, Billat & Koralsztein 1996)`;
  return `${mid.seriesCount}×${mid.repsPerSeries} reps de 30s à vVO2max (${mid.totalTimeAtVo2maxMin} min accumulées) — calibré sur Tlim@vVO2max = ${mid.tlimMinUsed} min${clampNote}${rangeNote}`;
}
