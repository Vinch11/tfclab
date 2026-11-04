import {describe,it,expect} from 'vitest';
import type {MergedPlan} from '@/lib/plan/mergePlanChunks';
import type {WeekQuotaEntry} from '@/lib/plan/validateWeeklyQuotas';
import {validateWeeklyQuotas} from '@/lib/plan/validateWeeklyQuotas';
import {projectCertifiedRaceEventsForTrainingQuotas} from './v315-certified-race-quota-projection';

const q={
  swim:{min:2,max:2},bike:{min:2,max:2},run:{min:2,max:2},
  brick:{min:0,max:0},strength:{min:1,max:1},
  totalSessions:{min:7,max:7},maxSessionsPerDay:2,minFullRestDays:1,
};
const sessions=[
  ['mardi',1,'swim',45],['mardi',1,'bike',140],
  ['mercredi',2,'run',90],['mercredi',2,'strength',30],
  ['jeudi',3,'swim',45],['vendredi',4,'bike',120],
  ['samedi',5,'run',100],
].map(([dayName,dayIndex,sport,durationMin])=>({
  weekNumber:12,weekTheme:'race',phase:'taper',dayName,dayIndex,sport,
  durationMin,isRest:false,isKeySession:false,custom:false,
  title:'Reviewed',details:'Approved Z2',zones:['Z2'],catalogId:'V3P_SYNTH',
}));
const event={
  weekNumber:12,weekTheme:'race',phase:'taper',dayName:'dimanche',
  dayIndex:6,sport:'brick',durationMin:0,isRest:false,
  isKeySession:true,custom:true,title:'COURSE : 70.3',
  details:'Épreuve déclarée ; durée à confirmer par le coach.',zones:[],
};
const plan=(items:unknown[]=[...sessions,event]):MergedPlan=>({
  title:'strict synthetic race week',totalWeeks:1,phases:[],
  weeks:[{weekNumber:12,theme:'race',phase:'taper',sessions:items}],
}) as unknown as MergedPlan;
const entry=():WeekQuotaEntry=>({
  weekType:'race',quota:q,floors:{
    slLongRideMin:120,slLongRunMin:90,minSwimPerWeek:2,
    longRideWeekly:true,longRunWeekly:true,minStrengthPerWeek:1,
  },
  layout:{
    officialRaceOutsideTrainingQuota:true,
    requiredEvents:[{dayName:'dimanche',sport:'brick'}],
    days:['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
      .map((dayName,i)=>({
        dayName,isRest:i===0,slots:i===6?[{sport:'brick',isRaceEvent:true}]:[],
      })),
  },
}) as unknown as WeekQuotaEntry;
const env=()=>({12:entry()});
describe('V315 — certified race cannot count as training brick',()=>{
  it('projects only the unique official race; training quotas then pass unchanged',()=>{
    const before=validateWeeklyQuotas(plan(),env());
    expect(before.some(i=>i.code==='quota_range_drift')).toBe(true);
    const projection=projectCertifiedRaceEventsForTrainingQuotas(plan(),env());
    expect(projection.verdict).toBe('verified');
    expect(projection.excludedEvents).toBe(1);
    const after=validateWeeklyQuotas(projection.projected!,env());
    expect(after.some(i=>i.code==='quota_range_drift')).toBe(false);
    expect(after.some(i=>i.code==='quota_floor_violation')).toBe(false);
    expect(plan().weeks[0].sessions).toHaveLength(8);
  });
  it('refuses absent or duplicate race evidence, never guessing a missing event',()=>{
    expect(projectCertifiedRaceEventsForTrainingQuotas(plan(sessions),env()).verdict).toBe('refused');
    expect(projectCertifiedRaceEventsForTrainingQuotas(
      plan([...sessions,event,event]),env()).verdict).toBe('refused');
    const falsified={...event,custom:false};
    expect(projectCertifiedRaceEventsForTrainingQuotas(
      plan([...sessions,falsified]),env()).verdict).toBe('refused');
  });
  it('keeps an EXTRA real training brick in quota counts',()=>{
    const withExtra=plan([...sessions,event,{
      ...sessions[0],sport:'brick',title:'Training brick',
    }]);
    const p=projectCertifiedRaceEventsForTrainingQuotas(withExtra,env());
    expect(p.verdict).toBe('refused'); // extra would violate daily capacity
  });
  it('does not suppress real physical rest and daily-capacity violations',()=>{
    const crowded=plan([...sessions,event,{
      ...sessions[0],sport:'run',title:'Extra run',
    }]);
    expect(projectCertifiedRaceEventsForTrainingQuotas(crowded,env()).reason)
      .toBe('physical_daily_capacity_or_rest_not_proven');
    const noRest=plan([...sessions,event,{
      ...sessions[0],dayName:'lundi',dayIndex:0,title:'Monday training',
    }]);
    expect(projectCertifiedRaceEventsForTrainingQuotas(noRest,env()).reason)
      .toBe('physical_daily_capacity_or_rest_not_proven');
  });
});
