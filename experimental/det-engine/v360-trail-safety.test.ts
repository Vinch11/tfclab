import {afterEach,describe,expect,it,vi} from 'vitest';
import {trailCases,runTrail,type TrailMutation} from './v360-trail-fixture';
import {resolveV3IntensityTargets} from '../../scripts/library-v3/resolveV3Intensity';
import {v3FullCatalogue} from '../../scripts/library-v3/catalogueRuntime';
import {validatePlan} from '@/engines/plan/planValidator';
import {resolveDeclaredEvent} from './v359-declared-event';
import type {ParsedPlan} from '@/lib/aiPlanParser';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const negatives:Array<{id:string;mutation:TrailMutation}>=[
 {id:'unknown D−',mutation:{routes:r=>{Object.assign(r[0],{dMinusM:null});}}},
 {id:'stale geometry fingerprint',mutation:{routes:r=>{r[0].dPlusM+=10;}}},
 {id:'wrong athlete',mutation:{routes:r=>{r[0].athleteId='another-athlete';}}},
 {id:'wrong configured duration',mutation:{routes:r=>{r[0].durationMin+=1;}}},
 {id:'undocumented downhill exposure',mutation:{review:r=>{Object.assign(r.history,{downhillExposureDocumented:false});}}},
 {id:'insufficient documented descent tolerance',mutation:{review:r=>{r.history.largestDescentM=10;}}},
 {id:'missing route effort anchors',mutation:{omitTerrainReview:true}},
 {id:'unprovable peak source',mutation:{omitSpecificityProvider:true}},
 {id:'actual vertical dose above coach ceiling',mutation:{review:r=>{r.bounds.weeklyDMinusM=100;}}},
];
describe('V360 refuses manufactured trail evidence',()=>{
 it.each(negatives)('$id cannot become an accepted complete plan',n=>{
  vi.stubGlobal('fetch',()=>{throw Error('DET_V360_NETWORK_FORBIDDEN');});
  const {out}=runTrail(trailCases[0],n.mutation);
  expect(out.constraintsSatisfied).toBe(false);
 },60000);
 it('mountain back-to-back sessions require their own approval',()=>{
  const {out}=runTrail(trailCases[1],{review:r=>{r.backToBackApproved=false;}});
  expect(out.constraintsSatisfied).toBe(false);
  expect(out.nodes).toBe(0);
 },60000);
 it('a completed calendar still fails after an unsupported source, pace or weekend change',()=>{
  const {out,audit}=runTrail(trailCases[0]);
  expect(out.constraintsSatisfied).toBe(true);
  const original=out.candidate!;
  for(const corruption of ['dose','pace','weekend','phase']){
   const plan=structuredClone(original);
   const session=plan.weeks[0].sessions.find(s=>s.catalogId==='V3P_RUN_167')!;
   if(corruption==='dose')session.durationMin!+=1;
   if(corruption==='pace')session.details+=' 300 sec_per_km';
   if(corruption==='weekend')plan.weeks[0].sessions=plan.weeks[0].sessions.filter(s=>s.dayIndex!==5);
   if(corruption==='phase')plan.weeks[0].phase='taper';
   expect(audit(plan).verified).toBe(false);
  }
 },60000);
 it('partial field effort evidence never falls back to the available flat pace',()=>{
  const source=v3FullCatalogue.workouts.find(w=>w.id==='V3P_RUN_167')!;
  const resolved=resolveV3IntensityTargets(source,{runThresholdPaceSecPerKm:240,runVvo2SpeedMps:5,
   runTerrainReview:{athleteId:'synthetic',sourceId:source.id,terrainContextId:'route',
    fieldReviewReference:'synthetic-field-log',coachConfirmsFieldEffortReview:true,
    domainRpe:{recovery:[1,2]}}});
  expect(resolved.status).toBe('unresolved');
  expect(resolved.targets.some(t=>t.metric==='sec_per_km'||t.metric==='m_per_sec')).toBe(false);
 });
 it('a trail event requires its real sport, exact date and a separate explicit time estimate',()=>{
  const raceGoals=[{objective:'TrailUltra',priority:'A' as const,raceDate:'2027-03-14',targetTimeMinutes:1200}];
  const config={planStartDate:'2026-10-26',raceGoals};
  expect(resolveDeclaredEvent(config,20,6,'run').targetTimeMinutes).toBe(1200);
  expect(()=>resolveDeclaredEvent(config,20,6,'brick')).toThrow();
  expect(()=>resolveDeclaredEvent(config,20,5,'run')).toThrow();
  expect(()=>resolveDeclaredEvent({...config,raceGoals:[{...raceGoals[0],targetTimeMinutes:undefined}]},20,6,'run')).toThrow();
 });
});

/** Source-of-truth calendar inconsistency: 3 pre-race taper weeks + race
 * week are 4 calendar weeks. A missing event cannot earn that allowance. */
describe('native taper duration counts an actual final race separately',()=>{
 const makePlan=(event:boolean,activation=false):ParsedPlan=>{
  const phase=(n:number)=>n<=6?'base':n<=12?'build':n<=16?'peak':'taper';
  return {title:'Synthetic taper test',totalWeeks:20,
   phases:[{name:'base',weeks:'S1-S6'},{name:'build',weeks:'S7-S12'},
    {name:'peak',weeks:'S13-S16'},{name:'taper',weeks:'S17-S20'}],
   weeks:Array.from({length:20},(_,i)=>({weekNumber:i+1,theme:'Synthetic',phase:phase(i+1),
    sessions:i===19&&event?[{weekNumber:20,weekTheme:'Synthetic',phase:'taper',dayIndex:6,dayName:'dimanche',
     sport:'run',title:activation?'Activation Race Day':'COURSE : TrailUltra',details:'',durationMin:1200,isRest:false}]:[]}))};
 };
 const longTaper=(p:ParsedPlan,goal:string)=>validatePlan(p,goal).issues.filter(i=>
  i.rule==='phase_coherence'&&i.message.includes('trop longue')&&i.message.includes('taper'));
 it('accepts the native ultra taper calendar only with its actual closing race',()=>{
  expect(longTaper(makePlan(true),'TrailUltra')).toEqual([]);
  expect(longTaper(makePlan(false),'TrailUltra')).toHaveLength(1);
  expect(longTaper(makePlan(true,true),'TrailUltra')).toHaveLength(1);
  expect(longTaper(makePlan(true),'10K')).toHaveLength(1);
 });
});
