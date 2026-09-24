/**
 * MIROIR (partiel) de `supabase/functions/ai-training-plan/promptHelpers.ts`
 * (`classifyMultiObjectiveGoals`) et `supabase/functions/ai-training-plan/sportRatioMatrix.ts`
 * (`canBeIndependentPeak`, `minGapWeeksForFullPeak`) — l'edge function Deno
 * ne peut pas importer `src/`, d'où cette copie manuelle. Toute évolution de
 * la version serveur (source de vérité pour la génération réelle du plan)
 * DOIT être reportée ici.
 *
 * Portée client (audit "système de périodisation", point roadmap visuelle) :
 * `strategicRoadmap.ts` (frise PDF/diagnostic) était totalement aveugle aux
 * plans multi-objectifs (plusieurs pics de forme datés) — cette classification
 * lui permet de segmenter la frise par cycle, comme le prompt réel le fait
 * déjà depuis PR #215/#216.
 *
 * Les 5 objectifs éligibles à un pic indépendant (IM/703/Marathon/TrailUltra/
 * TrailMountain) normalisent IDENTIQUEMENT via `normalizeObjectiveKey`
 * (client) et `normalizeObjKey` (serveur) — ce ne sont pas des cas ambigus
 * comme Sprint/Olympic triathlon (cf. audit "fragmentation des conventions
 * de nommage" de cette même session), donc réutiliser le normalizer client
 * existant ici est sûr.
 */
import { normalizeObjectiveKey } from "../normalizeObjectiveKey";
import { taperWeeksForObjective } from "@/engines/plan/sessionSizingMatrix";

const INDEPENDENT_PEAK_ELIGIBLE_OBJECTIVES = new Set([
  "IM", "703", "Marathon", "TrailUltra", "TrailMountain",
]);
export function canBeIndependentPeak(objective?: string | null): boolean {
  if (!objective) return false;
  return INDEPENDENT_PEAK_ELIGIBLE_OBJECTIVES.has(normalizeObjectiveKey(String(objective)));
}

const MIN_GAP_WEEKS_FOR_FULL_PEAK: Record<string, number> = {
  IM: 12, "703": 10, Marathon: 8, TrailUltra: 12, TrailMountain: 10,
};
export function minGapWeeksForFullPeak(objective?: string | null): number {
  if (!objective) return 8;
  const key = normalizeObjectiveKey(String(objective));
  return MIN_GAP_WEEKS_FOR_FULL_PEAK[key] ?? 8;
}

export interface ClassifiableRaceGoal {
  objective: string;
  raceDate?: string;
  raceName?: string;
  priority?: "A" | "B" | "C";
}

/**
 * Champs DB minimaux nécessaires pour convertir un `RaceGoal` (forme
 * `useAthleteRaceGoals.ts`, snake_case) vers `ClassifiableRaceGoal[]` +
 * `planStartDate`. Extrait pour être réutilisé PAR LES DEUX consommateurs
 * (`Index.tsx`/`RoadmapStrategique` pour le dashboard, `ExportTools.tsx`/
 * `mapPayloadToReport.ts` pour le PDF) au lieu que chacun réécrive sa propre
 * conversion inline — exactement la classe de bug (deux implémentations qui
 * finissent par diverger silencieusement) rencontrée plusieurs fois cette
 * session (deriveRaceTargets, computeMultiObjectiveSegments).
 */
export interface DbRaceGoalForRoadmap {
  race_type: string;
  race_date: string;
  race_name?: string | null;
  plan_start_date?: string | null;
}

export function mapDbRaceGoalsForRoadmap(
  raceGoals: DbRaceGoalForRoadmap[] | null | undefined,
): { raceGoals: ClassifiableRaceGoal[]; planStartDate: string | undefined } {
  const goals = raceGoals ?? [];
  return {
    raceGoals: goals.map((g) => ({
      objective: g.race_type,
      raceDate: g.race_date,
      raceName: g.race_name ?? undefined,
      priority: "A" as const,
    })),
    planStartDate: goals.reduce<string | undefined>((earliest, g) => {
      if (!g.plan_start_date) return earliest;
      return !earliest || g.plan_start_date < earliest ? g.plan_start_date : earliest;
    }, undefined),
  };
}

export interface ClassifiedRaceGoalClient {
  goal: ClassifiableRaceGoal;
  isFullPeak: boolean;
  isLast: boolean;
  taperWeeks: number;
}

