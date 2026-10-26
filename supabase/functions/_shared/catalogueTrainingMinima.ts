import { normalizeRepairGoal } from "./repairSportingEquivalence.ts";
type Minima = Partial<Record<"swim" | "bike" | "run" | "brick" | "strength" | "recovery" | "totalSessions", { min?: number }>>;
interface DeclaredCalendar {
 objective?: string; planStartDate?: string; globalWeekOffset?: number;
 raceGoals?: Array<{objective?: string; raceDate?: string}>;
}
function isoDay(value?: string): number | null {
 if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
 const ms=Date.parse(`${value}T00:00:00Z`);
 return Number.isFinite(ms) && new Date(ms).toISOString().slice(0,10)===value ? ms : null;
}
/** Catalogue coverage only: a dated official 10K is custom, not a catalogue workout.
 * Never changes the final quota or proves that the event actually exists in the plan. */
export function catalogueTrainingMinimaForWeek<T extends Minima>(minima: T, config: DeclaredCalendar, localWeek: number): T {
 if (normalizeRepairGoal(config.objective)!=="10k") return minima;
 const start=isoDay(config.planStartDate);
 if (start===null) return minima;
 const globalWeek=localWeek+(config.globalWeekOffset ?? 0);
 const declared=(config.raceGoals ?? []).some(goal=>{
  const day=isoDay(goal.raceDate);
  return normalizeRepairGoal(goal.objective)==="10k" && day!==null && Math.floor((day-start)/(7*86400000))+1===globalWeek;
 });
 if (!declared || !minima.run) return minima;
 return {...minima,run:{...minima.run,min:Math.max(0,(minima.run.min ?? 0)-1)}};
}
