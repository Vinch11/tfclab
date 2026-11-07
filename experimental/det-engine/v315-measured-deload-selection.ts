/** V3.15 — exact previous-week time, never a nominal "recovery" label. */
import type {ParsedSession} from '@/lib/aiPlanParser';
export function measuredTrainingMinutes(sessions:readonly ParsedSession[]):number|null{
  const active=sessions.filter(s=>!s.isRest);
  if(!active.length||active.some(s=>s.durationMin===undefined||
    !Number.isFinite(s.durationMin)||s.durationMin<=0))return null;
  return active.reduce((n,s)=>n+(s.durationMin??0),0);
}
/** Return the conservative hard cap for a >=30% real reduction. */
export function measuredRecoveryCeiling(previousMinutes:number|null|undefined):number|null{
  return typeof previousMinutes==='number'&&Number.isFinite(previousMinutes)&&
    previousMinutes>0?previousMinutes*.7:null;
}