function parseIsoDateUtcClient(iso?: string): number | undefined {
  if (!iso) return undefined;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Mirror de `computeGoalWeekForConfig` (promptHelpers.ts, serveur) — semaine
 *  du plan (1-based) où tombe `raceDate`, calculée depuis `planStartDate`. */
export function computeGoalWeekFromDates(planStartDate: string | undefined, raceDate: string | undefined): number | undefined {
  const startUtc = parseIsoDateUtcClient(planStartDate);
  const raceUtc = parseIsoDateUtcClient(raceDate);
  if (startUtc === undefined || raceUtc === undefined) return undefined;
  const days = Math.round((raceUtc - startUtc) / (24 * 3600 * 1000));
  return days >= 0 ? Math.floor(days / 7) + 1 : undefined;
}

export interface ObjectiveCycleSegment {
  startWeek: number;
  endWeek: number;
  objective: string;
  goalWeek: number;
  isLastCycle: boolean;
}

/** Cohérent avec `MULTI_OBJECTIVE_REGEN_WEEKS_BETWEEN_PEAKS` (promptHelpers.ts,
 *  serveur) et `ROADMAP_REGEN_WEEKS_BETWEEN_PEAKS` (strategicRoadmap.ts). */
const OBJECTIVE_CYCLE_REGEN_WEEKS_BETWEEN_PEAKS = 2;

/**
 * Mirror client de `computeMultiObjectiveSegments` (promptHelpers.ts, serveur) —
 * segmente un plan multi-objectifs en cycles (un par pic de forme complet
 * daté), séparés par une vraie régénération de
 * `OBJECTIVE_CYCLE_REGEN_WEEKS_BETWEEN_PEAKS` semaines. `totalWeeks` est la
 * VRAIE longueur totale du plan (pas la dernière échéance datée) — le dernier
 * cycle s'étend jusque-là, comme côté serveur.
 *
 * Utilisé par `generatePlanWindowed` (useAITrainingPlan.ts, audit "structure
 * d'un plan multi-objectifs long") pour ne JAMAIS faire chevaucher une
 * fenêtre de génération HTTP sur deux cycles d'objectifs différents — sinon
 * une course intermédiaire (ex. Marathon en S22 d'un plan de 39 sem vers
 * l'Ironman) reçoit un traitement "build vers l'objectif final" au lieu de
 * son propre taper, faute pour `buildWindowRegenConfig` (planWindowRegen.ts)
 * de connaître autre chose que l'objectif final et la longueur totale du plan.
 *
 * Retourne `null` si le plan est mono-objectif (ou n'a pas ≥2 pics complets
 * datés) : l'appelant traite alors tout le plan comme un seul cycle continu
 * (comportement historique, inchangé).
 */
export function computeObjectiveCycleSegments(
  raceGoals: ClassifiableRaceGoal[] | undefined,
  planStartDate: string | undefined,
  totalWeeks: number,
): ObjectiveCycleSegment[] | null {
  if (!Array.isArray(raceGoals) || raceGoals.length < 2) return null;

  const fullPeaks = classifyMultiObjectiveGoalsClient(raceGoals)
    .filter((c) => c.isFullPeak && c.goal.raceDate)
    .map((c) => ({ ...c, goalWeek: computeGoalWeekFromDates(planStartDate, c.goal.raceDate) }))
    .filter((c): c is typeof c & { goalWeek: number } => typeof c.goalWeek === "number" && c.goalWeek >= 1 && c.goalWeek <= totalWeeks)
    .sort((a, b) => a.goalWeek - b.goalWeek);

  if (fullPeaks.length < 2) return null;

  const segments: ObjectiveCycleSegment[] = [];
  let cursor = 1;
  fullPeaks.forEach((c, i) => {
    const isLastSegment = i === fullPeaks.length - 1;
    const segEnd = isLastSegment ? totalWeeks : c.goalWeek;
    if (segEnd - cursor + 1 >= 2) {
      segments.push({
        startWeek: cursor,
        endWeek: segEnd,
        objective: String(c.goal.objective || ""),
        goalWeek: c.goalWeek,
        isLastCycle: isLastSegment,
      });
    }
    cursor = segEnd + OBJECTIVE_CYCLE_REGEN_WEEKS_BETWEEN_PEAKS + 1;
  });
  return segments.length > 0 ? segments : null;
}

export function classifyMultiObjectiveGoalsClient(raceGoals: ClassifiableRaceGoal[]): ClassifiedRaceGoalClient[] {
  const sorted = [...(raceGoals || [])].sort((a, b) => {
    if (a.raceDate && b.raceDate) return a.raceDate.localeCompare(b.raceDate);
    const prio: Record<string, number> = { A: 1, B: 2, C: 3 };
    return (prio[a.priority || "C"] || 3) - (prio[b.priority || "C"] || 3);
  });
  const dated = sorted.filter((g) => g.raceDate);

  return sorted.map((goal) => {
    const taperWeeks = taperWeeksForObjective(goal.objective);
    if (!goal.raceDate) return { goal, isFullPeak: false, isLast: false, taperWeeks };

    const idx = dated.indexOf(goal);
    const isLast = idx === dated.length - 1;
    if (isLast) return { goal, isFullPeak: true, isLast: true, taperWeeks };

    if (!canBeIndependentPeak(goal.objective)) {
      return { goal, isFullPeak: false, isLast: false, taperWeeks };
    }
    const next = dated[idx + 1];
    const d1 = new Date(goal.raceDate!).getTime();
    const d2 = new Date(next.raceDate!).getTime();
    const gapWeeks = Math.round((d2 - d1) / (7 * 24 * 3600 * 1000));
    const isFullPeak = Number.isFinite(gapWeeks) && gapWeeks >= minGapWeeksForFullPeak(goal.objective);
    return { goal, isFullPeak, isLast: false, taperWeeks };
  });
}
