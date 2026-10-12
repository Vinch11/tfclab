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
import type { LimiterGapLike } from "@/engines/plan/planValidator";

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

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DURÉE MINIMALE POUR TRAITER LES LIMITEURS DÉCLARÉS
 * ═══════════════════════════════════════════════════════════════════════════════
 * Demande coach (plan 10K/10 sem, audit "limiteurs #3/#4 jamais vraiment
 * traités") : `evaluateDurationCoherence` ci-dessus ne regarde que
 * objectif×ambition — un plan 10K de 10 sem passe ce test alors même que le
 * diagnostic a identifié 3-4 limiteurs. Le moteur de génération (voir
 * planConfigBuilder.ts RÈGLE DE PÉRIODISATION SÉQUENTIELLE : limiteur #1 =
 * priorité absolue Base/Build, #2 = priorité haute, #3+ = "intégré dans les
 * phases Build/Spécifique" seulement) a besoin de plus de semaines pour
 * donner à CHAQUE limiteur déclaré une vraie fenêtre de travail plutôt que de
 * laisser les rangs 3+ dépendre de synergies incertaines.
 *
 * Heuristique volontairement simple et non-bloquante (même esprit que
 * `computeChantierDurationWeeks`/`computeFondationDurationWeeks` dans
 * planConfigBuilder.ts, dont elle reprend le barème statut→semaines pour le
 * rang #1) :
 *   - Rang #1 : bloc dédié complet — 5 sem si "limiting", 4 si "acceptable", 3 sinon.
 *   - Rang #2 : partage ce bloc (séance clé #2 dès la Base) — delta de 1-2 sem.
 *   - Rang #3/#4 : fenêtre "Phase Spécifique" dédiée minimale — 2 sem chacun,
 *     cohérent avec le plancher PHASE_DURATION_RANGE existant plutôt qu'un
 *     simple "intégré en synergie".
 *   - +1 semaine d'affûtage, toujours nécessaire.
 * Ce n'est pas une mesure physiologique exacte — un signal d'alerte, à
 * l'image du message objectif×ambition existant.
 */
export interface LimiterDurationRequirement {
  rank: number;
  metric: string;
  status: string | undefined;
  weeksContribution: number;
}

export interface MinPlanWeeksForLimitersResult {
  minWeeks: number;
  limiterCount: number;
  breakdown: LimiterDurationRequirement[];
}

const LIMITER_TAPER_FLOOR_WEEKS = 1;

function weeksForLimiterAtRank(rank: number, status: string | undefined): number {
  if (rank === 1) {
    return status === "limiting" ? 5 : status === "acceptable" ? 4 : 3;
  }
  if (rank === 2) {
    return status === "limiting" ? 2 : 1;
  }
  // Rang 3+ : fenêtre Phase Spécifique minimale (cf. planConfigBuilder.ts
  // RÈGLE DE PÉRIODISATION — ces rangs ne sont jamais ciblés avant cette phase).
  return 2;
}

/**
 * Calcule le nombre minimal de semaines pour donner à chaque limiteur
 * identifié (classé par impact, ou par `coachLimiterOrder` si fourni — même
 * logique que `deriveLimiterKeysFromGapAnalysis`) une fenêtre de travail
 * réelle, jusqu'à 4 limiteurs (même plafond que le reste du pipeline).
 * Retourne `null` si aucun limiteur n'est identifié (pas de contrainte).
 */
export function computeMinPlanWeeksForLimiters(
  gapAnalysis: LimiterGapLike[] | undefined,
  coachLimiterOrder?: string[],
): MinPlanWeeksForLimitersResult | null {
  if (!gapAnalysis || gapAnalysis.length === 0) return null;

  let ranked = [...gapAnalysis]
    .filter((g) => g.weightedImpact > 0 && g.status !== "unknown")
    .sort((a, b) => b.weightedImpact - a.weightedImpact);

  if (coachLimiterOrder && coachLimiterOrder.length > 0) {
    ranked = ranked.sort((a, b) => {
      const idxA = coachLimiterOrder.indexOf(a.metric);
      const idxB = coachLimiterOrder.indexOf(b.metric);
      const posA = idxA >= 0 ? idxA : 999;
      const posB = idxB >= 0 ? idxB : 999;
      if (posA !== posB) return posA - posB;
      return b.weightedImpact - a.weightedImpact;
    });
  }

  ranked = ranked.slice(0, 4);
  if (ranked.length === 0) return null;

  const breakdown: LimiterDurationRequirement[] = ranked.map((g, i) => ({
    rank: i + 1,
    metric: g.metric,
    status: g.status,
    weeksContribution: weeksForLimiterAtRank(i + 1, g.status),
  }));

  const minWeeks = breakdown.reduce((sum, b) => sum + b.weeksContribution, 0) + LIMITER_TAPER_FLOOR_WEEKS;

  return { minWeeks, limiterCount: ranked.length, breakdown };
}

export interface LimiterDurationCoherenceResult {
  tooShort: boolean;
  message: string;
  result: MinPlanWeeksForLimitersResult | null;
}

/**
 * Évalue si `weeksAvailable` suffit pour les limiteurs identifiés. Message
 * non-bloquant (même esprit que `evaluateDurationCoherence`) — jamais une
 * interdiction de générer.
 */
export function evaluateLimiterDurationCoherence(
  weeksAvailable: number | null | undefined,
  gapAnalysis: LimiterGapLike[] | undefined,
  coachLimiterOrder?: string[],
): LimiterDurationCoherenceResult {
  const result = computeMinPlanWeeksForLimiters(gapAnalysis, coachLimiterOrder);
  if (!result || !Number.isFinite(weeksAvailable) || !weeksAvailable || weeksAvailable <= 0) {
    return { tooShort: false, message: "", result };
  }
  if (weeksAvailable >= result.minWeeks) {
    return { tooShort: false, message: "", result };
  }
  const detail = result.breakdown
    .map((b) => `#${b.rank} ${b.metric} (≈${b.weeksContribution} sem)`)
    .join(", ");
  return {
    tooShort: true,
    result,
    message: `⚠️ ${result.limiterCount} limiteur(s) détecté(s) — ${detail}. Une prise en charge sérieuse de tous nécessite généralement ≥${result.minWeeks} semaines (plan actuel : ${weeksAvailable}). Au-delà du rang #2, les limiteurs risquent de rester peu travaillés sur un plan aussi court.`,
  };
}
