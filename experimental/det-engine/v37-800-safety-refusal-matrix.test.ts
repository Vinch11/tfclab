import {describe,it,expect} from 'vitest';
import {v3FullCatalogue} from '../../scripts/library-v3/catalogueRuntime';
import {
 auditV3SportingRegistry,qualifyV3IndividualSportingSource,
} from '../../scripts/library-v3/sportingQualification800';
import {syntheticV3SportingContext} from './v3-test-anchor-fixtures';

describe('DET V37 — source safety evidence cannot be waived for any of the 800 V3 recipes',()=>{
 it('refuses every source individually when athlete, injury, fatigue, recovery or equipment evidence disappears',()=>{
  expect(auditV3SportingRegistry()).toEqual([]);
  let checked=0;
  const counters:Record<string,number>={};
  const failures:Array<{id:string;case:string,reasons:string[]}>= [];
  for(const w of v3FullCatalogue.workouts){
   const ctx=syntheticV3SportingContext(w.id);
   if(!('sportingReview' in ctx)||!('expectedAthleteId' in ctx))
    throw Error('missing_synthetic_review:'+w.id);
   const e=ctx.sportingReview;
   const good=qualifyV3IndividualSportingSource(w,e,ctx.expectedAthleteId);
   if(!good.allowedToSubmitToDet)failures.push({id:w.id,case:'baseline',reasons:good.blockingReasons});
   const bad=[
    {key:'no_coach_review',data:{...e,coachReviewedSource:false as never}},
    {key:'missing_identity',data:{...e,athleteId:'different-athlete'}},
    {key:'stale_source',data:{...e,sourceFingerprint:'stale'}},
    {key:'unknown_fatigue',data:{...e,fatigue:'unknown' as const}},
    {key:'uncleared_injury',data:{...e,injuryScreen:'contraindication' as const}},
    {key:'unknown_recent_load',data:{...e,recentLoad:'unknown' as const}},
    {key:'unreviewed_recovery',data:{...e,recoveryContextReviewed:false as never}},
    {key:'incompatible_load',data:{...e,trainingLoadCompatible:false as never}},
    {key:'environment_unchecked',data:{...e,environmentAndEquipmentConfirmed:false as never}},
   ];
   for(const c of bad){
    const evaluated=qualifyV3IndividualSportingSource(w,c.data,ctx.expectedAthleteId);
    if(evaluated.allowedToSubmitToDet||evaluated.approvedForPublication!==false)
     failures.push({id:w.id,case:c.key,reasons:evaluated.blockingReasons});
    else counters[c.key]=(counters[c.key]??0)+1;
   }
   checked++;
  }
  console.info('DET_V37_800_SAFETY_REFUSAL_MATRIX',JSON.stringify({
   checked,refusals:counters,failures:failures.slice(0,12),
  }));
  expect(checked).toBe(800);
  expect(failures).toEqual([]);
  expect(Object.values(counters).every(n=>n===800)).toBe(true);
 });
});