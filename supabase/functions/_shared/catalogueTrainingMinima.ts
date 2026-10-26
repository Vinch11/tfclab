import { normalizeRepairGoal } from "./repairSportingEquivalence.ts";
type Minima = Partial<Record<"swim" | "bike" | "run" | "brick" | "strength" | "recovery" | "totalSessions", { min?: number }>>;
interface DeclaredCalendar {
 objective?: string; planStartDate?: string; globalWeekOffset?: number; raceFormat?: string | null;
 raceGoals?: Array<{objective?: string; raceDate?: string; raceFormat?: string | null}>;
}
function isoDay(value?: string): number | null {
 if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
 const ms=Date.parse(`${value}T00:00:00Z`);
 return Number.isFinite(ms) && new Date(ms).toISOString().slice(0,10)===value ? ms : null;
}
/** Catalogue coverage only: declared official events are custom, not training fiches.
 * Never changes the final quota, invents an event, or proves its presence in the plan.
 * Uses existing normalized goals and event sports; multi-day LCW is not inferred. */
export function catalogueTrainingMinimaForWeek<T extends Minima>(minima: T, config: DeclaredCalendar, localWeek: number): T {
 if (config.raceFormat && config.raceFormat !== "continuous") return minima;
 const start=isoDay(config.planStartDate);
 if (start===null) return minima;
 const globalWeek=localWeek+(config.globalWeekOffset ?? 0);
 const eventSports=new Set<"run" | "brick">();
 for (const goal of config.raceGoals ?? []) {
  if (goal.raceFormat && goal.raceFormat !== "continuous") continue;
  const day=isoDay(goal.raceDate);
  if(day===null || Math.floor((day-start)/(7*86400000))+1!==globalWeek) continue;
  const key=normalizeRepairGoal(goal.objective);
  if (["5k","10k","semi","marathon","trail_short","trail_mountain","trail_long","trail_ultra"].includes(key ?? "")) eventSports.add("run");
  else if (["half","ironman","sprint","olympic"].includes(key ?? "")) eventSports.add("brick");
 }
 let result=minima;
 for (const sport of eventSports) {
  if (minima[sport]) result={...result,[sport]:{...minima[sport],min:Math.max(0,(minima[sport]!.min ?? 0)-1)}};
 }
 return result;
}
