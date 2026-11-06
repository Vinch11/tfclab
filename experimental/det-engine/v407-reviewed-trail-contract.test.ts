import {describe,it,expect} from 'vitest';
import {runTrail,trailCases} from './v360-trail-fixture';
import {runCoachInputsDet} from './v401-coach-inputs-core';
import {fingerprintTrailRoute} from './v360-trail-evidence';
import type {TrailPlanningDeclaration} from './v407-reviewed-trail-contract';
import {syntheticV3SportingContext,syntheticV3ReviewAnchors} from './v3-test-anchor-fixtures';
import {familySourcePool,computePoolFingerprint} from '../../src/lib/det/familySourcePools';

describe('V407 actual coach trail adapter (synthetic evidence in tests only)',()=>{
 for(const [i,s] of trailCases.entries())it(s.id,()=>{
  const f=runTrail(s);
  const routes=f.routes.map(r=>({...r,provenance:'explicit_coach_route_observation' as const}));
  const review={...f.coachReview,routeFingerprints:Object.fromEntries(routes.map(r=>[r.sourceId,fingerprintTrailRoute(r)]))};
  const declaration:TrailPlanningDeclaration={review,routes,longStartMinutes:s.longStart,longPeakMinutes:s.longPeak,scheduleConfirmed:true,fieldReviewReference:'test-only-explicit-field-review',domainRpe:{recovery:[1,2],moderate_lt1:[2,3],mlss:[6,7],vo2max:[8,9]}};
  const reviews=f.report.accepted.map(card=>{
   const c=syntheticV3SportingContext(card.id);if(!('sportingReview'in c))throw Error('test_context');
   const r=routes.find(r=>r.sourceId===card.id);
   return {id:card.id,objective:s.objective,athleteLevel:'trained' as const,athleteLevelSource:'manual' as const,allPrerequisitesChecked:true as const,individualCoachApproval:true as const,preferReviewedV3:true as const,
    expectedAthleteId:review.athleteId,sportingReview:{...c.sportingReview,athleteId:review.athleteId},
    athleteAnchors:{...syntheticV3ReviewAnchors(),...(r?{runTerrainReview:{athleteId:review.athleteId,sourceId:card.id,terrainContextId:r.routeId,fieldReviewReference:declaration.fieldReviewReference,coachConfirmsFieldEffortReview:true as const,domainRpe:declaration.domainRpe}}:{})},
    ...(r?{expectedRunTerrainContextId:r.routeId}:{}),...(card.sport==='strength'?{verifiedStrengthLoadAndRpe:true as const}:{}),
    ...(s.limiter==='tte'&&card.id==='V3P_RUN_136'?{overrides:{'1.count':4},allowWorksetChange:true as const}:{}),
    ...(i===2&&card.id==='V3P_RUN_085'?{overrides:{'1.seconds':5400,'3.seconds':4620},allowWorksetChange:true as const}:{}),
   };
  });
  const minutes=[720,720,420,930,420,720,420];
  const out=runCoachInputsDet({athlete:f.athlete,config:{...f.config,crossTrainingMaintenance:{velo:true,natation:false},windowWeekPhases:undefined,sessionsPerWeek:i===0?5:6,planStartDate:'2026-10-26'},reviews,trail:declaration,clock:{timeZone:'UTC',minutesBySport:{run:minutes,bike:minutes,strength:Array(7).fill(1080)}}});
  console.info('LIVE_TRAIL',s.id,JSON.stringify({reason:out.out.reason,problems:out.contextProblems,hard:out.out.issues.filter(i=>['blocking','critical','error'].includes(i.severity))}));
  expect(out.out.constraintsSatisfied).toBe(true);expect(out.out.candidate?.weeks.length).toBe(s.weeks);
  const without={...declaration,scheduleConfirmed:false as never};
  expect(runCoachInputsDet({athlete:f.athlete,config:{...f.config,crossTrainingMaintenance:{velo:true,natation:false},windowWeekPhases:undefined,sessionsPerWeek:i===0?5:6,planStartDate:'2026-10-26'},reviews,trail:without,clock:{timeZone:'UTC',minutesBySport:{run:minutes,bike:minutes,strength:Array(7).fill(1080)}}}).out.constraintsSatisfied).toBe(false);
 },40000);
 it.each(['trail_short','trail_mountain','trail_ultra'] as const)('%s source manifest is pinned',async family=>{
  const p=familySourcePool(family);expect(await computePoolFingerprint(p.ids)).toBe(p.pinnedFingerprint);
 });
});

it.each(['marathon','10k'] as const)('%s source manifest remains pinned',async f=>expect(await computePoolFingerprint(familySourcePool(f).ids)).toBe(familySourcePool(f).pinnedFingerprint));
