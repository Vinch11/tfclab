import {describe,it,expect} from 'vitest';
import {repairCoachLoadCeilings,validateCoachVolumeBudgets,isBlockingCoachLoadIssue} from '../coachVolumeValidation';

const b=(g:number)=>({maxMinutes:2000,globalWeek:g,weeklyIncreasePctMax:.1,referenceSource:'coach' as const});
const quotas={1:{weekType:'load',volumeBudget:b(1)},2:{weekType:'load',volumeBudget:b(2)}};
const s=(sport:string,durationMin:number,isKeySession=false)=>({sport,durationMin,isKeySession,title:'',details:'',isRest:false});
const plan=()=>({weeks:[
  {weekNumber:1,sessions:[s('bike',300),s('run',300)]},
  {weekNumber:2,sessions:[s('bike',300),s('run',300),s('bike',80)]}]});

describe('coach load ceiling repair',()=>{
  it.each(['coach_load_violation','coach_volume_under_min'])('all generation/adaptation gates refuse %s errors but not warnings',rule=>{
    expect(isBlockingCoachLoadIssue({rule,severity:'error'})).toBe(true);
    expect(isBlockingCoachLoadIssue({rule,severity:'warning'})).toBe(false);
  });
  it('does not turn initial-load review into a volume refusal',()=>{
    expect(isBlockingCoachLoadIssue({rule:'coach_initial_load_unverified',severity:'warning'})).toBe(false);
  });
  it('does not require S5 to reach 950 min when actual progression caps it at 918 min',()=>{
    const q={3:{weekType:'load',volumeBudget:b(3)},4:{weekType:'recovery',volumeBudget:b(4)},5:{weekType:'load',volumeBudget:{...b(5),minMinutes:950,targetMinutes:1030}}};
    const p={weeks:[{weekNumber:3,sessions:[s('bike',835)]},{weekNumber:4,sessions:[s('bike',580)]},{weekNumber:5,sessions:[s('bike',915)]}]};
    const issues=validateCoachVolumeBudgets(p as never,q);
    expect(issues.filter(i=>i.severity==='error')).toEqual([]);
    expect(issues).toContainEqual(expect.objectContaining({week:5,rule:'coach_volume_under_min',severity:'warning'}));
    expect(issues[0].message).toContain('minimum 918 min');
    expect(p.weeks[2].sessions[0].durationMin).toBe(915);
  });
  it('a week far below its minimum is a warning, never a refusal',()=>{
    const q={3:{weekType:'load',volumeBudget:b(3)},5:{weekType:'load',volumeBudget:{...b(5),minMinutes:950,targetMinutes:1030}}};
    const p={weeks:[{weekNumber:3,sessions:[s('bike',900)]},{weekNumber:5,sessions:[s('bike',700)]}]};
    const issues=validateCoachVolumeBudgets(p as never,q);
    expect(issues).toContainEqual(expect.objectContaining({week:5,rule:'coach_volume_under_min',severity:'warning'}));
    expect(issues.some(isBlockingCoachLoadIssue)).toBe(false);
  });
  it('recovery above 70 percent: small excess warns, large excess (>10 %) refuses',()=>{
    const q={3:{weekType:'load',volumeBudget:b(3)},4:{weekType:'recovery',volumeBudget:{...b(4),minMinutes:600,targetMinutes:650}}};
    const p={weeks:[{weekNumber:3,sessions:[s('bike',800)]},{weekNumber:4,sessions:[s('bike',560)]}]};
    expect(validateCoachVolumeBudgets(p as never,q)).toEqual([]);
    p.weeks[1].sessions[0].durationMin=600;
    expect(validateCoachVolumeBudgets(p as never,q)).toContainEqual(expect.objectContaining({week:4,rule:'coach_load_violation',severity:'warning'}));
    p.weeks[1].sessions[0].durationMin=630;
    expect(validateCoachVolumeBudgets(p as never,q)).toContainEqual(expect.objectContaining({week:4,rule:'coach_load_violation',severity:'error'}));
  });
  it('does not shorten sessions for a small excess (warning only)',()=>{
    const p=plan();
    repairCoachLoadCeilings(p as never,quotas);
    expect(p.weeks[1].sessions.map(x=>x.durationMin)).toEqual([300,300,80]);
    expect(validateCoachVolumeBudgets(p as never,quotas).every(i=>i.severity==='warning')).toBe(true);
  });
  it('shortens a secondary session so a large overload becomes acceptable',()=>{
    const p=plan(); p.weeks[1].sessions[2].durationMin=140;
    expect(validateCoachVolumeBudgets(p as never,quotas)[0].severity).toBe('error');
    repairCoachLoadCeilings(p as never,quotas);
    expect(p.weeks[1].sessions.map(x=>x.durationMin)).toEqual([300,300,105]);
    expect(validateCoachVolumeBudgets(p as never,quotas).some(isBlockingCoachLoadIssue)).toBe(false);
  });
  it('never touches key or longest sessions when that would be needed',()=>{
    const p=plan(); p.weeks[1].sessions[2].durationMin=30; p.weeks[1].sessions.push(s('run',200,true));
    repairCoachLoadCeilings(p as never,quotas);
    expect(p.weeks[1].sessions.map(x=>x.durationMin)).toEqual([300,300,30,200]);
  });
  it('an overrun of 3 min stays visible as a warning but does not refuse the plan',()=>{
    const p={weeks:[{weekNumber:1,sessions:[s('bike',300),s('run',300)]},{weekNumber:2,sessions:[s('bike',333),s('run',330)]}]};
    const issues=validateCoachVolumeBudgets(p as never,quotas);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
  });
  it('an overrun of 60 min over a 660 min ceiling warns; 70 min is refused',()=>{
    const p={weeks:[{weekNumber:1,sessions:[s('bike',300),s('run',300)]},{weekNumber:2,sessions:[s('bike',390),s('run',330)]}]};
    expect(validateCoachVolumeBudgets(p as never,quotas)[0].severity).toBe('warning');
    p.weeks[1].sessions[0].durationMin=400;
    expect(validateCoachVolumeBudgets(p as never,quotas)[0].severity).toBe('error');
  });
  it('a week that cannot be shortened does not stop the repair of the following weeks',()=>{
    const q={1:{weekType:'load',volumeBudget:b(1)},2:{weekType:'load',volumeBudget:b(2)},3:{weekType:'load',volumeBudget:b(3)}};
    const p={weeks:[
      {weekNumber:1,sessions:[s('bike',300),s('run',300)]},
      {weekNumber:2,sessions:[s('bike',500),s('run',300)]},
      {weekNumber:3,sessions:[s('bike',400),s('run',330),s('bike',240)]}]};
    repairCoachLoadCeilings(p as never,q);
    expect(p.weeks[1].sessions.map(x=>x.durationMin)).toEqual([500,300]);
    expect(p.weeks[2].sessions.map(x=>x.durationMin)).toEqual([400,330,180]);
  });
});
