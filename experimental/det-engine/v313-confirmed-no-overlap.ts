/**
 * DET V3.13 — proactively reject source durations crossing another
 * coach-confirmed appointment on the SAME calendar day.
 *
 * Opt-in experimental candidate FILTER only: it never invents a clock,
 * reduces mandatory rest, changes a source dose, or replaces the native
 * complete-plan overlap/recovery validators.
 */
import type {CoachSessionStart} from './v33-recovery-timing';
import type {ScheduledSport,ConfirmedSlotStart} from './v39-calendar-safe-recovery';

const validClock=(clock:CoachSessionStart|null|undefined):clock is CoachSessionStart=>
  clock?.provenance==='coach_confirmed'&&
  Number.isSafeInteger(clock.minuteOfDay)&&clock.minuteOfDay>=0&&clock.minuteOfDay<1440&&
  Number.isSafeInteger(clock.utcOffsetMinutes)&&
  clock.utcOffsetMinutes>=-720&&clock.utcOffsetMinutes<=840;

export function confirmedNoSameDayOverlap(
  here:ScheduledSport,
  duration:number|undefined,
  scheduled:readonly ScheduledSport[],
  slotClock?:ConfirmedSlotStart,
  sessionClock?:CoachSessionStart|null,
):boolean {
  if(!Number.isSafeInteger(here.week)||here.week<1||
     !Number.isSafeInteger(here.dayIndex)||here.dayIndex<0||here.dayIndex>6||
     !here.sport)return false;
  const today=scheduled.filter(s=>s.week===here.week&&s.dayIndex===here.dayIndex);
  if(today.length<=1)return true; // no same-day appointment to overlap
  // The clock interface is indexed by sport, not slot ID. More than one
  // session of the same sport today is ambiguous and must never be certified.
  if(today.filter(s=>s.sport===here.sport).length!==1)return false;
  if(typeof duration!=='number'||!Number.isFinite(duration)||duration<=0||
     !slotClock||!validClock(sessionClock))return false;
  let declared:CoachSessionStart|null|undefined;
  try{declared=slotClock(here);}catch{return false;}
  if(!validClock(declared)||declared.minuteOfDay!==sessionClock.minuteOfDay||
     declared.utcOffsetMinutes!==sessionClock.utcOffsetMinutes)return false;
  const start=declared.minuteOfDay-declared.utcOffsetMinutes;
  for(const other of today.filter(s=>s.sport!==here.sport)){
    // A duplicate OTHER sport is equally ambiguous to the clock map.
    if(today.filter(s=>s.sport===other.sport).length!==1)return false;
    let next:CoachSessionStart|null|undefined;
    try{next=slotClock(other);}catch{return false;}
    if(!validClock(next))return false;
    const otherStart=next.minuteOfDay-next.utcOffsetMinutes;
    // Earlier appointments are screened against THIS start when their
    // own candidate is considered. This source cannot cross a LATER start.
    if(otherStart>=start&&otherStart<start+duration-1e-8)return false;
  }
  return true;
}
