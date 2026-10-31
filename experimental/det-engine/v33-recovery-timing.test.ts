import {describe,it,expect} from 'vitest';
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import {auditSourceRecoveryTiming,type CoachSessionStart} from './v33-recovery-timing';

function s(week:number,day:number,sport:string,id:string,duration:number):ParsedSession{
 const days=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
 return {weekNumber:week,weekTheme:'build',phase:'build',dayIndex:day,dayName:days[day],
   sport,title:id,details:'synthetic fixture',catalogId:id,isRest:false,durationMin:duration,zones:['Z2']};
}
function plan(...sessions:ParsedSession[]):ParsedPlan{
 const weeks=[...new Set(sessions.map(s=>s.weekNumber))].map(weekNumber=>({
   weekNumber,phase:'build',theme:'build',
   sessions:sessions.filter(s=>s.weekNumber===weekNumber),
 }));
 return {title:'V33 synthetic only',phases:[],totalWeeks:Math.max(1,...weeks.map(w=>w.weekNumber)),weeks};
}
const floor=(id:string)=>id==='V3B_703_BUILD_180'
 ?[{sourceId:'V3P_RUN_041',sport:'run',hours:36},
   {sourceId:'V3P_BIKE_090',sport:'bike',hours:24}]
 :[];
describe('V33 — strict source-recovery chronology',()=>{
 it('never infers clocks for a Saturday quality brick followed by a Sunday run',()=>{
  const p=plan(s(5,5,'brick','V3B_703_BUILD_180',180),
    s(5,6,'run','LEGACY_RUN',90),s(6,1,'bike','LEGACY_BIKE',70));
  const issues=auditSourceRecoveryTiming({plan:p,sourcesForId:floor});
  expect(issues.some(x=>x.code==='v3_recovery_hours_unverified'&&
    x.message.includes('36h')&&x.message.includes('calendar-only'))).toBe(true);
 });
 it('accepts only coach-confirmed clocks that actually provide the full 36h after the preceding session END',()=>{
  const sat=s(5,5,'brick','V3B_703_BUILD_180',180),sun=s(5,6,'run','LEGACY_RUN',90);
  const p=plan(sat,sun);
  const starts=new Map([['V3B_703_BUILD_180',6*60],['LEGACY_RUN',23*60]]);
  const confirm=(session:ParsedSession):CoachSessionStart=>({
    provenance:'coach_confirmed',minuteOfDay:starts.get(session.catalogId!)!,
  });
  expect(auditSourceRecoveryTiming({plan:p,sourcesForId:floor,
    startForSession:confirm}).filter(x=>x.code==='v3_recovery_hours_unverified'))
    .toHaveLength(0);
  const tooSoon=(session:ParsedSession):CoachSessionStart=>({
    provenance:'coach_confirmed',minuteOfDay:session.catalogId==='LEGACY_RUN'?10*60:8*60,
  });
  const blocked=auditSourceRecoveryTiming({plan:p,sourcesForId:floor,startForSession:tooSoon});
  expect(blocked.some(x=>x.code==='v3_recovery_hours_unverified'&&
    x.message.includes('36h')&&x.message.includes('coach-confirmed'))).toBe(true);
 });
 it('cannot use a clock inferred from an untrusted or invalid input',()=>{
  const p=plan(s(5,5,'brick','V3B_703_BUILD_180',180),s(5,6,'run','LEGACY_RUN',90));
  const bad=auditSourceRecoveryTiming({plan:p,sourcesForId:floor,
    startForSession:()=>({provenance:'synthetic' as 'coach_confirmed',minuteOfDay:600})});
  expect(bad.some(x=>x.code==='v3_session_clock_invalid')).toBe(true);
  expect(bad.some(x=>x.code==='v3_recovery_hours_unverified')).toBe(true);
  const missing=auditSourceRecoveryTiming({plan:p,sourcesForId:floor,
    startForSession:()=>null});
  expect(missing.some(x=>x.code==='v3_recovery_hours_unverified')).toBe(true);
 });
 it('checks same-day overlap and different-week continuity',()=>{
  const a=s(2,6,'run','V3_RUN_Q',75);
  const b=s(3,1,'run','LEGACY_RUN',40);
  const c=s(2,6,'strength','SAME_DAY_STRENGTH',40);
  const source=(id:string)=>id==='V3_RUN_Q'
    ?[{sourceId:id,sport:'run',hours:24}]:[];
  const noClock=auditSourceRecoveryTiming({plan:plan(a,b),sourcesForId:source});
  expect(noClock.filter(x=>x.code==='v3_recovery_hours_unverified')).toHaveLength(0);
  const sameDay=auditSourceRecoveryTiming({plan:plan(a,c),sourcesForId:source,
    startForSession:session=>({
      provenance:'coach_confirmed',
      minuteOfDay:session.catalogId==='V3_RUN_Q'?600:630,
    })});
  expect(sameDay.some(x=>x.code==='v3_coach_session_overlap')).toBe(true);
 });
 it('never approves invalid recovery metadata by accident',()=>{
  const p=plan(s(1,1,'run','V3_BAD',45),s(1,2,'run','NEXT',50));
  const issues=auditSourceRecoveryTiming({plan:p,
    sourcesForId:id=>id==='V3_BAD'?[{sourceId:'',sport:'run',hours:NaN}]:[]});
  expect(issues.map(x=>x.code)).toContain('v3_recovery_source_contract_invalid');
 });
});