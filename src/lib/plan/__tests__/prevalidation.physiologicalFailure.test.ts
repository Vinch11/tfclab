import {it,expect,vi,afterEach} from 'vitest';
import * as matrix from '@/lib/v2/tfclDecisionMatrix';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {prevalidateGenerationScope} from '@/hooks/useAITrainingPlan';
import {assertPlanPrevalidation} from '../../../../supabase/functions/_shared/planPrevalidation';
afterEach(()=>vi.restoreAllMocks());
it('a swallowed decision calculation failure cannot become a successful sporting prevalidation',()=>{
 vi.spyOn(matrix,'computeTFCLDecisionMatrix').mockImplementation(()=>{throw new Error('PRIVATE_SENTINEL_DO_NOT_EXPORT');});
 const x=preparePrevalidationFixture('B-10K');
 const report=prevalidateGenerationScope(x.athleteData,{...x.planConfig,_outputFormat:'json'});
 expect(report.issues).toContainEqual({week:0,code:'decision_matrix_failed',severity:'blocking'});
 expect(report.status).toBe('blocked');
 expect(JSON.stringify(report)).not.toContain('PRIVATE_SENTINEL');
 const model=vi.fn();expect(()=>{assertPlanPrevalidation(report);model();}).toThrow('PLAN_PREVALIDATION_BLOCKED');expect(model).not.toHaveBeenCalled();
});
it('a 10K alias does not silently lose the decision matrix and its focus',()=>{
 const x=preparePrevalidationFixture('B-10K');
 expect(x.decision.strategy._matrixResult).not.toBeNull();
 expect(x.trace.decision.source).not.toBe('unavailable');
});
import * as lorang from '@/lib/v2/lorangStrategyEngine';
import {prevalidatePhysiologicalContext} from '../../../../supabase/functions/_shared/planPrevalidation';
it('reports a Lorang failure even if the decision matrix fallback succeeds; primary limiters are preserved',()=>{
 const before=preparePrevalidationFixture('B-10K');
 vi.spyOn(lorang,'computeLorangStrategy').mockImplementation(()=>{throw Error('DO_NOT_EXPORT');});
 const after=preparePrevalidationFixture('B-10K');
 expect(after.diagnostic.limiter).toEqual(before.diagnostic.limiter);
 expect(after.planConfig.identifiedLimitersRaw).toEqual(before.planConfig.identifiedLimitersRaw);
 expect(prevalidatePhysiologicalContext(after.planConfig)).toContainEqual({week:0,code:'lorang_strategy_failed',severity:'blocking'});
 expect(after.trace.diagnostic).toEqual(before.trace.diagnostic);
});
it('an unsupported complementary matrix is an explicit review, never fabricated targets or a failed primary ranking',()=>{
 const x=preparePrevalidationFixture('B-5K');
 expect(x.decision.strategy._matrixResult).toBeNull();
 expect(x.trace.diagnostic.executed).toBe(true);
 expect(prevalidatePhysiologicalContext(x.planConfig)).toEqual([{week:0,code:'decision_matrix_not_supported',severity:'warning'}]);
 expect(x.trace.diagnostic.limiters.map(l=>l.metric)).toEqual(x.planConfig.identifiedLimitersRaw??[]);
});
it('an explicitly failed or incomplete primary diagnostic blocks instead of reporting sporting success',()=>{
 expect(prevalidatePhysiologicalContext({physiologicalTrace:{diagnostic:{executed:false},decision:{executed:true,source:'diagnostic_fallback'}}}))
 .toEqual([{week:0,code:'limiter_calculation_unavailable',severity:'blocking'}]);
 expect(prevalidatePhysiologicalContext({physiologicalTrace:{}}).every(i=>i.severity==='blocking')).toBe(true);
 expect(prevalidatePhysiologicalContext({})).toEqual([]); // legacy mechanical-only contract
});
