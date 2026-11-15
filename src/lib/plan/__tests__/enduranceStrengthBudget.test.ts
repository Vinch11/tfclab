import {describe,it,expect} from 'vitest';
import {validateCoachVolumeBudgets} from '../coachVolumeValidation';
import {prevalidatePlanWeeks} from '../../../../supabase/functions/_shared/planPrevalidation';

describe('strength outside endurance hours, not outside the calendar',()=>{
  const quotas={1:{weekType:'load',volumeBudget:{maxMinutes:1050,globalWeek:1,weeklyIncreasePctMax:.1,referenceSource:'coach' as const}}};
  const plan=(bike=1050,strength: number|undefined=45)=>({weeks:[{weekNumber:1,sessions:[
    {sport:'bike',durationMin:bike,title:'Endurance',details:'',isRest:false},
    ...[1,2].map(()=>({sport:'strength',durationMin:strength,title:'Renforcement',details:'',isRest:false}))]}]});
  it('17.5h endurance plus two 45-minute strength sessions satisfies the 17.5h endurance budget',()=>{
    expect(validateCoachVolumeBudgets(plan() as never,quotas)).toEqual([]);
    expect(plan().weeks[0].sessions.reduce((sum,s)=>sum+(s.durationMin??0),0)).toBe(1140);
  });
  it('17.5h plus one endurance minute fails regardless of the two strength sessions',()=>{
    expect(validateCoachVolumeBudgets(plan(1051) as never,quotas)).toHaveLength(1);
  });
  it('missing strength duration does not block the weekly endurance budget',()=>{
    const missing=plan(); delete missing.weeks[0].sessions[1].durationMin;
    expect(validateCoachVolumeBudgets(missing as never,quotas)).toEqual([]);
  });
  it('missing endurance duration still blocks verification of the weekly budget',()=>{
    const missing=plan(); delete missing.weeks[0].sessions[0].durationMin;
    expect(validateCoachVolumeBudgets(missing as never,quotas)).toHaveLength(1);
  });
  it('prevalidation excludes strength minutes but still detects an extra daily session',()=>{
    const quota={swim:{min:0,max:0},bike:{min:1,max:1},run:{min:0,max:0},brick:{min:0,max:0},strength:{min:2,max:2},totalSessions:{min:3,max:3},maxSessionsPerDay:2,minFullRestDays:0};
    const layout={days:[{dayName:'mardi',isRest:false,slots:[{sport:'bike' as const,minDurationMin:1050},{sport:'strength' as const,minDurationMin:45},{sport:'strength' as const,minDurationMin:45}]}]};
    const report=prevalidatePlanWeeks([{week:1,globalWeek:1,phase:'build',weekType:'load',objective:'Ironman',quota,layout,catalog:[],volumeBudget:quotas[1].volumeBudget}]);
    expect(report.weeks[0].minimumStructuredMinutes).toBe(1050);
    expect(report.issues.some(i=>i.code==='structured_floors_exceed_volume_budget')).toBe(false);
    expect(report.issues.some(i=>i.code==='layout_exceeds_daily_max'&&i.severity==='blocking')).toBe(true);
  });
});