import {describe,it,expect,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {buildDetPreparationTimeline,savedDetPreparationTimeline} from '../detPreparationTimeline';
import type {ProposedV3Workout,V3PlanProposal} from '../appPlanningV3Proposal';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {LimiterMesocycleTimeline} from '@/components/plan/LimiterMesocycleTimeline';
import {buildPlanHTML} from '@/lib/aiPlanPDFExport';
import {v3FullCatalogue,evaluateV3Workout} from '../../../../scripts/library-v3/catalogueRuntime';
import {fingerprintV3SportingSource} from '../../../../scripts/library-v3/sportingQualification800';
import {resolveV3IntensityTargets} from '../../../../scripts/library-v3/resolveV3Intensity';

function proposal():V3PlanProposal{
 const source=v3FullCatalogue.workouts.find(w=>w.id==='V3P_RUN_003')!;
 const component:ProposedV3Workout={sourceId:source.id,sourceFingerprint:fingerprintV3SportingSource(source),title:'Saved source title',sport:source.sport,blocks:structuredClone(source.blocks),durationMinutes:evaluateV3Workout(source).minutes,distanceM:0,targets:resolveV3IntensityTargets(source,{}),sourceDomain:source.primaryDomain,zoneMinutes:null,limiterMatches:['TTE'],review:{minimumRecoveryHours:source.minimumRecoveryHours,minimumLevel:source.minimumLevel,prerequisites:source.prerequisites,contraindications:source.contraindications,stopRule:source.stopRule}};
 return {kind:'v3_plan_proposal',status:'assembled_for_review',athleteId:'SYNTHETIC',planningInputFingerprint:'synthetic-fingerprint',objective:'Semi',limiterOrder:['TTE','Durabilité'],prescriptionAllowed:false,sourceReview:'pending',eventCalendar:[],checks:[],weeks:['load','load','recovery','load','taper','race'].map((weekType,index)=>({week:index+1,phase:weekType==='load'?'build':weekType,weekType,focus:index===3?'Durabilité':weekType==='load'?'TTE':null,knownMinutes:45,durationMinutes:index===1?null:45,days:[{day:'Lundi',rest:false,sessions:[{sport:'run',role:'key',components:[structuredClone(component)],transitionMinutes:null,knownMinutes:45,durationMinutes:45}]}]}))};
}
function plan(p=proposal()):ParsedPlan{return {title:'SYNTHETIC',totalWeeks:6,weeks:[],phases:[],_provenance:{engine:'det',mode:'app-profile',planningInput:{fingerprint:p.planningInputFingerprint}},_detSourceProposal:p} as unknown as ParsedPlan;}
afterEach(cleanup);
describe('preparation projects from the saved DET source proposal',()=>{
 it('keeps recovery, taper and race distinct, preserves primary order and displays an uncovered complementary focus honestly',()=>{
  const p=proposal(),before=JSON.stringify(p),blocks=buildDetPreparationTimeline(p);
  expect(blocks.map(b=>[b.startWeek,b.endWeek,b.mode,b.focus])).toEqual([[1,2,'development','TTE'],[3,3,'recovery',null],[4,4,'development','Durabilité'],[5,5,'taper',null],[6,6,'race',null]]);
  expect(blocks.every(b=>b.primary==='TTE')).toBe(true);
  expect(blocks[2].associations.find(a=>a.limiter==='Durabilité')?.sessions).toBe(0);
  expect(blocks[0]).toMatchObject({knownMinutes:90,totalMinutes:null});
  expect(blocks[0].sources).toEqual([{id:'V3P_RUN_003',title:'Saved source title',sport:'run'}]);
  expect(JSON.stringify(p)).toBe(before);
 });
 it('reopens the same timeline after JSON roundtrip without weekly quotas or a live athlete profile, and refuses a mismatched input binding',()=>{
  const p=plan(),saved=JSON.parse(JSON.stringify(p));
  expect(savedDetPreparationTimeline(saved)).toEqual(savedDetPreparationTimeline(p));
  saved._provenance.planningInput.fingerprint='another-profile';expect(savedDetPreparationTimeline(saved)).toBeNull();
  expect(savedDetPreparationTimeline({title:'legacy',weeks:[],phases:[],totalWeeks:0})).toBeNull();
 });
 it('shows the saved project timeline in the normal viewer even without current limiter props',()=>{
  render(<LimiterMesocycleTimeline plan={plan()} limiterKeys={[]}/>);
  expect(screen.getByRole('region',{name:'Chantiers de la préparation'})).toBeInTheDocument();
  expect(screen.getByText('S3 · Récupération et assimilation')).toBeInTheDocument();
  expect(screen.getByText('S5 · Affûtage')).toBeInTheDocument();
  expect(screen.getAllByText(/Saved source title/).length).toBeGreaterThan(0);
  expect(screen.getByText(/90 min d’exercice connues · durée totale à préciser/)).toBeInTheDocument();
 });
 it('includes the same saved projects and unknown durations in the printable plan, escaping source labels',()=>{
  const input=proposal();input.limiterOrder[0]='TTE <script>bad()</script>';input.weeks[0].focus=input.limiterOrder[0];
  const html=buildPlanHTML(plan(input));
  expect(html).toContain('Chantiers de la préparation');expect(html).toContain('Récupération et assimilation');
  expect(html).toContain('durée totale à préciser');expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;');
  expect(html).not.toContain('<script>bad()</script>');
 });
});
