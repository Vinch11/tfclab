/**
 * Courses enregistrées dans la fiche de l'athlète (athlete_race_goals) qui tombent pendant le plan
 * sans y figurer. La page Plan ne les reprend pas d'elle-même (risque de mélange entre athlètes, PR #63) :
 * on les montre au coach, qui les ajoute d'un geste. Constat du 27/11/2026 : le marathon de Séville
 * d'Emanuela était dans sa fiche et son rapport, mais absent de son plan Ironman.
 */
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";

export interface RegisteredRace { race_type: string; race_name: string | null; race_date: string }
export interface PlanRaceGoalDraft { objective: string; raceName: string; raceDate: string; priority: "A" | "B" | "C" }

const PLAN_OBJECTIVES = new Set(["IM", "703", "Marathon", "Semi", "10K", "TrailShort", "TrailMountain", "TrailUltra"]);

export function missingRegisteredRaces(
  registered: readonly RegisteredRace[],
  planGoals: readonly { raceDate?: string | null }[],
  window: { planStart: string; mainRaceDate: string | null },
): PlanRaceGoalDraft[] {
  if (!window.mainRaceDate) return [];
  const taken = new Set(planGoals.map(g => g.raceDate).filter(Boolean));
  return registered
    .filter(r => /^\d{4}-\d\d-\d\d$/.test(r.race_date) && r.race_date >= window.planStart && r.race_date < window.mainRaceDate! && !taken.has(r.race_date))
    .map(r => {
      const key = normalizeObjectiveKey(r.race_type);
      return { objective: PLAN_OBJECTIVES.has(key) ? key : r.race_type, raceName: r.race_name ?? "", raceDate: r.race_date, priority: "B" as const };
    })
    .sort((a, b) => a.raceDate.localeCompare(b.raceDate));
}
