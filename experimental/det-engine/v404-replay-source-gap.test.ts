/** Mocked replay control-flow only; these tests do not prove sporting acceptance. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { construct }=vi.hoisted(()=>({construct:vi.fn()}));
vi.mock('./engine',()=>({constructDeterministicPlan:construct}));
import { constructDeterministicPlanWithBoundedReplays } from './v315-bounded-multiweek-replay';
import type { ExperimentalAssemblyContract, EngineResult } from './engine';
import type { PlanAthleteData, PlanConfig } from '@/hooks/useAITrainingPlan';
const result=(gap:boolean):EngineResult=>({status:'refused',technicallyConstructed:false,constraintsSatisfied:false,
  sportingRelevance:'not_attested',humanReviewRequired:true,limiterPriorities:[],nodes:gap?0:1,
  trace:gap?[]:[{week:9,sport:'bike',id:'V3P_BIKE_001',duration:35}],
  issues:[{code:gap?'det_required_horizon_source_missing':'root_search_limit',severity:'blocking',message:'mocked control-flow fixture'}],reason:gap?'required_source_missing':'root_search_limit'});
const contract={id:'mocked-replay-control',adapt:()=>{},requireReviewedHorizonSourceCoverage:true,
  exploreTriathlonTargetsBeforeLookback:true,requireFinalTriathlonMinuteRatios:true,
  requireStructuredPolarizationOnLoadWeeks:true,preferSourceBackedMultisportBalance:'triathlon_targets'} satisfies ExperimentalAssemblyContract;
const config={objective:'IM',weeksAvailable:16} as PlanConfig;
beforeEach(()=>{ construct.mockReset(); });
describe('missing source scope in bounded replay',()=>{
  it('a root missing source stops immediately without any invented plan',()=>{
    construct.mockImplementation(()=>result(true));
    const out=constructDeterministicPlanWithBoundedReplays({} as PlanAthleteData,config,{maxNodes:10000,maxMilliseconds:1000},contract);
    expect(construct).toHaveBeenCalledTimes(1);expect(out.evidence.verdict).toBe('required_source_missing');
    expect(out.result?.candidate).toBeUndefined();expect(out.result?.constraintsSatisfied).toBe(false);
  });
  it('a no-good child removing the only source does not invalidate every remaining branch or the original source review',()=>{
    construct.mockImplementation((_a,_c,_l,options:ExperimentalAssemblyContract)=>{
      const allowed=options.filterCandidate?.({id:'V3P_BIKE_001'} as never,{week:9,phase:'build',weekType:'load',dayIndex:1,slot:{sport:'bike'}});
      return result(allowed===false);
    });
    const out=constructDeterministicPlanWithBoundedReplays({} as PlanAthleteData,config,{maxNodes:10000,maxMilliseconds:1000},contract);
    expect(construct.mock.calls.length).toBeGreaterThan(9);
    expect(out.evidence.verdict).toBe('bounded_search_unresolved');
    expect(out.evidence.attempts.some(a=>a.blockers.includes('det_required_horizon_source_missing'))).toBe(true);
    expect(out.result?.issues.some(i=>i.code==='root_search_limit')).toBe(true);
    expect(out.result?.issues.some(i=>i.code==='det_required_horizon_source_missing')).toBe(false);
    expect(out.result?.candidate).toBeUndefined();
  });
});
