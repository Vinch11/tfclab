import { describe,it,expect,vi,afterEach } from 'vitest';
import type { DaySlot } from '@/engines/plan/weeklySlotLayout';
import { buildDetV3Contract,ingestV3ForDeterministicEngine,type V3SourceCard,type DetV3Review } from './v31-v3-bridge';
import { preparePrevalidationFixture } from '@/qa/sports-plan-lab/prevalidationFixtures';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { assessPreparedGeneration } from '@/lib/plan/prevalidateTrainingPlan';
import { constructDeterministicPlan } from './engine';

const P=(n:number)=>({min:n,base:n,max:n});
const candidate:V3SourceCard={
 id:'V3P_BIKE_008',sport:'bike',title:'Seuil MLSS 3 x 12',focus:'Tolérance de travail proche MLSS sans surdose',
 primaryIntent:'mlss',primaryDomain:'mlss',phase:['build'],minimumLevel:'trained',
 prerequisites:['Puissance de seuil contrôlée'],contraindications:['Fatigue inhabituelle','Douleur'],
 status:'candidate',automaticSelection:false,evidence:{sessionSpecificValidation:false,referenceIds:['TID2024']},
 blocks:[
  {kind:'time',seconds:P(18*60),domain:'recovery',role:'warmup',label:'Échauffement progressif'},
  {kind:'repeat',count:P(3),betweenSec:6*60,label:'Seuil',steps:[
   {kind:'time',seconds:P(12*60),domain:'mlss',role:'main',label:'Répétition au seuil'}]},
  {kind:'time',seconds:P(12*60),domain:'recovery',role:'cooldown',label:'Retour facile'},
 ]};
const review:DetV3Review={
 id:candidate.id,objective:'IM',athleteLevel:'trained',athleteLevelSource:'manual',
 allPrerequisitesChecked:true,individualCoachApproval:true,
};
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('V31 — true DET-ENGINE V3 bridge remains a closed experiment',()=>{
 it('does not admit any of the unreviewed source candidates',()=>{
  const a=ingestV3ForDeterministicEngine([candidate],[]);
  expect(a.sourceCount).toBe(1);expect(a.accepted).toHaveLength(0);
  expect(a.rejected[0].reason).toBe('individual_coach_review_missing');
 });
 it('admits exact 78min only after named coach review; no 80min rounding',()=>{
  const a=ingestV3ForDeterministicEngine([candidate],[review]);
  expect(a.rejected).toEqual([]);expect(a.accepted).toHaveLength(1);
  expect(a.accepted[0].durationMin).toEqual([78,78]);
  expect(a.accepted[0].mainZoneMax).toBe(4);
  expect(a.accepted[0].intentFamily).toBe('seuil');
  expect(a.accepted[0].objectiveSpecific).toBe(true);
 });
 it('refuses a duration with unknown swim pace and strength repetitions',()=>{
  const swim:V3SourceCard={...candidate,id:'V3P_SWIM_007',sport:'swim',primaryIntent:'mlss',
   blocks:[{kind:'distance',meters:P(300),domain:'recovery',role:'warmup',label:'Facile'},
   {kind:'distance',meters:P(1000),domain:'mlss',role:'main',label:'CSS'},
   {kind:'distance',meters:P(200),domain:'recovery',role:'cooldown',label:'Cool'}]};
  const strength:V3SourceCard={...candidate,id:'V3P_STRENGTH_001',sport:'strength',primaryIntent:'max_strength',
   primaryDomain:null,blocks:[{kind:'reps',reps:P(5),secPerRep:6,sides:2,domain:null,role:'main',label:'Squat'}]};
  const reviews=[review,{...review,id:swim.id},{...review,id:strength.id}];
  const a=ingestV3ForDeterministicEngine([swim,strength],reviews);
  expect(a.accepted).toHaveLength(0);
  expect(a.rejected.map(x=>x.reason)).toEqual(['individual_duration_unknown','strength_timebox_or_coach_load_verification_missing']);
 });
 it('rejects an automatic-approval flag, missing prerequisites or insufficient level',()=>{
  const automatic={...candidate,automaticSelection:true} as unknown as V3SourceCard;
  expect(ingestV3ForDeterministicEngine([automatic],[review]).accepted).toHaveLength(0);
  expect(ingestV3ForDeterministicEngine([candidate],[{...review,athleteLevel:'light'}]).accepted).toHaveLength(0);
  expect(ingestV3ForDeterministicEngine([candidate],[{...review,allPrerequisitesChecked:false} as unknown as DetV3Review]).accepted).toHaveLength(0);
 });
 it('inserts reviewed V3 only into the actual deterministic prevalidation catalogue, no network',()=>{
  vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
  const initial=preparePrevalidationFixture('B-IM');
  const config={...initial.planConfig,_outputFormat:'json' as const};
  const preparation=prepareGenerationContracts(initial.athleteData,config,{rotationSeed:0});
  const {contract,report}=buildDetV3Contract([candidate],[review]);
  const before=preparation.chunkRepairCatalogs.flat().some(x=>x.id===candidate.id);
  expect(before).toBe(false);
  contract.adapt(preparation,config);
  expect(preparation.chunkRepairCatalogs.flat().some(x=>x.id===candidate.id)).toBe(true);
  expect(report.accepted.map(x=>x.id)).toEqual([candidate.id]);
  const prevalidated=assessPreparedGeneration(config,preparation);
  expect(prevalidated.weeks.length).toBe(config.weeksAvailable);
  expect(prevalidated.limiterPriorities).toEqual(config.identifiedLimitersRaw??[]);
  expect(contract.filterCandidate!(report.accepted[0],{week:3,phase:'base',slot:{} as unknown as DaySlot,dayIndex:0})).toBe(false);
  expect(contract.filterCandidate!(report.accepted[0],{week:3,phase:'build',slot:{} as unknown as DaySlot,dayIndex:0})).toBe(true);
 });
 it('runs the true deterministic assembler on synthetic data, never gives automatic approval',()=>{
  vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
  const fixture=preparePrevalidationFixture('B-IM');
  const {contract}=buildDetV3Contract([candidate],[review]);
  const outcome=constructDeterministicPlan(fixture.athleteData,
   {...fixture.planConfig,_outputFormat:'json'},{maxNodes:2000,maxMilliseconds:1000},contract);
  expect(outcome.sportingRelevance).toBe('not_attested');
  expect(outcome.humanReviewRequired).toBe(true);
  expect(outcome.issues.some(x=>x.code==='experimental_contract_requires_review')).toBe(true);
 });
});
