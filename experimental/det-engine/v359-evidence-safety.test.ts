import {describe,expect,it} from 'vitest';
import {resolveDeclaredEvent} from './v359-declared-event';
import {multiGoalCase} from './v359-multi-goal-fixture';
import {calendarOrConfirmedClockRecoverySafe} from './v39-calendar-safe-recovery';
import {auditSourceRecoveryTiming} from './v33-recovery-timing';
import {TRIATHLON_STRICT_MINUTE_RANGES,hasExactStrictTriathlonRatio} from './v314-cumulative-ratio-search';
import {SPORT_RATIO_TARGETS} from '@/engines/plan/planValidator';
import type {ParsedPlan} from '@/lib/aiPlanParser';

describe('V359 evidence cannot be manufactured from labels or incomplete events',()=>{
  const config={planStartDate:'2026-10-26',raceGoals:multiGoalCase.declaredRaceGoals};
  it('binds the B event by its exact date and sport, with an explicit estimate',()=>{
    const event=resolveDeclaredEvent(config,8,5,'run');
    expect(event.objective).toBe('10K');
    expect(event.targetTimeMinutes).toBe(40);
    expect(()=>resolveDeclaredEvent(config,8,6,'run')).toThrow('event_date_missing_or_ambiguous');
    expect(()=>resolveDeclaredEvent(config,8,5,'bike')).toThrow('event_sport_or_explicit_duration_estimate_unverified');
    expect(()=>resolveDeclaredEvent({...config,raceGoals:config.raceGoals!.map(g=>
      ({...g,targetTimeMinutes:undefined}))},8,5,'run')).toThrow();
    expect(()=>resolveDeclaredEvent({...config,raceGoals:[config.raceGoals![0],config.raceGoals![0]]},8,5,'run')).toThrow();
  });
  it.each(['Sprint','Olympic'] as const)('%s retains its own strict native ranges',objective=>{
    expect(TRIATHLON_STRICT_MINUTE_RANGES[objective]).toEqual(SPORT_RATIO_TARGETS[objective]);
  });
  it('a sprint minute distribution is not silently certified as 70.3',()=>{
    const minutes={swim:23,bike:46,run:31};
    expect(hasExactStrictTriathlonRatio('Sprint',minutes,[])).toBe(true);
    expect(hasExactStrictTriathlonRatio('703',minutes,[])).toBe(false);
  });
  it('the official triathlon includes a swim exposure, unlike a training brick',()=>{
    const here={week:1,dayIndex:5,sport:'swim'};
    const next={week:1,dayIndex:6,sport:'brick',isRaceEvent:true};
    const requirements=[{sourceId:'V3P_SWIM_157',sport:'swim',hours:24}];
    const clock=(s:typeof here)=>({provenance:'coach_confirmed' as const,
      minuteOfDay:s.sport==='swim'?1020:360,utcOffsetMinutes:60});
    expect(calendarOrConfirmedClockRecoverySafe(here,32,requirements,[here,next],clock)).toBe(false);
    expect(calendarOrConfirmedClockRecoverySafe(here,32,requirements,[here,{...next,isRaceEvent:false}],clock)).toBe(true);
  });
  it('the independent final timing audit also refuses a swim too close to the race',()=>{
    const plan={weeks:[{weekNumber:1,sessions:[
      {dayIndex:5,dayName:'samedi',sport:'swim',title:'Seuil CSS',durationMin:32,catalogId:'V3P_SWIM_157'},
      {dayIndex:6,dayName:'dimanche',sport:'brick',title:'COURSE : Olympic',durationMin:0,custom:true},
    ]}]} as unknown as ParsedPlan;
    const issues=auditSourceRecoveryTiming({plan,
      sourcesForId:()=>[{sourceId:'V3P_SWIM_157',sport:'swim',hours:24}],
      startForSession:s=>({provenance:'coach_confirmed',minuteOfDay:s.sport==='swim'?1020:360,utcOffsetMinutes:60}),
    });
    expect(issues.some(i=>i.code==='v3_recovery_hours_unverified')).toBe(true);
  });
});
