import {describe,it,expect} from 'vitest';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {certifySwimRatioCapacity} from './v39-ratio-capacity-certificate';

const plan=(minutes:(number|null)[]):Pick<ParsedPlan,'weeks'>=>({
  weeks:minutes.map((value,index)=>({
    weekNumber:index+1,theme:'base',phase:'base',
    sessions:[{
      weekNumber:index+1,weekTheme:'base',phase:'base',
      dayName:'mardi',dayIndex:1,sport:'bike',title:'Evidence',details:'',
      isRest:false,...(value===null?{}:{durationMin:value}),
    }],
  })),
});

describe('DET V39 — ratio capacity necessary, never sufficient',()=>{
  it('quantifies 70.3 impossibility at the existing allocation even after all unresolved bricks go to bike/run',()=>{
    const result=certifySwimRatioCapacity(
      {swim:760,bike:758,run:1018},750,20,plan([440,450,415]),
      [1,2,3],{1:600,2:600,3:600});
    expect(result.minimumAdditionalNonSwimMinutes).toBe(514);
    expect(result.optimisticCurrentSwimPct).toBeGreaterThan(23);
    // Spare weekly hours are only a theoretical upper bound; no selection PASS.
    expect(result.capOnlyAdditionalMinutesMaximum).toBe(495);
    expect(result.provablyImpossibleUnderWeeklyCaps).toBe(true);
    expect(result.interpretation).toBe('necessary_condition_not_feasible_schedule');
  });
  it('quantifies Ironman minimum extra non-swim minutes under strict 20% upper bound',()=>{
    const result=certifySwimRatioCapacity(
      {swim:1420,bike:2786,run:1710},0,20,plan([600]),
      [1],{1:840});
    expect(result.minimumAdditionalNonSwimMinutes).toBe(1184);
    expect(result.provablyImpossibleUnderWeeklyCaps).toBe(true);
  });
  it('never calls a numerical opening proof of source/recovery feasibility',()=>{
    const result=certifySwimRatioCapacity(
      {swim:60,bike:200,run:140},0,20,plan([300]),
      [1],{1:600});
    expect(result.minimumAdditionalNonSwimMinutes).toBe(0);
    expect(result.provablyImpossibleUnderWeeklyCaps).toBe(false);
    expect(result.interpretation).toBe('necessary_condition_not_feasible_schedule');
  });
  it('does not invent spare capacity when a training duration is unknown',()=>{
    const result=certifySwimRatioCapacity(
      {swim:140,bike:150,run:160},0,20,plan([null]),[1],{1:600});
    expect(result.capOnlyAdditionalMinutesMaximum).toBe(null);
    expect(result.provablyImpossibleUnderWeeklyCaps).toBe(null);
  });
  it('rejects corrupt inputs and does not pretend an over-cap week has spare room',()=>{
    expect(()=>certifySwimRatioCapacity(
      {swim:100,bike:-10,run:30},0,20,plan([400]),[1],{1:600})
    ).toThrow('v39_ratio_capacity_invalid_input');
    const over=certifySwimRatioCapacity(
      {swim:100,bike:20,run:20},0,20,plan([650]),[1],{1:600});
    expect(over.capOnlyAdditionalMinutesMaximum).toBe(null);
  });
});
