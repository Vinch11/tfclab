import {describe,expect,it} from 'vitest';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {certifyReviewedRaceSpecificPeak} from './v317-certified-race-specific';

const plan=(id:string,sport:'bike'|'run'|'swim'='bike',minutes=70):ParsedPlan=>({
  weeks:[{weekNumber:9,phase:'peak',theme:'race-specific',
    sessions:[{weekNumber:9,weekTheme:'race-specific',phase:'peak',
      dayIndex:2,dayName:'mercredi',sport,title:'Specific workout',
      details:'Duration and dose from reviewed V3 source',catalogId:id,
      durationMin:minutes,isRest:false}]}],
}) as ParsedPlan;
const good=(_:string)=>({sourceId:'V3P_BIKE_089',objective:'703' as const});
const dose=(_:string,durationMin:number)=>({low:durationMin*.9,nonLow:durationMin*.1,unknown:0});

describe('DET V317 — real reviewed race-pace evidence, no regex promotion',()=>{
  it('accepts individually reviewed goal-exact source and conserved dose',()=>{
    const result=certifyReviewedRaceSpecificPeak(
      plan('V3P_BIKE_089'),'703',good,dose);
    expect(result.verdict).toBe('verified');
    expect(result.sourceIds).toEqual(['V3P_BIKE_089']);
    expect(result.scientificAttestation).toBe(false);
  });
  it('rejects a source approved for the wrong race objective',()=>{
    const result=certifyReviewedRaceSpecificPeak(
      plan('V3P_BIKE_089'),'IM',good,dose);
    expect(result.verdict).toBe('refused');
    expect(result.rejected).toContain('wrong_source_or_objective:V3P_BIKE_089');
  });
  it('rejects text-only race-specific training with no source approval',()=>{
    expect(certifyReviewedRaceSpecificPeak(
      plan('LEGACY_RACE_PACE'),'703',()=>null,dose).verdict).toBe('refused');
  });
  it('rejects unmeasured zones and altered source duration',()=>{
    const result=certifyReviewedRaceSpecificPeak(
      plan('V3P_BIKE_089'),'703',good,()=>({
        low:25,nonLow:10,unknown:0,
      }));
    expect(result.verdict).toBe('refused');
    expect(result.rejected).toContain('missing_exact_individual_dose:V3P_BIKE_089');
  });
  it('refuses independently verified race pace in the wrong phase',()=>{
    const base=plan('V3P_BIKE_089');
    base.weeks[0].phase='build';
    expect(certifyReviewedRaceSpecificPeak(base,'703',good,dose).verdict)
      .toBe('refused');
  });
  it('refuses a source dose provider that throws',()=>{
    expect(certifyReviewedRaceSpecificPeak(
      plan('V3P_BIKE_089'),'703',good,()=>{
        throw Error('missing independently measured source');
      }).verdict).toBe('refused');
  });
});
