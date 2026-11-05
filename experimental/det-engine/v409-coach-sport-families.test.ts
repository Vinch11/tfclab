import {describe,it,expect} from 'vitest';
import {familyCases,runFamily} from './v359-family-fixture';
import {syntheticV3SportingContext,syntheticV3ReviewAnchors} from './v3-test-anchor-fixtures';
import {runCoachInputsDet,coachFamilyFor,coachBrickIdsFor} from './v401-coach-inputs-core';
import {familySourcePool,computePoolFingerprint,PINNED_POOL_FINGERPRINTS} from '@/lib/det/familySourcePools';
const starts={swim:[360,360,360,720,360,1020,480],bike:[600,660,600,480,600,420,540],run:[1080,540,720,900,1080,1260,1140],strength:Array(7).fill(1140),brick:Array(7).fill(360)};
describe('V409 coach source contracts — synthetic reviews in tests only',()=>{
 it.each(familyCases)('$id keeps the original complete sporting gates',s=>{
  const f=runFamily(s),family=coachFamilyFor(s.objective)!;
  const reviews=f.report.accepted.filter(w=>familySourcePool(family.key).ids.includes(w.id)).map(w=>{const ctx=syntheticV3SportingContext(w.id);if(!('sportingReview'in ctx))throw Error('test_context_missing');return {id:w.id,objective:s.objective,athleteLevel:'trained' as const,athleteLevelSource:'manual' as const,allPrerequisitesChecked:true as const,individualCoachApproval:true as const,preferReviewedV3:true as const,expectedAthleteId:f.athlete.nom,sportingReview:{...ctx.sportingReview,athleteId:f.athlete.nom},athleteAnchors:syntheticV3ReviewAnchors(),...(w.sport==='strength'?{verifiedStrengthLoadAndRpe:true as const}:{})};});
  const config={...f.config,planStartDate:'2026-10-26',...(family.key==='swimming_css'?{identifiedLimitersRaw:['CSS']}:{})};
  const out=runCoachInputsDet({athlete:f.athlete,config,reviews,clock:{timeZone:'Europe/Brussels',minutesBySport:starts},brickApprovals:coachBrickIdsFor(family.key).map(id=>({id,transitionSeconds:180}))});
  if(!out.out.constraintsSatisfied)process.stdout.write('V409_FAIL '+JSON.stringify({family:family.key,reason:out.out.reason,context:out.contextProblems,hard:out.out.issues.filter(i=>['blocking','critical','error'].includes(i.severity))})+'\n');
  expect(out.out.constraintsSatisfied).toBe(true);expect(out.out.candidate?.weeks).toHaveLength(s.weeks);
  const approved=new Set([...familySourcePool(family.key).ids,...coachBrickIdsFor(family.key)]);
  expect(out.out.candidate!.weeks.flatMap(w=>w.sessions).filter(s=>s.catalogId).every(s=>approved.has(s.catalogId!))).toBe(true);
 },90000);
 it('pins every individually reviewable source cohort',async()=>{for(const k of ['cycling_ftp','swimming_css','triathlon_sprint','triathlon_olympic'] as const)expect(await computePoolFingerprint(familySourcePool(k).ids)).toBe(PINNED_POOL_FINGERPRINTS[k]);});
});
