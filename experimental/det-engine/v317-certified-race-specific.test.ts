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
  it('refuses an approved-source provider that throws',()=>{
    expect(certifyReviewedRaceSpecificPeak(
      plan('V3P_BIKE_089'),'703',()=>{
        throw Error('source review database unavailable');
      },dose).verdict).toBe('refused');
  });
  it('refuses certification if a second peak source review provider fails, despite a valid first session',()=>{
    const base=plan('V3P_BIKE_089');
    base.weeks[0].sessions.push(plan('V3P_SWIM_194','swim',50).weeks[0].sessions[0]);
    const result=certifyReviewedRaceSpecificPeak(base,'703',id=>{
      if(id==='V3P_SWIM_194')throw Error('review store offline');
      return good(id);
    },dose);
    expect(result.verdict).toBe('refused');
    expect(result.reason).toBe('race_specific_evidence_provider_unavailable');
    expect(result.sourceIds).toEqual([]);
    expect(result.rejected).toContain('source_review_provider_error:V3P_SWIM_194');
  });
  it('refuses certification if a second peak dose provider fails, despite a valid first session',()=>{
    const base=plan('V3P_BIKE_089');
    base.weeks[0].sessions.push(plan('V3P_SWIM_194','swim',50).weeks[0].sessions[0]);
    const result=certifyReviewedRaceSpecificPeak(base,'703',
      id=>({sourceId:id,objective:'703'}),
      (id,minutes)=>{
        if(id==='V3P_SWIM_194')throw Error('dose ledger offline');
        return dose(id,minutes);
      });
    expect(result.verdict).toBe('refused');
    expect(result.reason).toBe('race_specific_evidence_provider_unavailable');
    expect(result.sourceIds).toEqual([]);
    expect(result.rejected).toContain('source_dose_provider_error:V3P_SWIM_194');
  });
  it.each([undefined,null,NaN,Infinity,0,-3])(
    'refuses a missing or invalid individualized duration %s',minutes=>{
      const base=plan('V3P_BIKE_089');
      base.weeks[0].sessions[0].durationMin=minutes as number;
      const result=certifyReviewedRaceSpecificPeak(base,'703',good,dose);
      expect(result.verdict).toBe('refused');
      expect(result.sourceIds).toEqual([]);
    });
  it('refuses an approval object with mismatched source identity',()=>{
    const result=certifyReviewedRaceSpecificPeak(plan('V3P_BIKE_089'),'703',
      ()=>({sourceId:'V3P_BIKE_038',objective:'703'}),dose);
    expect(result.verdict).toBe('refused');
    expect(result.rejected).toContain('wrong_source_or_objective:V3P_BIKE_089');
  });
  it('refuses a source dose provider that throws',()=>{
    expect(certifyReviewedRaceSpecificPeak(
      plan('V3P_BIKE_089'),'703',good,()=>{
        throw Error('missing independently measured source');
      }).verdict).toBe('refused');
  });
});
