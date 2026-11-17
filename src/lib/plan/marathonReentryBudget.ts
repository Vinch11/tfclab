import {datedRaceGoals,strictRaceDate,type RaceCalendarConfig} from '../../../supabase/functions/_shared/raceCalendarProtection';
import {normalizeRepairGoal} from '../../../supabase/functions/_shared/repairSportingEquivalence';
import type {CoachVolumeBudget} from '@/engines/plan/sessionSizingMatrix';

/** Reuse the existing three-week coaching ceilings; never infer a measured history. */
export function marathonReentryBudget(config:RaceCalendarConfig,localWeek:number,referenceMinutes:number|undefined|((raceWeek:number)=>number|undefined),base:CoachVolumeBudget|undefined):CoachVolumeBudget|undefined {
 const start=strictRaceDate(config.planStartDate);
 if(start===undefined) return base;
 for(const goal of datedRaceGoals(config)) {
  if(goal.raceFormat && goal.raceFormat!=='continuous') continue;
  const date=strictRaceDate(goal.raceDate);
  if(date===undefined || normalizeRepairGoal(goal.objective)!=='marathon') continue;
  const raceWeek=Math.floor((date-start)/604800000)+1;
  const reference=typeof referenceMinutes==='function'?referenceMinutes(raceWeek):referenceMinutes;
  if(!reference || reference<=0) continue;
  const delta=localWeek+(config.globalWeekOffset??0)-raceWeek;
  const factor=delta===1?.45:delta===2?.7:delta===3?.9:undefined;
  if(factor===undefined) continue;
  return {globalWeek:localWeek+(config.globalWeekOffset??0),maxMinutes:Math.floor(Math.min(base?.maxMinutes??Infinity,reference*factor)),weeklyIncreasePctMax:base?.weeklyIncreasePctMax??0,referenceSource:base?.referenceSource??'internal-matrix'};
 }
 return base;
}