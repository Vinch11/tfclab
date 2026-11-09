import {it,expect,vi} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {prepareGenerationContracts} from '../prepareGenerationContracts';
import {prepareControlledPrescription} from '../controlledPrescription';
import {completePlanCoverageIssues} from '../completePlanValidation';
it.each(['B-5K','B-10K','B-SEMI','B-MARATHON','B-TRAIL-SHORT','B-70.3','B-IM'])('never fabricates reviewed physiology for %s',id=>{
 const fixture=preparePrevalidationFixture(id);
 const transport=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('UNEXPECTED_NETWORK');});
 try {
  const prepared=prepareGenerationContracts(fixture.athleteData,fixture.planConfig);
  const result=prepareControlledPrescription(fixture.planConfig,prepared);
  if(result.issues.length) expect(result.chunks).toEqual([]);
  else expect(result.chunks.flatMap(c=>c.weeks).length).toBe(fixture.planConfig.weeksAvailable);
  expect(transport).not.toHaveBeenCalled();
 } finally {transport.mockRestore();}
});
it('a 15 week result cannot pass the complete 33 week contract',()=>{
 expect(completePlanCoverageIssues({totalWeeks:33,weeks:Array.from({length:15},(_,i)=>({weekNumber:i+1,theme:'',phase:'base',sessions:[]}))},33)).toContainEqual({rule:'complete_plan_week_coverage',severity:'error',message:'Plan incomplet ou semaines incohérentes : 33 semaines attendues.'});
});
it('exact ordered 33 weeks satisfies only the completeness check',()=>{
 expect(completePlanCoverageIssues({totalWeeks:33,weeks:Array.from({length:33},(_,i)=>({weekNumber:i+1,theme:'',phase:'base',sessions:[]}))},33)).toEqual([]);
});