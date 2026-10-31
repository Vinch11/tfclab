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

/** V310: optional verified clock proof for adjacent-day source recovery.
 * Unlike calendar-only screening, this path MUST have exact coach-confirmed
 * slot starts for both the prescribed source and its next sport exposure,
 * plus the chosen source's individually confirmed duration. A missing or
 * inconsistent clock never becomes an assumed 08:00 session.
 * The independent final auditSourceRecoveryTiming remains mandatory. */
import type {CoachSessionStart} from './v33-recovery-timing';
export type ConfirmedSlotStart=(slot:ScheduledSport)=>CoachSessionStart|null|undefined;
const validStart=(x:CoachSessionStart|null|undefined):x is CoachSessionStart=>
  x?.provenance==='coach_confirmed'&&
  Number.isSafeInteger(x.minuteOfDay)&&x.minuteOfDay>=0&&x.minuteOfDay<1440&&
  Number.isSafeInteger(x.utcOffsetMinutes)&&x.utcOffsetMinutes>=-720&&x.utcOffsetMinutes<=840;
export function calendarOrConfirmedClockRecoverySafe(
  here:ScheduledSport,sourceDurationMin:number|undefined,
  requirements:readonly V3RecoveryRequirement[],
  allSlots:readonly ScheduledSport[],confirmedStart?:ConfirmedSlotStart,
):boolean {
  if(calendarOnlyRecoverySafe(here,requirements,allSlots))return true;
  if(!confirmedStart||typeof sourceDurationMin!=='number'||
     !Number.isFinite(sourceDurationMin)||sourceDurationMin<=0)return false;
  const absolute=(slot:ScheduledSport)=>(slot.week-1)*7+slot.dayIndex;
  if(!Number.isSafeInteger(here.week)||here.week<1||
     !Number.isSafeInteger(here.dayIndex)||here.dayIndex<0||here.dayIndex>6)return false;
  const thisDay=absolute(here);
  const current=confirmedStart(here);
  if(!validStart(current))return false;
  const clockMinutes=(slot:ScheduledSport,clock:CoachSessionStart)=>
    absolute(slot)*1440+clock.minuteOfDay-clock.utcOffsetMinutes;
  for(const req of requirements){
    if(!req.sourceId?.trim()||!['swim','bike','run','strength'].includes(req.sport)||
       !Number.isFinite(req.hours)||req.hours<0)return false;
    if(req.hours===0)continue;
    const today=allSlots.filter(slot=>absolute(slot)===thisDay&&serves(req.sport,slot.sport));
    // Without a unique slot identity, same-day duplicate exposures cannot
    // be matched unambiguously to a coach-confirmed time; refuse.
    if(today.length>(serves(req.sport,here.sport)?1:0))return false;
    const next=allSlots.filter(slot=>absolute(slot)>thisDay&&serves(req.sport,slot.sport))
      .sort((a,b)=>absolute(a)-absolute(b))[0];
    if(!next)continue;
    const calendarGuaranteed=Math.max(0,(absolute(next)-thisDay-1)*1440);
    if(calendarGuaranteed>=req.hours*60)continue;
    const nextClock=confirmedStart(next);
    if(!validStart(nextClock))return false;
    const actualGap=clockMinutes(next,nextClock)-clockMinutes(here,current)-sourceDurationMin;
    if(!Number.isFinite(actualGap)||actualGap<req.hours*60)return false;
  }
  return true;
}
