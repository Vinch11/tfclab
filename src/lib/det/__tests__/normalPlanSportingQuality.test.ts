import {writeFileSync} from 'node:fs';
import {beforeAll,describe,expect,it,vi} from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
import {computeAppAthleteContext,buildAppPlanConfig,type AppPlanFormState} from '@/lib/plan/appPlanningPipeline';
import {freezeAppPlanningInput} from '../appPlanningInput';
import {generateAppProfileDetPlan} from '../appProfileDetPlan';
import type {V3PlanProposal} from '../appPlanningV3Proposal';
import {domainMinutes,demandingRun,demandingRunDaysCompatible,v3SourceContextProblems} from '../v3SportingPrescription';
import {findSource} from '../coachDetContext';
import {buildPlanHTML} from '@/lib/aiPlanPDFExport';

beforeAll(()=>{vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});});
export async function marathonSportingFixture(overrides:Partial<AppPlanFormState>={}){
 const id='SYNTHETIC_SPORTING_MARATHON';
 const athlete={id,name:'SYNTHETIC ONLY',objectif:'Marathon',birth_date:'1984-03-11',sex:'M',active_snapshot_id:'SYNTH_SNAPSHOT',refs:{}};
 const snapshots=[{id:'SYNTH_SNAPSHOT',athlete_id:id,date:'2026-11-04',source:'manual',sport_main:'run',vma:18,ftp:300,pace_threshold_sec_per_km:240,tss_7d:380,fatigue_state:'ok',vo2max:58,weight_kg:72,fc_max:188}];
 const context=computeAppAthleteContext(athlete,'Marathon','competitor',{snapshots,tests:[],checkins:[]})!;
 const form:AppPlanFormState={objective:'Marathon',ambition:'competitor',planStartDate:new Date(2026,10,9),raceName:'SYNTHETIC MARATHON',raceDate:'2027-02-28',raceTargetMinutes:'187',raceFormat:'continuous',raceGoals:[],trailDistanceKm:'',trailElevationM:'',trailTargetTimeH:'',trailMaxAltitudeM:'',weeksAvailable:16,weeklyHours:'8',sessionsPerWeek:'',maxSessionsPerDay:'2',strengthSessionsPerWeek:'2',deloadCadence:'auto',constraints:'',trainingLevel:'trained',terrainAvailability:'auto',lockAmbition:false,crossTrainingVelo:false,crossTrainingNatation:false,chronicWeeklyHours:'',recentWeeklyHours:'',recentWeeksCount:'',maxDoubleDaysPerWeek:'',coachLimiterOrder:[],currentAthleteId:id,...overrides};
 const config=buildAppPlanConfig(context.diagnostic,form);
 const automatic=buildAppPlanConfig(context.diagnostic,{...form,coachLimiterOrder:[]});
 const app=await freezeAppPlanningInput({athleteId:id,athlete:context.data,config,planStartDate:'2026-11-09',appAutomaticLimiters:automatic.identifiedLimitersRaw??[],coachOverride:form.coachLimiterOrder.length?form.coachLimiterOrder:null});
 const plan=await generateAppProfileDetPlan(app,id,{},'SPORTING_REGRESSION').catch(e=>{process.stdout.write('SPORTING_REFUSAL '+JSON.stringify(e)+'\n');throw e;});
 return {app,plan,proposal:(plan as typeof plan&{_detSourceProposal:V3PlanProposal})._detSourceProposal};
}
describe('actual normal marathon prescription, beyond construction/export checks',()=>{
 let built:Awaited<ReturnType<typeof marathonSportingFixture>>;
 beforeAll(async()=>{built=await marathonSportingFixture();},120000);
 it('keeps all five construction inputs and the declared goal without inventing assimilation',()=>{
  expect(built.proposal.planningInputFingerprint).toBe(built.app.fingerprint);
  expect(built.proposal.limiterOrder).toEqual(built.app.limiters.applied);
  expect(built.app.config.ambitionMeta?.trainingLevel).toBe('trained');
  expect(built.app.config.raceGoals?.some(g=>g.targetTimeMinutes===187)).toBe(true);
  const targets=built.proposal.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components.flatMap(c=>c.targets.targets)))).filter(t=>t.domain==='marathon_pace');
  expect(targets.length).toBeGreaterThan(0);
  for(const target of targets){expect(target.min).toBeCloseTo(187*60/42.195,8);expect(target.max).toBe(target.min);expect(target.source).toBe('coach_race_target');}
 });
 it('does not select initiation, post-race, wrong-event or undeclared heat recipes',()=>{
  for(const w of built.proposal.weeks)for(const c of w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)))expect(v3SourceContextProblems(findSource(c.sourceId)!,built.app.config,w.weekType),c.title).toEqual([]);
 });
 it('selects complete strength prescriptions for the declared trained level',()=>{
  const force=built.proposal.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components))).filter(c=>c.sport==='strength');
  expect(force.length).toBeGreaterThan(0);
  expect(force.every(c=>c.review.minimumLevel==='trained')).toBe(true);
  expect(JSON.stringify(force)).not.toMatch(/Squat vers une chaise|Pompes au mur|Planche latérale sur les genoux/);
 });
 it('compares pace to pace in the PDF and names recovery/taper consistently',()=>{
  const html=buildPlanHTML(built.plan,'SYNTHETIC ONLY',new Date(2026,10,9),undefined,'portrait','full',{objective:'Marathon',ambition:'competitor',ambitionEffective:'competitor',weeklyHours:8,vmaKmh:18,thresholdPaceSecPerKm:240});
  if(process.env.DET_MARATHON_PRINT_HTML)writeFileSync(process.env.DET_MARATHON_PRINT_HTML,html);
  const table=new DOMParser().parseFromString(html,'text/html');
  const row=Array.from(table.querySelectorAll('tr')).find(r=>r.children[0]?.textContent==='Allure course soutenable')!;
  expect(row.children[1].textContent).toContain('/km');expect(row.children[2].textContent).toContain('/km');expect(row.children[3].textContent).toContain('%');
  for(const week of built.proposal.weeks.filter(w=>w.weekType==='recovery'))expect(built.plan.weeks.find(w=>w.weekNumber===week.week)?.theme).toBe('Récupération et assimilation');
  for(const week of built.proposal.weeks.filter(w=>w.weekType==='taper'))expect(built.plan.weeks.find(w=>w.weekNumber===week.week)?.theme).toBe('Affûtage');
  expect(html).toContain('Priorité globale du profil');
 });
 it('spaces actual demanding work, including the boundary between weeks',()=>{
  const days=built.proposal.weeks.flatMap(w=>w.days.flatMap((d,i)=>d.sessions.filter(demandingRun).map(()=>7*(w.week-1)+i)));
  expect(demandingRunDaysCompatible(days),JSON.stringify(days)).toBe(true);
 });
 it('prescribes repeated substantive marathon work before the taper and retains reminders',()=>{
  const specific=built.proposal.weeks.map(w=>({week:w.week,type:w.weekType,minutes:w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)).reduce((n,c)=>n+domainMinutes(c.blocks,'marathon_pace'),0)}));
  expect(specific.filter(w=>w.type==='load'&&w.minutes>8).length).toBeGreaterThanOrEqual(3);
  const loadDoses=specific.filter(w=>w.type==='load'&&w.minutes>0).map(w=>w.minutes);
  expect(new Set(loadDoses).size).toBeGreaterThanOrEqual(3);expect(loadDoses.at(-1)).toBeGreaterThan(loadDoses[0]);
  for(const w of specific.filter(w=>['taper','race'].includes(w.type)))expect(w.minutes,JSON.stringify(w)).toBeGreaterThan(0);
 });
 it('does not start a hidden taper in the final load week and reduces from actual load',()=>{
  const rows=built.proposal.weeks.map(w=>({week:w.week,type:w.weekType,minutes:w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)).filter(c=>c.sport==='run').reduce((n,c)=>n+(c.durationMinutes??0),0)}));
  const loads=rows.filter(w=>w.type==='load'),peak=Math.max(...loads.map(w=>w.minutes));
  expect(loads.at(-1)!.minutes).toBeGreaterThanOrEqual(peak*.8);
  for(const w of rows.filter(w=>w.type==='taper')){expect(w.minutes).toBeGreaterThanOrEqual(peak*.4);expect(w.minutes).toBeLessThanOrEqual(peak*.8);}
  process.stdout.write('MARATHON_SPORTING_DOSES '+JSON.stringify(built.proposal.weeks.map((w,i)=>({...rows[i],marathonMinutes:w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)).reduce((n,c)=>n+domainMinutes(c.blocks,'marathon_pace'),0),longRunMinutes:w.days.flatMap(d=>d.sessions).find(s=>s.role==='long')?.durationMinutes??null})))+'\n');
 });
 it('honours an explicit reorder of eligible limiters and checks matching doses',async()=>{
  const raw=built.app.limiters.applied;
  expect(raw).toContain('VLamax');
  const changed=await marathonSportingFixture({coachLimiterOrder:['VLamax',...raw.filter(k=>k!=='VLamax')]});
  expect(changed.proposal.limiterOrder).toEqual(['VLamax',...raw.filter(k=>k!=='VLamax')]);
  expect(changed.proposal.checks.filter(c=>c.code==='primary_dose_coverage').every(c=>c.status==='passed')).toBe(true);
  expect(changed.proposal.checks.filter(c=>c.status==='blocked')).toEqual([]);
  expect(changed.app.limiters.origin).toBe('coach_override');
 },120000);
});
