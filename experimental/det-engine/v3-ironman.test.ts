import {it,expect,vi,afterEach} from 'vitest';
import {writeFileSync,mkdirSync} from 'node:fs';import {gzipSync} from 'node:zlib';
import {planningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {constructDeterministicPlan} from './engine';import {contextualizeResult} from './v2-engine';
import {validateExperimentalCandidate} from './v2-validation';
import {IRONMAN_MODELS,ironmanContract,explicitBrickComponents,auditIronmanExposure} from './v3-ironman';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it('extracts actual component ranges and exposes the existing total-duration mismatch',()=>{
 expect(explicitBrickComponents('BRICK_STAGE1_INTRO')).toEqual({bike:[45,60],run:[15,20],total:[60,80],source:'BRICK_STAGE1_INTRO'});
 expect(explicitBrickComponents('BRICK_STAGE2_BUILD')?.total).toEqual([95,135]);
 expect(explicitBrickComponents('V3_BRICK_IM_LONG')).toBeNull();
});
it('leaves the reference unchanged and refuses to adapt LCW',()=>{
 expect(ironmanContract('reference')).toBeUndefined();
 expect(()=>ironmanContract('phase_catalogue_dose')!.adapt({} as never,{objective:'IM',raceGoals:[{raceFormat:'lcw_3day'}]} as never)).toThrow('IRONMAN_CONTINUOUS_ONLY');
});
it.skipIf(!process.env.TFCL_DET_V3_IM_OUT)('compares five contracts on all forty continuous IM configurations without hiding reference violations',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const rows=[];
 for(const spec of planningCases().filter(c=>c.objective==='IM')){
  const {prepared}=preparePlanningCaseContext(spec),prep=prepareGenerationContracts(prepared.athleteData,prepared.planConfig,{rotationSeed:0});
  for(const model of IRONMAN_MODELS){
   const construct=()=>contextualizeResult(constructDeterministicPlan(prepared.athleteData,prepared.planConfig,{maxNodes:5000,maxMilliseconds:30000},ironmanContract(model)),prepared.athleteData,prepared.planConfig);
   const candidate=construct(),replay=construct();expect(candidate,`${spec.id}:${model}`).toEqual(replay);
   const originalIssues=candidate.candidate?validateExperimentalCandidate({...candidate.candidate,weeklyQuotas:prep.weeklyQuotas},prepared.athleteData,prepared.planConfig):[];
   rows.push({id:spec.id,level:spec.level,ambition:spec.ambition,effectiveAmbition:prepared.planConfig.ambition,physiology:spec.physiology,model,
    ...candidate,referenceContractIssues:originalIssues,exposure:candidate.candidate?auditIronmanExposure(candidate.candidate):null,
    experimental:true,humanReviewRequired:true});
  }
 }
 const counts=(model:string)=>{const r=rows.filter(r=>r.model===model);return {model,cases:r.length,built:r.filter(r=>r.technicallyConstructed).length,
  candidateContractConformant:r.filter(r=>r.constraintsSatisfied).length,referenceContractConformant:r.filter(r=>r.candidate&&!r.referenceContractIssues.some(i=>['error','critical','blocking'].includes(i.severity))).length,
  reasons:Object.fromEntries([...new Set(r.map(r=>r.reason??'candidate'))].map(k=>[k,r.filter(r=>(r.reason??'candidate')===k).length])),exactReplay:r.length};};
 const out=process.env.TFCL_DET_V3_IM_OUT!;mkdirSync(out,{recursive:true});
 writeFileSync(`${out}/summary.json`,JSON.stringify({version:'det-v3-im-1',models:IRONMAN_MODELS.map(counts),paidApiCalls:0,scientificValidity:'not_attested'},null,2));
 writeFileSync(`${out}/candidates.json.gz`,gzipSync(JSON.stringify(rows)));expect(rows).toHaveLength(200);expect(network).not.toHaveBeenCalled();
},900000);
