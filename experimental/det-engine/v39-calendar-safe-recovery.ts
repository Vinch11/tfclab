/**
 * DET V3.9 — conservative, clock-free source recovery preselection.
 *
 * For a V3 source to be placed, the NEXT planned session of the same sport
 * (including bike/run exposures inside a brick) must be sufficiently far away
 * even under the worst possible clock times. We never infer a starting hour.
 *
 * This is an opt-in candidate FILTER, not a validator exemption. The final
 * auditSourceRecoveryTiming remains mandatory and authoritative.
 */
export type ScheduledSport={week:number;dayIndex:number;sport:string};
export type V3RecoveryRequirement={sourceId:string;sport:string;hours:number};
const days=(s:ScheduledSport)=>(s.week-1)*7+s.dayIndex;
function serves(requested:string,sport:string):boolean {
  return requested===sport||(sport==='brick'&&(requested==='bike'||requested==='run'));
}
export function calendarOnlyRecoverySafe(
  here:ScheduledSport,
  requirements:readonly V3RecoveryRequirement[],
  allSlots:readonly ScheduledSport[],
):boolean {
  if(!Number.isSafeInteger(here.week)||here.week<1||
     !Number.isSafeInteger(here.dayIndex)||here.dayIndex<0||here.dayIndex>6)
    return false;
  const day=days(here);
  for(const req of requirements){
    if(!req.sourceId?.trim()||!['swim','bike','run','strength'].includes(req.sport)||
       !Number.isFinite(req.hours)||req.hours<0)return false;
    if(req.hours===0)continue;
    // If another exposure of this sport is already planned on this same day,
    // zero recovery is guaranteed; exclude the candidate without guessing
    // which of the two sessions happens first.
    const today=allSlots.filter(s=>days(s)===day&&serves(req.sport,s.sport));
    if(today.length>(serves(req.sport,here.sport)?1:0))return false;
    const next=allSlots.filter(s=>days(s)>day&&serves(req.sport,s.sport))
      .reduce<number|null>((best,s)=>best===null?days(s):Math.min(best,days(s)),null);
    if(next===null)continue;
    // A Wednesday-to-Friday pair gives only 24 hours of guaranteed recovery,
    // NOT 48 hours: any session time in those two days is still possible.
    const guaranteedHours=Math.max(0,(next-day-1)*24);
    if(guaranteedHours<req.hours)return false;
  }
  return true;
}
