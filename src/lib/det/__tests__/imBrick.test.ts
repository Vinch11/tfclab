import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IM_TAPER_BRICK } from '../../../../experimental/det-engine/v404-im-taper-brick';
import { buildDetV3ContractFromCatalogue } from '../../../../experimental/det-engine/v31-v3-catalogue';
import { certifyReviewedRaceSpecificPeak } from '../../../../experimental/det-engine/v317-certified-race-specific';
import { checkCoachReviewContext, hashCoachInputs } from '../coachDetContext';
import { COACH, ATHLETE, SOURCES_VERSION, snap, ctx, run, ymd, TRI_COMMON, TRI_RACE, TRI_V3_ROLE_POOL, TRI_TAPER_SPECIFIC, STRENGTH, TRI_DOSES, triClock } from './coachDetFamilies.test.shared';

const ids=[...TRI_COMMON,...TRI_RACE.IM,...TRI_V3_ROLE_POOL,...TRI_TAPER_SPECIFIC.IM,...STRENGTH];
const approvals=[{id:IM_TAPER_BRICK.id,transitionSeconds:IM_TAPER_BRICK.transitionSeconds}];
/** Synthetic appointments, not inferred athlete availability. The race-week
 * Wednesday and Thursday runs must leave the full 24 h source recovery. */
const imClock={...triClock,minutesBySport:{...triClock.minutesBySport,run:[420,420,1080,1200,1080,420,420]}};
beforeEach(()=>{vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});vi.spyOn(console,'info').mockImplementation(()=>{});vi.spyOn(console,'debug').mockImplementation(()=>{});
  vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});});
