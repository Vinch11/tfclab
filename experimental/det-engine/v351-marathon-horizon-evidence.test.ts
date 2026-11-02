import {describe,expect,it} from 'vitest';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {auditMarathonHorizon} from './v351-marathon-horizon-evidence';
import type {StructuredZoneDose} from './v310-structured-zone-dose';

const id='V3P_RUN_155';
const verifiedDose:StructuredZoneDose={
  low:18,mid:0,high:8,unknown:2,durationMin:28,
  sourceIds:[id],provenance:'v3_individually_configured_blocks_only',
};
function planWith(horizon:16|40,opts:{longBuild?:boolean;falseLabel?:boolean}={}){
  const weeks=Array.from({length:horizon},(_,index)=>{
    const n=index+1;
    const phase=opts.longBuild&&n>=5&&n<horizon-2?'build':
      n<=4?'base':n<horizon-6?'build':n<horizon-2?'peak':'taper';
    return {weekNumber:n,phase,theme:phase,sessions:[{
      isRest:false,isKeySession:true,sport:'run',catalogId:id,
      durationMin:28,title:opts.falseLabel?'Allure marathon — sans preuve source':'V3 contrôlée',
      details:'',dayName:'lundi',dayIndex:0,
    }]};
  });
  return {weeks,phases:[],totalWeeks:horizon,title:'synthetic not clinically approved'} as unknown as ParsedPlan;
}
const source={
  dose:(sourceId:string,minutes:number)=>
    sourceId===id&&minutes===28?verifiedDose:null,
  runningSpecific:(sourceId:string)=>sourceId===id?
    {sourceId:id,objective:'marathon' as const}:null,
  limiterKeys:(sourceId:string)=>sourceId===id?['tte']:[],
};
describe('V3.51 marathon horizon — no manufactured sport GO',()=>{
  it('refuses 29 consecutive Build weeks even if every synthetic dose is documented',()=>{
    const report=auditMarathonHorizon(planWith(40,{longBuild:true}),source);
    expect(report.verified).toBe(false);
    expect(report.excessiveBuildStreaks[0].weeks).toBeGreaterThan(6);
    expect(report.refusals).toContain('build_mesocycle_exceeds_six_weeks');
  });
  it('requires exact source review even when the name claims race pace',()=>{
    const report=auditMarathonHorizon(planWith(16,{falseLabel:true}),{
      ...source,runningSpecific:()=>null,
    });
    expect(report.verified).toBe(false);
    expect(report.refusals).toContain('marathon_peak_specific_dose_unproven');
  });
  it('fails closed if a TTE title is not a reviewed matching dose',()=>{
    const report=auditMarathonHorizon(planWith(16),{
      ...source,dose:()=>null,
    });
    expect(report.tte.verified).toBe(false);
    expect(report.tte.unknownKeySessions).toBeGreaterThan(0);
    expect(report.refusals).toContain('tte_source_verified_coverage_below_30_or_unknown');
  });
  it('accepts internally consistent synthetic source evidence without scientific attestation',()=>{
    const report=auditMarathonHorizon(planWith(16),source);
    expect(report.verified).toBe(true);
    expect(report.tte.percentage).toBe(100);
    expect(report.peakRaceSpecificSources.length).toBeGreaterThan(0);
    expect(report.scientificAttestation).toBe(false);
    expect(report.nativeValidatorsPreserved).toBe(true);
  });
  it('rejects mismatched source minutes and missing limiter mapping',()=>{
    const broken={...source,limiterKeys:()=>null};
    const a=auditMarathonHorizon(planWith(16),broken);
    expect(a.tte.verified).toBe(false);
    const b=auditMarathonHorizon(planWith(16),{...source,
      dose:()=>({...verifiedDose,durationMin:29})});
    expect(b.refusals).toContain('marathon_peak_specific_dose_unproven');
  });
});
