import {normalizeRepairGoal} from '../../../supabase/functions/_shared/repairSportingEquivalence';
import {coachFamilyFor,coachObjectiveKey} from '../../../experimental/det-engine/v401-coach-inputs-core';

/** The ordinary road builder may draw generic run cards from the short-road
 * pool. Calendar, goal filters, pacing, event and provenance keep the real 5 km
 * input. The strictly reviewed 10 km runner is never called for this event. */
export function ordinarySourceFamily(objective:string) {
  return coachFamilyFor(coachObjectiveKey(objective)==='5k'?'10K':objective);
}

/** Prefer exact app event identities over the shared free-text fallback. */
export function detObjectiveGoal(objective:string) {
  const key=coachObjectiveKey(objective);
  if(key==='triathlon_olympic')return 'olympic';
  if(key==='triathlon_sprint')return 'sprint';
  if(key==='triathlon_703')return 'half';
  if(key==='triathlon_ironman')return 'ironman';
  return normalizeRepairGoal(objective);
}
