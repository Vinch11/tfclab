import {describe,it,expect} from 'vitest';
import {repairCoachLoadCeilings,validateCoachVolumeBudgets} from '../coachVolumeValidation';

const b=(g:number)=>({maxMinutes:2000,globalWeek:g,weeklyIncreasePctMax:.1,referenceSource:'coach' as const});
const quotas={1:{weekType:'load',volumeBudget:b(1)},2:{weekType:'load',volumeBudget:b(2)}};
const s=(sport:string,durationMin:number,isKeySession=false)=>({sport,durationMin,isKeySession,title:'',details:'',isRest:false});
const plan=()=>({weeks:[
  {weekNumber:1,sessions:[s('bike',300),s('run',300)]},
  {weekNumber:2,sessions:[s('bike',300),s('run',300),s('bike',80)]}]});

describe('coach load ceiling repair',()=>{
  it('does not require S5 to reach 950 min when actual progression caps it at 918 min',()=>{
    const q={3:{weekType:'load',volumeBudget:b(3)},4:{weekType:'recovery',volumeBudget:b(4)},5:{weekType:'load',volumeBudget:{...b(5),minMinutes:950,targetMinutes:1030}}};
    const p={weeks:[{weekNumber:3,sessions:[s('bike',835)]},{weekNumber:4,sessions:[s('bike',580)]},{weekNumber:5,sessions:[s('bike',915)]}]};
    const issues=validateCoachVolumeBudgets(p as never,q);
    expect(issues.filter(i=>i.severity==='error')).toEqual([]);
    expect(issues).toContainEqual(expect.objectContaining({week:5,rule:'coach_volume_under_min',severity:'warning'}));
    expect(issues[0].message).toContain('minimum 918 min');
    expect(p.weeks[2].sessions[0].durationMin).toBe(915);
  });
  it('still refuses 915 min when the nominal 950 min minimum is attainable',()=>{
    const q={3:{weekType:'load',volumeBudget:b(3)},5:{weekType:'load',volumeBudget:{...b(5),minMinutes:950,targetMinutes:1030}}};
    const p={weeks:[{weekNumber:3,sessions:[s('bike',900)]},{weekNumber:5,sessions:[s('bike',915)]}]};
    expect(validateCoachVolumeBudgets(p as never,q)).toContainEqual(expect.objectContaining({week:5,rule:'coach_volume_under_min',severity:'error'}));
  });
  it('keeps recovery at 70 percent even when its nominal minimum is higher',()=>{
    const q={3:{weekType:'load',volumeBudget:b(3)},4:{weekType:'recovery',volumeBudget:{...b(4),minMinutes:600,targetMinutes:650}}};
    const p={weeks:[{weekNumber:3,sessions:[s('bike',800)]},{weekNumber:4,sessions:[s('bike',560)]}]};
    expect(validateCoachVolumeBudgets(p as never,q)).toEqual([]);
    p.weeks[1].sessions[0].durationMin=600;
    expect(validateCoachVolumeBudgets(p as never,q)).toContainEqual(expect.objectContaining({week:4,rule:'coach_load_violation',severity:'error'}));
  });
  it('does not repair a week down below an unreachable nominal minimum and then refuse it',()=>{
    const p=plan();
    const q={...quotas,2:{...quotas[2],volumeBudget:{...b(2),minMinutes:675,targetMinutes:700}}};
    repairCoachLoadCeilings(p as never,q);
    expect(p.weeks[1].sessions.map(x=>x.durationMin)).toEqual([300,300,60]);
    expect(validateCoachVolumeBudgets(p as never,q)).toEqual([]);
  });
  it('shortens a secondary session so a week 20 min over the ceiling is accepted',()=>{
    const p=plan();
    expect(validateCoachVolumeBudgets(p as never,quotas)).toHaveLength(1);
    repairCoachLoadCeilings(p as never,quotas);
    expect(validateCoachVolumeBudgets(p as never,quotas)).toEqual([]);
    expect(p.weeks[1].sessions.map(x=>x.durationMin)).toEqual([300,300,60]);
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
  it('an overrun of 6 min is still refused',()=>{
    const p={weeks:[{weekNumber:1,sessions:[s('bike',300),s('run',300)]},{weekNumber:2,sessions:[s('bike',336),s('run',330)]}]};
    expect(validateCoachVolumeBudgets(p as never,quotas)[0].severity).toBe('error');
  });
  it('a week that cannot be shortened does not stop the repair of the following weeks',()=>{
    const q={1:{weekType:'load',volumeBudget:b(1)},2:{weekType:'load',volumeBudget:b(2)},3:{weekType:'load',volumeBudget:b(3)}};
    const p={weeks:[
      {weekNumber:1,sessions:[s('bike',300),s('run',300)]},
      {weekNumber:2,sessions:[s('bike',400),s('run',300)]},
      {weekNumber:3,sessions:[s('bike',400),s('run',330),s('bike',80)]}]};
    repairCoachLoadCeilings(p as never,q);
    expect(p.weeks[2].sessions.map(x=>x.durationMin)).toEqual([400,330,60]);
  });
});
