import {describe,expect,it} from 'vitest';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {auditMarathonHorizon} from './v351-marathon-horizon-evidence';
import type {StructuredZoneDose} from './v310-structured-zone-dose';

const thresholdId='V3P_RUN_137',marathonId='V3P_RUN_155';
const ledger=(id:string,low:number,high:number,unknown:number):StructuredZoneDose=>({
  low,mid:0,high,unknown,durationMin:low+high+unknown,
  sourceIds:[id],provenance:'v3_individually_configured_blocks_only',
});
const threshold=ledger(thresholdId,18,32,9),marathon=ledger(marathonId,16,10,2);
function planWith(horizon:16|40,opts:{falseLabel?:boolean}={}):ParsedPlan {
  const weeks=Array.from({length:horizon},(_,index)=>{
    const n=index+1;
    const phase=n<=5?'base':n<(horizon===40?35:12)?'build':
      n<=horizon-2?'peak':'taper';
    const session=(id:string,durationMin:number,title:string)=>({
      isRest:false,isKeySession:true,sport:'run',catalogId:id,
      durationMin,title,details:'',dayName:'lundi',dayIndex:0,
    });
    return {weekNumber:n,phase,theme:phase,sessions:[
      session(thresholdId,59,'Séance V3 MLSS'),
      session(marathonId,28,opts.falseLabel?'Simulation allure marathon':'Séance V3 contrôlée'),
    ]};
  });
  return {weeks,phases:[],totalWeeks:horizon,
    title:'synthetic not clinically approved'} as unknown as ParsedPlan;
}
const source={
  dose:(id:string,duration:number)=>id===thresholdId&&duration===59?threshold:
    id===marathonId&&duration===28?marathon:null,
  runningSpecific:(id:string)=>id===marathonId?
    {sourceId:id,objective:'marathon' as const}:null,
  limiterKeys:(id:string)=>id===thresholdId?
    ['fractional_utilization','threshold_tolerance']:id===marathonId?
    ['race_pace_durability']:[],
  primaryDomain:(id:string)=>id===thresholdId?'mlss':
    id===marathonId?'marathon_pace':null,
};
describe('V3.51 marathon horizon — no manufactured sport GO',()=>{
  it('refuses exactly 29 consecutive Build weeks even with credible sources',()=>{
    const result=auditMarathonHorizon(planWith(40),source);
    expect(result.verified).toBe(false);
    expect(result.excessiveBuildStreaks[0].weeks).toBe(29);
    expect(result.refusals).toContain('build_mesocycle_exceeds_six_weeks');
  });
  it('a race-specific title without approved source proof never passes',()=>{
    const result=auditMarathonHorizon(planWith(16,{falseLabel:true}),{
      ...source,runningSpecific:()=>null,
    });
    expect(result.refusals).toContain('marathon_peak_specific_dose_unproven');
  });
  it('fails closed when the threshold dose or domain is unproved',()=>{
    const result=auditMarathonHorizon(planWith(16),{
      ...source,dose:id=>id===thresholdId?null:marathon,
    });
    expect(result.tte.verified).toBe(false);
    expect(result.tte.unknownKeySessions).toBeGreaterThan(0);
    expect(result.refusals).toContain('tte_source_verified_coverage_below_30_or_unknown');
  });
  it('accepts exact synthetic MLSS and marathon sources, not scientific attestation',()=>{
    const result=auditMarathonHorizon(planWith(16),source);
    expect(result.verified).toBe(true);
    expect(result.tte.percentage).toBe(50);
    expect(result.tte.mapping).toBe('v3_mlss_threshold_tolerance_exact_work_20min');
    expect(result.peakRaceSpecificSources.length).toBeGreaterThan(0);
    expect(result.scientificAttestation).toBe(false);
    expect(result.nativeValidatorsPreserved).toBe(true);
  });
  it('does not credit 28min marathon pace as threshold TTE',()=>{
    const result=auditMarathonHorizon(planWith(16),{
      ...source,limiterKeys:id=>id===marathonId?['tte','threshold_tolerance']:[],
    });
    expect(result.tte.verifiedMatches).toBe(0);
    expect(result.tte.verified).toBe(false);
  });
});
