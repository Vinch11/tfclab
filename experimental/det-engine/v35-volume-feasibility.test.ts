import {describe,it,expect} from 'vitest';
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import {auditV35BikeOnlyFeasibility,type V35WeekBudget} from './v35-volume-feasibility';

function candidate(includeLegacyBrick=false):ParsedPlan {
  const single=(sport:ParsedSession['sport'],durationMin:number,catalogId?:string):ParsedSession=>({
    weekNumber:1,weekTheme:'base',phase:'base',dayIndex:1,dayName:'mardi',
    sport,title:sport,details:'Synthetic planned minutes only',
    durationMin,catalogId,isRest:false,
  });
  return {title:'synthetic ratio maths',totalWeeks:1,phases:[],weeks:[{
    weekNumber:1,theme:'base',phase:'base',sessions:[
      single('swim',805),single('bike',1348),single('run',1290),
      ...(includeLegacyBrick?[single('brick',120,'LEGACY_NOT_VERIFIED')]:[]),
    ],
  }]};
}
const cap=(maxMinutes:number):Record<number,V35WeekBudget>=>({
  1:{weekType:'load',volumeBudget:{maxMinutes,weeklyIncreasePctMax:0.1}},
});
describe('DET V35 — necessary-condition gate, never an authorization to add load',()=>{
  it('finds exactly 57 minutes to reach 23% without changing the candidate',()=>{
    const plan=candidate(),before=JSON.stringify(plan);
    const report=auditV35BikeOnlyFeasibility(plan,cap(3500),[]);
    expect(report.knownMinutes).toEqual({swim:805,bike:1348,run:1290});
    expect(report.baselineSwimPct).toBeCloseTo(23.38077258,4);
    expect(report.requiredAdditionalBikeMinutes).toBe(57);
    expect(report.optimisticCombinedHeadroomMinutes).toBe(57);
    expect(report.verdict).toBe('room_under_caps_only_not_executable');
    expect(JSON.stringify(plan)).toBe(before);
    expect(report.interpretation).toBe('necessary_condition_only_not_a_training_prescription');
  });
  it('rejects an arithmetically impossible addition even before fatigue and source checks',()=>{
    const report=auditV35BikeOnlyFeasibility(candidate(),cap(3499),[]);
    expect(report.optimisticCombinedHeadroomMinutes).toBe(56);
    expect(report.verdict).toBe('provably_impossible_under_week_caps');
  });
  it('does not invent capacity without a declared budget',()=>{
    const report=auditV35BikeOnlyFeasibility(candidate(),{1:{weekType:'load'}},[]);
    expect(report.optimisticCombinedHeadroomMinutes).toBeNull();
    expect(report.verdict).toBe('coach_volume_ceiling_missing');
  });
  it('refuses to infer a ratio from an undecomposed historic brick',()=>{
    const report=auditV35BikeOnlyFeasibility(candidate(true),cap(4000),[]);
    expect(report.verifiedBrickMinutesUnresolved).toBe(120);
    expect(report.requiredAdditionalBikeMinutes).toBeNull();
    expect(report.verdict).toBe('baseline_not_fully_attributable');
  });
  it('flags a baseline already exceeding the ceiling rather than proposing additions',()=>{
    const report=auditV35BikeOnlyFeasibility(candidate(),cap(3442),[]);
    expect(report.verdict).toBe('baseline_exceeds_declared_ceiling');
  });
  it('does not treat the nominal 20% target as a 23% target',()=>{
    const report=auditV35BikeOnlyFeasibility(candidate(),cap(4025),[],20);
    expect(report.requiredAdditionalBikeMinutes).toBe(582);
    expect(report.verdict).toBe('room_under_caps_only_not_executable');
  });
});