async function setup(){
  const snapshot=snap('Ironman',16,14,ymd(16)), context=await ctx(snapshot,ids,TRI_DOSES,imClock,approvals);
  const checked=checkCoachReviewContext({ctx:context,current:{coachId:COACH,athleteId:ATHLETE,snapshot,inputsHash:await hashCoachInputs(snapshot),sourcesVersion:SOURCES_VERSION}});
  if(checked.ok===false)throw Error(checked.refusals.join('|'));
  const review={id:IM_TAPER_BRICK.id,objective:'IM',individualCoachApproval:true as const,transitionSeconds:300,preferReviewedV3:true as const};
  return {snapshot,context,reviews:checked.reviews,review};
}
describe('IM — composition revue, doses V3 conservées (données synthétiques uniquement)',()=>{
  it('admet seulement les deux composants exacts et conserve leurs structures sans parsing',async()=>{
    const {reviews,review}=await setup();
    const built=buildDetV3ContractFromCatalogue(reviews,[],[],[],[review]);
    expect(built.imBrickReport.rejected).toEqual([]);
    expect(built.imBrickReport.accepted).toHaveLength(1);
    expect(built.imBrickReport.accepted[0]).toMatchObject({goals:['ironman'],durationMin:[96,96]});
    const structured=built.structuredWorkoutForId(review.id,96);
    expect(structured.status).toBe('structured');
    if(structured.status!=='structured')return;
    expect(structured.workout.exactSeconds).toBe(5760);
    expect(structured.workout.composition).toMatchObject({transitionSeconds:300,bike:{sourceId:'V3P_BIKE_180',exactSeconds:3420},run:{sourceId:'V3P_RUN_110',exactSeconds:2040}});
    expect(built.structuredWorkoutForId(review.id,95).status).toBe('refused');
    const card=built.imBrickReport.accepted[0], slot={sport:'brick' as const,isKeySession:true};
    const proofPlan={title:'Synthetic proof',totalWeeks:1,phases:[],weeks:[{weekNumber:13,theme:'Synthetic',phase:'peak',sessions:[{weekNumber:13,weekTheme:'Synthetic',phase:'peak',isRest:false,dayIndex:5,dayName:'samedi',sport:'brick',title:card.title,details:card.structure,catalogId:card.id,durationMin:96}]}]};
    const proof=certifyReviewedRaceSpecificPeak(proofPlan,'IM',built.contract.reviewedRaceSpecificForId!,built.contract.sourceStructuredZoneForId!,built.contract.reviewedBrickComponentsForId);
    expect(proof.verdict).toBe('verified');expect(proof.sourceIds).toEqual(['V3P_BIKE_180']);
    expect(certifyReviewedRaceSpecificPeak(proofPlan,'IM',built.contract.reviewedRaceSpecificForId!,built.contract.sourceStructuredZoneForId!).verdict).toBe('refused');
    const composition=built.contract.reviewedBrickComponentsForId!(card.id)!;
    for(const bad of [{...composition,transitionSeconds:360},{...composition,components:composition.components.map(p=>({...p,durationMin:p.durationMin+1}))}])
      expect(certifyReviewedRaceSpecificPeak(proofPlan,'IM',built.contract.reviewedRaceSpecificForId!,built.contract.sourceStructuredZoneForId!,()=>bad).verdict).toBe('refused');
    expect(built.contract.filterCandidate?.(card,{week:13,phase:'peak',weekType:'taper',slot,dayIndex:5})).toBe(true);
    for(const weekType of ['load','recovery','race'])expect(built.contract.filterCandidate?.(card,{week:13,phase:'peak',weekType,slot,dayIndex:5})).toBe(false);
  });
  it('refuse absence de revue, composant absent, dose modifiée, objectif 70.3 et transition différente',async()=>{
    const {reviews,review}=await setup();
    expect(buildDetV3ContractFromCatalogue(reviews).allBricks).toEqual([]);
    for(const altered of [reviews.filter(r=>r.id!==IM_TAPER_BRICK.runId),reviews.map(r=>r.id===IM_TAPER_BRICK.bikeId?{...r,targetDurationMin:55,allowWorksetChange:true}:r)]){
      const b=buildDetV3ContractFromCatalogue(altered,[],[],[],[review]);expect(b.imBrickReport.accepted).toEqual([]);expect(b.imBrickReport.rejected.length).toBe(1);
    }
    for(const altered of [{...review,objective:'703'},{...review,transitionSeconds:360}])expect(buildDetV3ContractFromCatalogue(reviews,[],[],[],[altered]).imBrickReport.accepted).toEqual([]);
  });
  it.each([13,14])('Ironman 16 semaines / %s h : vrai solveur et validateurs finaux',async(hours)=>{
    const {snapshot,context}=await setup();const s={...snapshot,weeklyHours:hours};
    const result=await run(s,{...context,inputsHash:await hashCoachInputs(s)});
    process.stdout.write('IM_WITH_REVIEWED_BRICK '+hours+' '+JSON.stringify(result.kind==='engine_refused'?{reason:result.reason,codes:result.blockingCodes,issues:result.blockingIssues}:result.kind==='accepted'?{kind:result.kind,sessions:result.sessions,nodes:result.provenance.result.nodes}:result)+'\n');
    expect(result.kind).toBe('accepted');
    if(result.kind==='accepted'){
      expect(result.provenance.prescriptionAllowed).toBe(false);
      expect(result.plan.weeks).toHaveLength(16);
      expect(result.provenance.result.nodes).toBeLessThanOrEqual(200000);
      const sessions=result.plan.weeks.flatMap(w=>w.sessions).filter(s=>!s.isRest) as unknown as Record<string,unknown>[];
      const official=sessions.filter(s=>!s.catalogId);
      expect(official).toHaveLength(1);
      expect(official[0]).toMatchObject({weekNumber:16,dayIndex:6,custom:true,sport:'brick',title:'COURSE : IM'});
      expect(sessions.filter(s=>s.catalogId).every(s=>s.detStructuredWorkout&&!s.detStructureRefusal)).toBe(true);
      expect(sessions.some(s=>s.catalogId===IM_TAPER_BRICK.id)).toBe(true);
    }
  },180000);
});
