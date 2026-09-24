/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DURÉE DE PLAN RECOMMANDÉE — cohérence objectif × ambition
 * ═══════════════════════════════════════════════════════════════════════════════
 * Demande coach (audit fiabilité génération plan IA) : quand le coach fixe la
 * durée du plan directement (mode "X semaines", indépendant d'une date de
 * course précise), lui donner un signal non-bloquant si cette durée semble
 * incohérente avec l'objectif et l'ambition choisis — plutôt que de laisser
 * générer silencieusement un plan Ironman Elite en 4 semaines ou un plan 5K
 * Finisher en 30 semaines sans le signaler.
 *
 * Fourchettes calibrées sur la littérature d'entraînement standard (pas une
 * science exacte — volontairement large, message INFO non-bloquant, jamais
 * une interdiction). `idealMin`/`idealMax` = fenêtre confortable pour un
 * cycle de périodisation complet (base + build + peak + taper) ; `minViable`
 * = plancher sous lequel la préparation est structurellement compromise quel
 * que soit le niveau d'ambition.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";
import { classifyMultiObjectiveGoalsClient, type ClassifiableRaceGoal } from "@/lib/plan/multiObjectiveClassification";

export interface DurationRange {
  minViable: number;
  idealMin: number;
  idealMax: number;
}

const RECOMMENDED_WEEKS: Record<string, DurationRange> = {
  StartToRun: { minViable: 4, idealMin: 6, idealMax: 12 },
  "5K": { minViable: 4, idealMin: 6, idealMax: 10 },
  "10K": { minViable: 5, idealMin: 8, idealMax: 12 },
  Semi: { minViable: 8, idealMin: 10, idealMax: 16 },
  Marathon: { minViable: 10, idealMin: 16, idealMax: 20 },
  Sprint: { minViable: 5, idealMin: 8, idealMax: 12 },
  Olympic: { minViable: 6, idealMin: 10, idealMax: 16 },
  "703": { minViable: 8, idealMin: 12, idealMax: 20 },
  IM: { minViable: 14, idealMin: 20, idealMax: 28 },
  TrailShort: { minViable: 6, idealMin: 10, idealMax: 16 },
  Trail: { minViable: 8, idealMin: 12, idealMax: 18 },
  TrailMountain: { minViable: 10, idealMin: 16, idealMax: 22 },
  TrailUltra: { minViable: 14, idealMin: 20, idealMax: 30 },
};

const HIGH_AMBITION = new Set(["world_class", "elite", "competitor"]);

export type DurationCoherence = "too_short" | "short_for_ambition" | "ok" | "long";

export interface DurationCoherenceResult {
  coherence: DurationCoherence;
  message: string;
  range: DurationRange | null;
}

/**
 * Évalue la cohérence d'une durée de plan (en semaines) pour un objectif et
 * une ambition donnés. Retourne `range: null` si l'objectif n'a pas de
 * référentiel connu — dans ce cas `coherence` vaut toujours "ok" (pas de
 * faux avertissement sur un objectif non couvert).
 */
export function evaluateDurationCoherence(
  weeks: number,
  objective: string | undefined,
  ambition: string | undefined,
): DurationCoherenceResult {
  const objKey = normalizeObjectiveKey(objective || "");
  const range = RECOMMENDED_WEEKS[objKey] ?? null;
  if (!range || !Number.isFinite(weeks) || weeks <= 0) {
    return { coherence: "ok", message: "", range: null };
  }

  const amb = (ambition || "").toLowerCase();
  const isHighAmbition = HIGH_AMBITION.has(amb);

  if (weeks < range.minViable) {
    return {
      coherence: "too_short",
      range,
      message: `⚠️ ${weeks} semaine(s) est court pour un objectif ${objKey} — en dessous du plancher habituellement recommandé (${range.minViable} sem min). Risque de préparation structurellement incomplète.`,
    };
  }
  if (isHighAmbition && weeks < range.idealMin) {
    return {
      coherence: "short_for_ambition",
      range,
      message: `⚠️ ${weeks} semaines est en dessous de la fenêtre confortable pour une ambition élevée sur ${objKey} (idéal ≥${range.idealMin} sem) — le cycle base/build/peak/taper complet sera compressé.`,
    };
  }
  if (weeks > range.idealMax * 1.4) {
    return {
      coherence: "long",
      range,
      message: `ℹ️ ${weeks} semaines est long pour un bloc unique sur ${objKey} (fourchette habituelle ${range.idealMin}-${range.idealMax} sem) — envisage de le découper avec un objectif intermédiaire.`,
    };
  }
  return {
    coherence: "ok",
    range,
    message: `✅ ${weeks} semaines est cohérent avec un objectif ${objKey} (fourchette habituelle ${range.idealMin}-${range.idealMax} sem).`,
  };
}

