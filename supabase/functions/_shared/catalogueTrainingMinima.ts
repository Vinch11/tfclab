import { normalizeRepairGoal } from "./repairSportingEquivalence.ts";
type Minima = Partial<Record<"swim" | "bike" | "run" | "brick" | "strength" | "recovery" | "totalSessions", { min?: number }>>;
interface DeclaredCalendar {
 objective?: string; raceDate?: string; planStartDate?: string; globalWeekOffset?: number; raceFormat?: string | null;
 raceGoals?: Array<{objective?: string; raceDate?: string; raceFormat?: string | null}>;
}
function declaredGoals(config: DeclaredCalendar) {
 return config.raceGoals?.length ? config.raceGoals : config.raceDate && config.objective
  ? [{ objective:config.objective, raceDate:config.raceDate, raceFormat:config.raceFormat }] : [];
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
 let result=minima;
 if(minima.bike && (minima.brick?.min??0)>0) result={...result,bike:{...minima.bike,min:Math.max(0,(minima.bike.min??0)-(minima.brick?.min??0))}};
 const start=isoDay(config.planStartDate);
 if (start===null) return result;
 const globalWeek=localWeek+(config.globalWeekOffset ?? 0);
 const eventSports=new Set<"run" | "brick">();
 for (const goal of declaredGoals(config)) {
  if (goal.raceFormat && goal.raceFormat !== "continuous") continue;
  const day=isoDay(goal.raceDate);
  if(day===null || Math.floor((day-start)/(7*86400000))+1!==globalWeek) continue;
  const key=normalizeRepairGoal(goal.objective);
  if (["5k","10k","semi","marathon","trail_short","trail_mountain","trail_long","trail_ultra"].includes(key ?? "")) eventSports.add("run");
  else if (["half","ironman","sprint","olympic"].includes(key ?? "")) eventSports.add("brick");
 }
 for (const sport of eventSports) {
  if (minima[sport]) result={...result,[sport]:{...minima[sport],min:Math.max(0,(minima[sport]!.min ?? 0)-1)}};
 }
 return result;
}

/** Calendar reservation only: never constructs an event/session or infers LCW stages. */
export function declaredRaceSlotsForWeek(config: DeclaredCalendar, localWeek: number): Array<{dayName:'lundi'|'mardi'|'mercredi'|'jeudi'|'vendredi'|'samedi'|'dimanche';sport:'run'|'brick'}> {
 if(config.raceFormat && config.raceFormat!=='continuous')return [];
 const start=isoDay(config.planStartDate);if(start===null)return [];
 const result:Array<{dayName:'lundi'|'mardi'|'mercredi'|'jeudi'|'vendredi'|'samedi'|'dimanche';sport:'run'|'brick'}>=[];
 const days=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'] as const;
 for(const goal of declaredGoals(config)){
  if(goal.raceFormat && goal.raceFormat!=='continuous')continue;
  const date=isoDay(goal.raceDate);if(date===null || Math.floor((date-start)/(7*86400000))+1!==localWeek+(config.globalWeekOffset??0))continue;
  const objective=normalizeRepairGoal(goal.objective);
  const sport=['half','ironman','sprint','olympic'].includes(objective??'')?'brick': ['5k','10k','semi','marathon','trail_short','trail_mountain','trail_long','trail_ultra'].includes(objective??'')?'run':null;
  if(!sport)continue;
  const dayName=days[new Date(date).getUTCDay()];
  if(!result.some(e=>e.dayName===dayName&&e.sport===sport))result.push({dayName,sport});
 }
 return result;
}

/** Same date/week arithmetic as the existing declared-event reservations. */
export function declaredDateWeek(planStartDate?:string,raceDate?:string):number|null {
 const start=isoDay(planStartDate),day=isoDay(raceDate);
 return start===null||day===null?null:Math.floor((day-start)/(7*86400000))+1;
}
