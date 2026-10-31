import {describe,it,expect} from 'vitest';
import {v3FullCatalogue,evaluateV3Workout} from '../../scripts/library-v3/catalogueRuntime';
import {buildDetV3ContractFromCatalogue} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {evaluateRepairSportingEquivalence} from '../../supabase/functions/_shared/repairSportingEquivalence';
import type {DaySlot} from '@/engines/plan/weeklySlotLayout';
const anchors=()=>syntheticV3ReviewAnchors();
function review(id:string,preferReviewedV3=true) {
 return {
   id,objective:'IM',athleteLevel:'highly_trained' as const,
   athleteLevelSource:'manual' as const,
   allPrerequisitesChecked:true as const, individualCoachApproval:true as const,
   ...(preferReviewedV3?{preferReviewedV3:true as const}:{}),
   athleteAnchors:anchors(),...syntheticV3SportingContext(id),
 };
}
const find=(id:string)=>v3FullCatalogue.workouts.find(w=>w.id===id)!;
describe('V3.6 — precise individual admission and physiologically honest DET selection',()=>{
 it('preserves exact bike seconds, not rounded or padded to nearest minute',()=>{
   const source=find('V3P_BIKE_014');
   const sec=evaluateV3Workout(source).seconds!;
   expect(sec).toBe(2370);
   const result=buildDetV3ContractFromCatalogue([review(source.id)]);
   expect(result.report.accepted).toHaveLength(1);
   const card=result.report.accepted[0];
   expect(card.durationMin[0]).toBe(39.5);
   expect(card.durationMin[1]).toBe(39.5);
   expect(card.tags).toContain('v3-exact-duration-seconds:2370');
   expect(card.tags).toContain('v3-subminute-duration-no-rounding');
   expect(card.structure).toContain('DURÉE CALCULÉE : 2370 secondes exactes');
   expect(evaluateV3Workout(source).seconds).toBe(2370);
 });
 it('uses individually measured swim-domain paces and preserves fractional minutes exactly',()=>{
   const source=find('V3P_SWIM_001');
   expect(evaluateV3Workout(source).status).toBe('unresolved');
   const a=anchors();
   const sec=evaluateV3Workout(source,{swimPaces:a.swimDomainPacesSecPer100m}).seconds!;
   expect(sec).toBe(1540);
   const result=buildDetV3ContractFromCatalogue([review(source.id)]);
   expect(result.report.accepted).toHaveLength(1);
   const card=result.report.accepted[0];
   expect(card.durationMin[0]*60).toBeCloseTo(sec,8);
   expect(card.tags).toContain('v3-exact-duration-seconds:1540');
   expect(card.zones.length).toBeGreaterThan(0);
   const unmeasured=buildDetV3ContractFromCatalogue([{
     ...review(source.id),swimPacesSecPer100m:undefined,
     athleteAnchors:{bikeFtpWatts:300},
   }]);
   expect(unmeasured.report.accepted).toHaveLength(0);
 });
 it('admits real mixed-stimulus structure distinctly from threshold and forbids it in recovery',()=>{
   const actual=buildDetV3ContractFromCatalogue([review('V3P_BIKE_009')]);
   expect(actual.report.accepted).toHaveLength(1);
   const mixed=actual.report.accepted[0];
   expect(mixed.intentFamily).toBe('mixed_intensity');
   expect(mixed.tags).toContain('v3-mixed-stimulus-distinct-main-domains');
   expect(mixed.zones.length).toBeGreaterThanOrEqual(2);
   expect(evaluateRepairSportingEquivalence(null,mixed,{
     objective:'IM',phase:'build',weekType:'load',operation:'insertion',
   }).compatible).toBe(true);
   const recovery=evaluateRepairSportingEquivalence(null,mixed,{
     objective:'IM',phase:'build',weekType:'recovery',operation:'insertion',
   });
   expect(recovery.compatible).toBe(false);
   expect(recovery.reasons).toContain('recovery_intent:mixed_intensity');
 });
 it('ranks explicitly reviewed, limiter-matched key sessions without misclassifying unmatched recipes',()=>{
   const fixture=preparePrevalidationFixture('B-IM');
   const cfg={...fixture.planConfig,identifiedLimitersRaw:['fractional_utilization'],
     _outputFormat:'json' as const};
   const {contract,report}=buildDetV3ContractFromCatalogue([
     review('V3P_BIKE_008'),review('V3P_BIKE_009'),
   ]);
   expect(report.accepted).toHaveLength(2);
   const preparation=prepareGenerationContracts(fixture.athleteData,cfg,{rotationSeed:0});
   contract.adapt(preparation,cfg);
   const matching=report.accepted.find(x=>x.id==='V3P_BIKE_008')!;
   const other=report.accepted.find(x=>x.id==='V3P_BIKE_009')!;
   const ctx={week:4,phase:'build',weekType:'load',dayIndex:2,
     slot:{sport:'bike',isKeySession:true,isLongSession:false} as DaySlot};
   expect(contract.filterCandidate?.(matching,ctx)).toBe(true);
   expect(contract.rankCandidate?.(matching,ctx)).toBe(-3);
   expect(contract.rankCandidate?.(other,ctx)).toBe(0);
   expect(contract.filterCandidate?.(matching,{...ctx,phase:'base'})).toBe(false);
   const notKey={...ctx,slot:{sport:'bike',isKeySession:false,isLongSession:false} as DaySlot};
   expect(contract.rankCandidate?.(matching,notKey)).toBe(-1);
   const noPriority=buildDetV3ContractFromCatalogue([review('V3P_BIKE_008',false)]);
   const prep2=prepareGenerationContracts(fixture.athleteData,cfg,{rotationSeed:0});
   noPriority.contract.adapt(prep2,cfg);
   expect(noPriority.contract.rankCandidate?.(noPriority.report.accepted[0],ctx)).toBe(0);
   const cfgUnknown={...cfg,identifiedLimitersRaw:['something_unproven']};
   const unknown=buildDetV3ContractFromCatalogue([review('V3P_BIKE_008')]);
   const prep3=prepareGenerationContracts(fixture.athleteData,cfgUnknown,{rotationSeed:0});
   unknown.contract.adapt(prep3,cfgUnknown);
   expect(unknown.contract.rankCandidate?.(unknown.report.accepted[0],ctx)).toBe(0);
 });
 it('remains fail-closed without coach evidence and real anchor values',()=>{
   const none=buildDetV3ContractFromCatalogue([]);
   expect(none.report.accepted).toHaveLength(0);
   expect(none.report.rejected).toHaveLength(800);
   const noEvidence=buildDetV3ContractFromCatalogue([{
     ...review('V3P_BIKE_009'),sportingReview:undefined,expectedAthleteId:undefined,
   }]);
   expect(noEvidence.report.accepted).toHaveLength(0);
   const noPma=buildDetV3ContractFromCatalogue([{
     ...review('V3P_BIKE_009'),athleteAnchors:{bikeFtpWatts:300},
   }]);
   expect(noPma.report.accepted).toHaveLength(0);
   expect(noPma.report.rejected.find(x=>x.id==='V3P_BIKE_009')?.reason).toContain('bike_pma_w');
 });
});
