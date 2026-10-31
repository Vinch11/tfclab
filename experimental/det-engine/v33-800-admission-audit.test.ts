import {describe,it,expect} from 'vitest';
import {v3FullCatalogue} from '../../scripts/library-v3/catalogueRuntime';
import {buildDetV3ContractFromCatalogue, type V3ReviewedSettings} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';

function objectiveForDomain(domain:string|null):string{
 if(domain==='703_pace')return '703';
 if(domain==='semi_pace')return 'semi';
 if(domain==='marathon_pace')return 'marathon';
 return 'IM';
}
describe('V3.3 — real 800-source DET admission capability under explicitly synthetic complete evidence',()=>{
 it('produces a complete per-source admission/rejection report without bypassing athlete, intensity or source gates',()=>{
  const reviews:V3ReviewedSettings[]=v3FullCatalogue.workouts.map(w=>({
   id:w.id,objective:objectiveForDomain(w.primaryDomain),
   athleteLevel:'highly_trained',athleteLevelSource:'manual',
   allPrerequisitesChecked:true,individualCoachApproval:true,
   athleteAnchors:syntheticV3ReviewAnchors(),
   ...syntheticV3SportingContext(w.id),
  }));
  const result=buildDetV3ContractFromCatalogue(reviews);
  expect(result.auditErrors).toEqual([]);
  expect(result.report.sourceCount).toBe(800);
  expect(result.report.accepted.length+result.report.rejected.length).toBe(800);
  // 800/800 under EXPLICITLY SYNTHETIC source-, athlete- and anchor-scoped
  // review; this is a technical admission proof, not real athlete approval.
  expect(result.report.accepted).toHaveLength(800);
  expect(result.report.rejected).toHaveLength(0);
  expect(result.report.accepted.every(m=>m.tags.includes('v3-intensity-anchors-individually-verified'))).toBe(true);
  const acceptedBySport=Object.fromEntries(['bike','run','swim','strength'].map(s=>[
   s,result.report.accepted.filter(x=>x.sport===s).length,
  ]));
  const counts=new Map<string,number>();
  for(const x of result.report.rejected)counts.set(x.reason,(counts.get(x.reason)??0)+1);
  const reasons=[...counts.entries()].map(([reason,count])=>({reason,count}))
    .sort((a,b)=>b.count-a.count);
  const blockedRecipeIdsByReason=Object.fromEntries([...counts.keys()].sort().map(reason=>[
   reason,result.report.rejected.filter(r=>r.reason===reason).map(r=>r.id).sort(),
  ]));
  console.info('DET_V33_800_BLOCKER_REGISTER',JSON.stringify({
   target:800,admitted:result.report.accepted.length,
   blocked:result.report.rejected.length,blockedRecipeIdsByReason,
  }));
  console.info('DET_V33_800_SOURCE_ADMISSION_AUDIT',JSON.stringify({
   admitted:result.report.accepted.length,acceptedBySport,rejected:result.report.rejected.length,
   topRejections:reasons.slice(0,25),
  }));
  expect(acceptedBySport.bike).toBe(200);
  expect(acceptedBySport.run).toBe(200);
  expect(acceptedBySport.swim).toBe(200);
  // All 200 strength sources now have a frequency-only option where source
  // duration is unmeasured; exact time remains optional, never inferred.
  expect(acceptedBySport.strength).toBe(200);
  expect(result.report.accepted.filter(x=>x.sport==='strength'&&
    x.tags.includes('v3-strength-frequency-only-unknown-duration'))).toHaveLength(100);
  expect(result.report.accepted.filter(m=>m.sport!=='strength').every(m=>
    m.tags.some(t=>t.startsWith('v3-exact-duration-seconds:')))).toBe(true);
  // These three formerly unsafe sources have deliberately redefined
  // physiological stimuli. Each still needs real athlete data to become eligible.
  expect(v3FullCatalogue.workouts.find(w=>w.id==='V3P_BIKE_024')?.primaryIntent).toBe('technique_economy');
  expect(v3FullCatalogue.workouts.find(w=>w.id==='V3P_SWIM_020')?.primaryIntent).toBe('technique_economy');
  expect(v3FullCatalogue.workouts.find(w=>w.id==='V3P_SWIM_083')?.blocks.some(b=>b.kind==='repeat'&&
    b.steps.some(x=>x.kind==='distance'&&x.meters?.base===25))).toBe(true);
  expect(result.report.accepted.every(x=>x.tags.includes('v3-sporting-source-individually-reviewed-candidate'))).toBe(true);
 });
});
