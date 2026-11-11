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
export async function marathonSportingFixture(overrides:Partial<AppPlanFormState>={},thresholdPace: number | null = 240){
 const id='SYNTHETIC_SPORTING_MARATHON';
 const athlete={id,name:'SYNTHETIC ONLY',objectif:'Marathon',birth_date:'1984-03-11',sex:'M',active_snapshot_id:'SYNTH_SNAPSHOT',refs:{}};
 const snapshots=[{id:'SYNTH_SNAPSHOT',athlete_id:id,date:'2026-11-04',source:'manual',sport_main:'run',vma:18,ftp:300,pace_threshold_sec_per_km:thresholdPace,tss_7d:380,fatigue_state:'ok',vo2max:58,weight_kg:72,fc_max:188}];
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
 it('shows the actual road volume, long run, specific minutes and taper reference to the coach',()=>{
  for(const [i,week] of built.proposal.weeks.entries()){
   const sessions=week.days.flatMap(day=>day.sessions);
   const runs=sessions.flatMap(s=>s.components).filter(c=>c.sport==='run');
   const minutes=runs.reduce((sum,c)=>sum+(c.durationMinutes??0),0);
   const specific=runs.reduce((sum,c)=>sum+domainMinutes(c.blocks,'marathon_pace'),0);
   const notes=built.plan.weeks[i].coachNotes!;
   expect(notes).toContain(minutes.toLocaleString('fr-FR')+' min de séances à pied hors compétition');
   expect(notes).toContain(specific.toLocaleString('fr-FR')+' min de blocs à allure marathon');
   const long=sessions.find(s=>s.role==='long');
   if(long)expect(notes).toContain('Sortie longue de '+long.durationMinutes!.toLocaleString('fr-FR')+' min');
   if(['taper','race'].includes(week.weekType))expect(notes).toContain('moyenne des dernières semaines de charge');
  }
  expect(built.plan.weeks[0].coachNotes).toContain('4:26/km');
  expect(built.plan.weeks[0].coachNotes).toContain('Le volume hebdomadaire récemment réalisé reste à confirmer');
 });
 it('changes the actual progression with level and availability at identical goal and recent load',async()=>{
  const history={recentWeeklyHours:'5',recentWeeksCount:'4'};
  const lighter=await marathonSportingFixture({...history,trainingLevel:'light'});
  const trained=await marathonSportingFixture({...history,trainingLevel:'trained'});
  const constrained=await marathonSportingFixture({...history,trainingLevel:'trained',weeklyHours:'6'});
  function loadingLongs(plan:typeof trained) {
   return plan.proposal.weeks.filter(w=>w.weekType==='load').map(w=>
    w.days.flatMap(d=>d.sessions).find(s=>s.role==='long')!.knownMinutes);
  }
  const lightLongs=loadingLongs(lighter),trainedLongs=loadingLongs(trained);
  expect(lightLongs[0]).toBeLessThan(trainedLongs[0]);
  expect(Math.max(...lightLongs)).toBeLessThan(Math.max(...trainedLongs));
  for(const plan of [lighter,trained,constrained]){
   const longs=loadingLongs(plan);
   for(let i=1;i<longs.length;i++)expect(longs[i]).toBeLessThanOrEqual(longs[i-1]*(1+plan.app.config.volumeRamp!.weeklyIncreasePctMax)+1e-7);
   expect(plan.proposal.weeks[0].knownMinutes).toBeLessThanOrEqual(300);
   expect(plan.plan.weeks[0].coachNotes).toContain('300 min sur 4 semaines');
  }
  expect(lighter.proposal.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components))).some(c=>['V3P_RUN_039','V3P_RUN_040'].includes(c.sourceId))).toBe(true);
  const peak=(plan:typeof trained)=>Math.max(...plan.proposal.weeks.map(w=>w.knownMinutes));
  expect(peak(constrained)).toBeLessThanOrEqual(360);expect(peak(constrained)).toBeLessThan(peak(trained));
  expect(constrained.plan.weeks[0].coachNotes).toContain('Disponibilité déclarée de 360 min/semaine');
  expect(constrained.plan.weeks[0].coachNotes).toContain('repère de planification');
  if(process.env.DET_MARATHON_REVIEW_JSON){
   const plans=[['reference',built],['light',lighter],['trained',trained],['limited_availability',constrained]] as const;
   const cases=plans.map(([id,{app,proposal}])=>({
    id,thresholdSecPerKm:app.athlete.paceThresholdSecPerKm,raceMinutes:app.config.raceGoals?.find(r=>r.priority==='A')?.targetTimeMinutes,
    ambition:app.config.ambitionMeta?.saisie,effectiveAmbition:app.config.ambitionMeta?.effective,
    level:app.config.ambitionMeta?.trainingLevel,availableHours:app.config.weeklyHours,
    recentHours:app.config.loadHistory?.recentWeeklyHours??null,recentWeeks:app.config.loadHistory?.recentWeeksCount??null,
    limiters:proposal.limiterOrder,
    weeks:proposal.weeks.map(w=>{
     const sessions=w.days.flatMap(d=>d.sessions).filter(s=>s.role!=='race');
     const runs=sessions.flatMap(s=>s.components).filter(c=>c.sport==='run');
     const long=sessions.find(s=>s.role==='long'&&s.sport==='run');
     return {week:w.week,type:w.weekType,totalExerciseMinutes:w.knownMinutes,
      runMinutes:runs.reduce((sum,c)=>sum+(c.durationMinutes??0),0),
      marathonPaceMinutes:runs.reduce((sum,c)=>sum+domainMinutes(c.blocks,'marathon_pace'),0),
      longRunMinutes:long?.knownMinutes??null,longRunSource:long?.components[0]?.sourceId??null};
    }),
   }));
   const evidence={scenario:'Synthetic 16-week marathon, 187-minute target. Training minutes exclude races.',
    command:'DET_MARATHON_REVIEW_JSON=release/det/evidence/marathon-3h07-coach.json node_modules/.bin/vitest run src/lib/det/__tests__/normalPlanSportingQuality.test.ts',
    cases};
   writeFileSync(process.env.DET_MARATHON_REVIEW_JSON,JSON.stringify(evidence,null,2)+'\n');
  }

 },120000);
 it('attributes a target outside the available pace domain to DET before searching the schedule',async()=>{
  await expect(marathonSportingFixture({},260)).rejects.toMatchObject({
   message:expect.stringMatching(/4:26\/km.+seuil à 4:20\/km.+conserver le chrono/),
   decision:{kind:'engine_limit',fields:[]},
  });
 });
 it('does not use one race pace silently for two differently timed A marathons',async()=>{
  await expect(marathonSportingFixture({raceGoals:[{objective:'Marathon',raceDate:'2027-01-17',priority:'A',targetTimeMinutes:196}]})).rejects.toMatchObject({
   decision:{kind:'engine_limit'},message:expect.stringMatching(/marathons de priorité A.+différentes/),
  });
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