function parseIsoDateUtc(iso?: string): number | undefined {
  if (!iso) return undefined;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Semaine (1-indexée) de la course depuis `planStartDate`, ou undefined si dates indisponibles. */
function goalWeekFromStart(planStartDate: string | undefined, raceDate: string | undefined): number | undefined {
  const startUtc = parseIsoDateUtc(planStartDate);
  const raceUtc = parseIsoDateUtc(raceDate);
  if (startUtc === undefined || raceUtc === undefined) return undefined;
  const days = Math.round((raceUtc - startUtc) / (24 * 3600 * 1000));
  return days >= 0 ? Math.floor(days / 7) + 1 : undefined;
}

const DURATION_SEVERITY: Record<DurationCoherence, number> = {
  too_short: 3,
  short_for_ambition: 2,
  long: 1,
  ok: 0,
};

/**
 * Version multi-objectifs de `evaluateDurationCoherence` (demande coach,
 * audit plan Manu 40 sem, Marathon S1-S20 puis Ironman S21-S40) : comparer
 * la durée TOTALE du plan à la fourchette d'un seul objectif produit un faux
 * positif "trop long" sur un plan multi-pics légitime (40 sem > 28×1.4 pour
 * IM, alors que chaque macrocycle pris séparément est dans sa fourchette).
 *
 * Segmente le plan par macrocycle en réutilisant la même classification que
 * le fix PR #247 (`classifyMultiObjectiveGoalsClient` — seuls les objectifs
 * "pic complet" au sens `isFullPeak` délimitent un macrocycle), puis évalue
 * chaque macrocycle contre SON PROPRE objectif via `evaluateDurationCoherence`.
 * Retombe sur le comportement historique (un seul objectif) si moins de 2
 * pics complets sont détectés (raceGoals vide, ou tous B/C rapprochés).
 */
export function evaluateDurationCoherenceMultiObjective(
  totalWeeks: number,
  raceGoals: ClassifiableRaceGoal[],
  planStartDate: string | undefined,
  ambition: string | undefined,
): DurationCoherenceResult {
  const primaryObjective = raceGoals[0]?.objective;
  const classified = classifyMultiObjectiveGoalsClient(raceGoals)
    .filter(c => c.isFullPeak && c.goal.raceDate)
    .map(c => ({ ...c, goalWeek: goalWeekFromStart(planStartDate, c.goal.raceDate) }))
    .filter((c): c is typeof c & { goalWeek: number } => typeof c.goalWeek === "number" && c.goalWeek >= 1)
    .sort((a, b) => a.goalWeek - b.goalWeek);

  if (classified.length < 2) {
    return evaluateDurationCoherence(totalWeeks, primaryObjective, ambition);
  }

  let cursor = 1;
  const results: DurationCoherenceResult[] = [];
  classified.forEach((c, i) => {
    const isLast = i === classified.length - 1;
    const segEnd = isLast ? totalWeeks : c.goalWeek;
    const segWeeks = Math.max(0, segEnd - cursor + 1);
    results.push(evaluateDurationCoherence(segWeeks, c.goal.objective, ambition));
    cursor = c.goalWeek + 1;
  });

  return results.reduce((worst, r) => (DURATION_SEVERITY[r.coherence] > DURATION_SEVERITY[worst.coherence] ? r : worst), results[0]);
}
