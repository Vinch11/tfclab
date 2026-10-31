import {describe,it,expect} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {assessPreparedGeneration} from '@/lib/plan/prevalidateTrainingPlan';
import {buildDetV3ContractFromCatalogue} from './v31-v3-catalogue';
import {constructDeterministicPlan} from './engine';
import {parseSessionDurationMin} from '@/engines/plan/planValidator';
import type {ParsedSession} from '@/lib/aiPlanParser';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';

describe('DET V3.4 — force prescribed by weekly count, not invented duration',()=>{
 const id='V3P_STRENGTH_021';
 const review={
  id,objective:'IM',athleteLevel:'trained' as const,athleteLevelSource:'manual' as const,
  individualCoachApproval:true as const,allPrerequisitesChecked:true as const,
  preferReviewedV3:true as const,athleteAnchors:syntheticV3ReviewAnchors(),
  ...syntheticV3SportingContext(id),
 };
 it('requires full individual sporting review and measured/confirmed RPE, not minute estimates',()=>{
  const missing=buildDetV3ContractFromCatalogue([{
   ...review,expectedAthleteId:undefined,sportingReview:undefined,
  }]);
  expect(missing.report.accepted).toHaveLength(0);
  const noLoad=buildDetV3ContractFromCatalogue([{...review,athleteAnchors:{}}]);
  expect(noLoad.report.accepted).toHaveLength(0);
  const verified=buildDetV3ContractFromCatalogue([review]);
  expect(verified.report.accepted).toHaveLength(1);
  expect(verified.report.accepted[0].durationMin).toEqual([0,0]);
  expect(verified.report.accepted[0].tags).toContain('v3-strength-frequency-only-unknown-duration');
  expect(verified.report.accepted[0].zones).toEqual([]);
 });
 it('does not resurrect unmeasured strength duration by parsing an exercise label',()=>{
  const example={
   sport:'strength',title:'Gainage 30 min (étiquette historique trompeuse)',
   details:'FRÉQUENCE UNIQUEMENT : durée non mesurée, aucune minute déduite | 3×30s planche',
   isRest:false,
  } as ParsedSession;
  expect(parseSessionDurationMin(example)).toBeNull();
 });
 it('presents a genuine count-only candidate to the prevalidation and deterministic solver',()=>{
  const fixture=preparePrevalidationFixture('B-IM');
  const config={...fixture.planConfig,_outputFormat:'json' as const};
  const {contract,report}=buildDetV3ContractFromCatalogue([review]);
  expect(report.accepted).toHaveLength(1);
  const preparation=prepareGenerationContracts(fixture.athleteData,config,{rotationSeed:0});
  contract.adapt(preparation,config);
  const pre=assessPreparedGeneration(config,preparation);
  expect(pre.weeks.some(w=>w.eligible.some(x=>x.id===id))).toBe(true);
  const result=constructDeterministicPlan(fixture.athleteData,config,
    {maxNodes:12000,maxMilliseconds:4000},contract);
  const selected=result.candidate?.weeks.flatMap(w=>w.sessions).filter(s=>s.catalogId===id)??[];
  console.info('DET_V34_STRENGTH_COUNT_ONLY_REAL_SOLVER',JSON.stringify({
   status:result.status,reason:result.reason,selected:selected.length,
   trace:result.trace.filter(t=>t.id===id),
   issues:result.issues.filter(x=>['blocking','error','critical'].includes(x.severity))
    .map(x=>x.code).slice(0,18),
  }));
  expect(result.sportingRelevance).toBe('not_attested');
  expect(result.humanReviewRequired).toBe(true);
  if(selected.length){
   expect(selected.every(s=>s.sport==='strength'&&s.durationMin===undefined)).toBe(true);
   expect(result.trace.filter(t=>t.id===id).every(t=>t.duration===null)).toBe(true);
   expect(result.issues.some(x=>x.code==='v3_strength_frequency_count_without_duration')).toBe(true);
   expect(result.constraintsSatisfied).toBe(false); // weekly hours unverified
  }
 });
});
