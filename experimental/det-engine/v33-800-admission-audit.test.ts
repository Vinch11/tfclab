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
  const acceptedBySport=Object.fromEntries(['bike','run','swim','strength'].map(s=>[
   s,result.report.accepted.filter(x=>x.sport===s).length,
  ]));
  const reasons=Object.entries(Object.groupBy(result.report.rejected,x=>x.reason))
    .map(([reason,rows])=>({reason,count:rows?.length??0}))
    .sort((a,b)=>b.count-a.count);
  console.info('DET_V33_800_SOURCE_ADMISSION_AUDIT',JSON.stringify({
   admitted:result.report.accepted.length,acceptedBySport,rejected:result.report.rejected.length,
   topRejections:reasons.slice(0,25),
  }));
  expect(acceptedBySport.bike).toBeGreaterThanOrEqual(100);
  expect(acceptedBySport.run).toBeGreaterThanOrEqual(100);
  expect(acceptedBySport.swim).toBeGreaterThanOrEqual(100);
  expect(acceptedBySport.strength).toBeGreaterThanOrEqual(100);
  expect(result.report.rejected.find(x=>x.id==='V3P_BIKE_024')?.reason).toContain('v3_sporting_gate_refused');
  expect(result.report.rejected.find(x=>x.id==='V3P_SWIM_020')?.reason).toContain('v3_sporting_gate_refused');
  expect(result.report.rejected.find(x=>x.id==='V3P_SWIM_083')?.reason).toContain('v3_sporting_gate_refused');
  expect(result.report.accepted.every(x=>x.tags.includes('v3-sporting-source-individually-reviewed-candidate'))).toBe(true);
 });
});
