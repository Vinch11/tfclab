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
