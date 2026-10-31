/**
 * DET V33 — prove V3 source recovery windows with optional coach-confirmed
 * clock times. Unknown clock times NEVER become 08:00 defaults.
 * No network, no athlete database, no production mutation.
 */
import type { ParsedPlan, ParsedSession } from '@/lib/aiPlanParser';

export interface CoachSessionStart {
  provenance:'coach_confirmed';
  /** Local training-day minute (00:00 = 0, 23:59 = 1439). */
  minuteOfDay:number;
}
export type SourceRecoveryFloor={sourceId:string;sport:string;hours:number};
export type RecoveryTimingIssue={
  code:'v3_recovery_hours_unverified'|'v3_recovery_source_contract_invalid'|
       'v3_session_clock_invalid'|'v3_coach_session_overlap';
  week:number;severity:'blocking';message:string;
};
export interface RecoveryTimingInput {
  plan:ParsedPlan;
  sourcesForId:(id:string)=>readonly SourceRecoveryFloor[];
  /** Optional clock time with explicit coach-confirmed provenance; never inferred. */
  startForSession?:(session:ParsedSession)=>CoachSessionStart|null|undefined;
}

const MINUTES_PER_DAY=1440;
function starts(session:ParsedSession,source?:RecoveryTimingInput['startForSession']):number|null {
  const time=source?.(session);
  if(time===undefined||time===null)return null;
  if(time.provenance!=='coach_confirmed'||!Number.isSafeInteger(time.minuteOfDay)||
    time.minuteOfDay<0||time.minuteOfDay>=MINUTES_PER_DAY)
    throw Error('v3_session_clock_invalid');
  return time.minuteOfDay;
}
function serves(requested:string,sport:string):boolean {
  return requested===sport||(sport==='brick'&&(requested==='bike'||requested==='run'));
}
type Entry={session:ParsedSession;week:number;day:number;start:number|null};
export function auditSourceRecoveryTiming(input:RecoveryTimingInput):RecoveryTimingIssue[] {
  const issues:RecoveryTimingIssue[]=[];
  const source=input.startForSession;
  const records:Entry[]=[];
  for(const week of input.plan.weeks)for(const session of week.sessions){
    if(session.isRest)continue;
    let start:number|null=null;
    try{start=starts(session,source);}
    catch{
      issues.push({code:'v3_session_clock_invalid',week:week.weekNumber,severity:'blocking',
        message:'Invalid coach-confirmed session clock for S'+week.weekNumber+' '+session.dayName});
    }
    const day=(week.weekNumber-1)*7+session.dayIndex;
    if(!Number.isSafeInteger(day)||session.dayIndex<0||session.dayIndex>6){
      issues.push({code:'v3_session_clock_invalid',week:week.weekNumber,severity:'blocking',
        message:'Session calendar position unavailable'});
      continue;
    }
    records.push({session,week:week.weekNumber,day,start});
  }
  records.sort((a,b)=>a.day-b.day||((a.start??0)-(b.start??0)));
  // Only compare time windows when BOTH clocks are coach-confirmed.
  for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
    const a=records[i],b=records[j];
    if(b.day!==a.day)break;
    if(a.start===null||b.start===null)continue;
    if(!(Number.isFinite(a.session.durationMin)&&Number.isFinite(b.session.durationMin)))continue;
    if(a.start+(a.session.durationMin??0)>b.start)
      issues.push({code:'v3_coach_session_overlap',week:b.week,severity:'blocking',
        message:'Coach-confirmed clock overlap on '+a.session.dayName+' S'+a.week});
  }
  for(let i=0;i<records.length;i++){
    const current=records[i];
    const id=current.session.catalogId;
    if(!id)continue;
    const requirements=input.sourcesForId(id);
    for(const requirement of requirements){
      if(!Number.isFinite(requirement.hours)||requirement.hours<0||
         !requirement.sourceId.trim()||!['swim','bike','run','strength'].includes(requirement.sport)){
        issues.push({code:'v3_recovery_source_contract_invalid',week:current.week,severity:'blocking',
          message:'Invalid V3 recovery requirement for '+id});
        continue;
      }
      if(requirement.hours===0)continue;
      const following=records.slice(i+1).find(other=>serves(requirement.sport,other.session.sport));
      if(!following)continue;
      const requiredMinutes=requirement.hours*60;
      const guaranteedGap=Math.max(0,(following.day-current.day-1)*MINUTES_PER_DAY);
      const duration=current.session.durationMin;
      const verifiedGap=current.start!==null&&following.start!==null&&
        typeof duration==='number'&&Number.isFinite(duration)&&duration>0
        ?(following.day*MINUTES_PER_DAY+following.start)-
          (current.day*MINUTES_PER_DAY+current.start+duration)
        :null;
      // A confirmed clock is a tighter proof than conservative calendar-only
      // lower bound. If clock evidence is incomplete, never use its fragments.
      const provenMinutes=verifiedGap??guaranteedGap;
      if(provenMinutes<requiredMinutes){
        issues.push({code:'v3_recovery_hours_unverified',week:current.week,severity:'blocking',
          message:'Source '+requirement.sourceId+' requires '+requirement.hours+'h after '+
            current.session.dayName+' S'+current.week+', next '+requirement.sport+' on '+
            following.session.dayName+' S'+following.week+', proved gap '+
            Math.max(0,provenMinutes/60).toFixed(2)+'h ('+
            (verifiedGap===null?'calendar-only minimum, session clocks unknown':
              'coach-confirmed clocks and full preceding-session duration')+').'});
      }
    }
  }
  return issues;
}
