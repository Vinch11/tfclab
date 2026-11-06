import {sessionsFromPlanJson} from '../../../../supabase/functions/_shared/nolioV2/planSessions';
import {mapPlanToNolioV2,requiredExerciseLabels} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
import { appProfileDetArchiveSummary } from '../appProfileDetArchive';
import { AppendOnlyPlanVersionSaver } from '@/lib/plan/appendOnlyPlanVersionSave';
import { generateAppProfileDetPlan } from '../appProfileDetPlan';
import { blocksLegacyNolioExport } from '@/lib/nolio/legacyExportGuard';
import { readPlanProvenance } from '@/lib/plan/planProvenance';
import { saveLocalV3Proposal,loadLocalV3Proposal } from '../v3ProposalLocalSave';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { planningInputFor } from '../appPlanningInput';
import { beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { computeAppAthleteContext, buildAppPlanConfig, type AppPlanFormState } from '@/lib/plan/appPlanningPipeline';
import { freezeAppPlanningInput } from '../appPlanningInput';
import { filterDraftV3Sources } from '../appPlanningDetDraft';
import { generateAppPlanningV3Proposal,type ProposedV3Session,type V3PlanProposal } from '../appPlanningV3Proposal';
import { auditV3ProposalDoseIntegrity,auditV3ProposalRecovery } from '../appPlanningV3Audit';
import { readEnteredCoachClock } from '../athleteDetBridge';
import { V34_SAFE_RUN_BRICKS } from '../../../../experimental/det-engine/v34-v3-low-run-bricks';
import { findSource } from '../coachDetContext';

const ATHLETE = 'SYNTHETIC_DRAFT_A';
async function shared(objective = 'Ironman 70.3', weeks = 12, hours = 10, limiters?: string[], overrides: Partial<AppPlanFormState> = {}) {
  const athlete = { id: ATHLETE, name: 'SYNTHETIC DRAFT ONLY', birth_date: '1991-01-01', sex: 'M', active_snapshot_id: 'SYNTH_SNAP', refs: {} };
  const snapshots = [{ id: 'SYNTH_SNAP', athlete_id: ATHLETE, date: '2026-11-04', source: 'manual', sport_main: 'tri', vma: 18, ftp: 300, css: 95, pace_threshold_sec_per_km: 240, tss_7d: 380, fatigue_state: 'ok', vo2max: 58, weight_kg: 72, fc_max: 188 }];
  const ctx = computeAppAthleteContext(athlete, objective, 'age_group', { snapshots, tests: [], checkins: [] })!;
  const st: AppPlanFormState = { objective, ambition: 'age_group', planStartDate: new Date(2026,10,2), raceName: '', raceDate: new Date(Date.UTC(2026,10,2 + weeks * 7 - 1)).toISOString().slice(0,10), raceFormat: 'continuous', raceGoals: [], trailDistanceKm: '', trailElevationM: '', trailTargetTimeH: '', trailMaxAltitudeM: '', weeksAvailable: weeks, weeklyHours: String(hours), sessionsPerWeek: /Ironman/.test(objective) ? '8' : '4', maxSessionsPerDay: '2', strengthSessionsPerWeek: '1', deloadCadence: 'auto', constraints: '', trainingLevel: 'auto', terrainAvailability: 'auto', lockAmbition: false, crossTrainingVelo: false, crossTrainingNatation: false, chronicWeeklyHours: '', recentWeeklyHours: '', recentWeeksCount: '', maxDoubleDaysPerWeek: '', coachLimiterOrder: [], currentAthleteId: ATHLETE, ...overrides };
  const config = buildAppPlanConfig(ctx.diagnostic, st);
  if (limiters) {
    // Isolated prioritization probe: no competing prohibition/risk filter.
    // The real unmodified-pipeline cases above/below retain those filters.
    config.identifiedLimitersRaw = limiters; config.prohibitions = []; config.injuryRisk = undefined;
  }
  return freezeAppPlanningInput({ athleteId: ATHLETE, athlete: ctx.data, config, planStartDate: '2026-11-02', appAutomaticLimiters: config.identifiedLimitersRaw ?? [], coachOverride: limiters ?? null });
}
beforeAll(() => { vi.spyOn(console,'log').mockImplementation(() => {}); vi.spyOn(console,'warn').mockImplementation(() => {}); vi.spyOn(globalThis,'fetch').mockImplementation(() => { throw Error('NETWORK_FORBIDDEN'); }); });

describe('full V3 source proposal from the existing app profile',()=>{
 it.each([['Ironman 70.3',12,10],['Marathon',16,8],['Marathon',40,9],['Semi',8,6]] as const)('%s / %s weeks: a chosen bounded V3 prescription in every non-race slot',async(objective,weeks,hours)=>{
  const app=await shared(objective,weeks,hours),before=JSON.stringify(app);
  const plan=await generateAppPlanningV3Proposal(app,ATHLETE);
  expect(plan.weeks).toHaveLength(weeks);
  expect(plan.checks.filter(c=>c.status==='blocked')).toEqual([]);
  if(objective==='Ironman 70.3')for(const week of plan.weeks.filter(w=>w.weekType==='load'&&['base','build','peak'].includes(w.phase??'')))for(const session of week.days.flatMap(d=>d.sessions).filter(s=>s.sport==='brick'&&s.role!=='race'))expect(V34_SAFE_RUN_BRICKS.some(r=>r.phase===week.phase&&r.bikeId===session.components[0].sourceId&&r.runId===session.components[1].sourceId&&r.bikeMin===session.components[0].durationMinutes&&r.runMin===session.components[1].durationMinutes)).toBe(true);
  expect(plan.prescriptionAllowed).toBe(false);expect(plan.sourceReview).toBe('pending');
  expect(plan.limiterOrder).toEqual(app.limiters.applied);
  expect(plan.planningInputFingerprint).toBe(app.fingerprint);
  expect(plan.eventCalendar).toEqual(app.config.raceGoals??[]);
  const quotas=prepareGenerationContracts(planningInputFor(app,'det').athlete,planningInputFor(app,'det').config).weeklyQuotas;
  let previousLoad:number|null=null;
  for(const week of plan.weeks){
   expect(week.days).toHaveLength(7);expect(week.knownMinutes).toBeLessThanOrEqual(hours*60+1e-7);
   const budget=quotas[week.week]?.volumeBudget;
   if(budget)expect(week.knownMinutes).toBeLessThanOrEqual(budget.maxMinutes+1e-7);
   if(week.durationMinutes!==null&&budget&&previousLoad!==null)expect(week.durationMinutes).toBeLessThanOrEqual(previousLoad*(week.weekType==='recovery'?0.7:1+budget.weeklyIncreasePctMax)+1e-7);
   if(week.weekType==='load'&&!week.days.some(d=>d.sessions.some(s=>s.role==='race'))){
    expect(week.days.some(d=>d.sessions.some(s=>s.components.some(c=>c.zoneMinutes&&c.zoneMinutes.high>0&&['mlss','vo2max'].includes(c.sourceDomain??''))))).toBe(true);
    const check=plan.checks.find(c=>c.week===week.week&&c.code==='structured_polarization');
    expect(check).toBeDefined();
    if(week.durationMinutes!==null)expect(check?.status).toBe('passed');
   }
   if(week.weekType==='load')previousLoad=week.durationMinutes;
   const ids=week.days.flatMap(d=>d.sessions.flatMap(s=>s.components.map(c=>c.sourceId)));
   expect(new Set(ids).size).toBe(ids.length);
   for(const day of week.days)for(const session of day.sessions){
    expect(session.components.length).toBe(session.role==='race'?0:session.sport==='brick'?2:1);
    for(const part of session.components){expect(findSource(part.sourceId)?.title).toBe(part.title);expect(part.blocks.length).toBeGreaterThan(0);}
   }
  }
  expect(JSON.stringify(app)).toBe(before);
  expect(JSON.stringify(plan)).not.toContain('individualCoachApproval');
  expect(JSON.stringify(plan)).not.toContain('coach_confirmed');
  expect(plan).toEqual(await generateAppPlanningV3Proposal(app,ATHLETE));
 },60000);
 it('does not infer swimming domain paces from CSS95 and retains a pending total',async()=>{
  const p=await generateAppPlanningV3Proposal(await shared(),ATHLETE);
  const swims=p.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components))).filter(c=>c.sport==='swim');
  expect(swims.length).toBeGreaterThan(0);expect(swims.filter(c=>c.distanceM>0).every(c=>c.durationMinutes===null)).toBe(true);
  expect(p.checks.some(c=>c.code==='individual_targets'&&c.message.includes('swim_domain_pace'))).toBe(true);
  expect(p.weeks.some(w=>w.durationMinutes===null)).toBe(true);
  for(const week of p.weeks)if(week.days.some(d=>d.sessions.some(s=>s.durationMinutes===null)))expect(week.durationMinutes).toBeNull();
 });
 it('refuses an injured context and another athlete without inventing replacement sessions',async()=>{
  const app=await shared();
  await expect(generateAppPlanningV3Proposal(app,ATHLETE,{injuryScreen:'contraindication'})).rejects.toThrow('aucune dose');
  await expect(generateAppPlanningV3Proposal(app,'OTHER')).rejects.toThrow('différent');
  await expect(generateAppPlanningV3Proposal(await shared('Ironman 70.3',12,10,['UNKNOWN']),ATHLETE)).rejects.toThrow('non raccordé');
 });
});

it('V3 domains prevent ordinary strength repetitions being treated as banned VO2 blocks',async()=>{
 const source=findSource('V3P_STRENGTH_101')!,vo2=findSource('V3P_RUN_167')!;
 const config={prohibitions:['🚫 RESTRICTION VO2max LOURD']};
 expect(filterDraftV3Sources([source,vo2],config,{}).map(s=>s.id)).toEqual([source.id]);
 expect(filterDraftV3Sources([source],config,{presentContraindications:[source.contraindications[0]]})).toEqual([]);
});

it('reuses partial clocks without supplying times, and refuses impossible clock minutes',()=>{
 const c=readEnteredCoachClock({timeZone:'Europe/Brussels',bySport:{run:{time:'07:30',days:[true,false,true,false,false,false,false]},bike:{time:'10:99',days:[true,true,true,true,true,true,true]}}});
 expect(c.clock?.minutesBySport.run).toEqual([450,null,450,null,null,null,null]);expect(c.clock?.minutesBySport.bike).toBeUndefined();expect(c.invalidSports).toEqual(['bike']);
 expect(readEnteredCoachClock({timeZone:'',bySport:{run:{time:'07:30',days:[true,false,false,false,false,false,false]}}}).minutesBySport.run[0]).toBe(450);
});
it('does not repair a corrupted chosen dose or a changed source fingerprint',async()=>{
 const p=await generateAppPlanningV3Proposal(await shared('Semi',8,6),ATHLETE);
 const c=p.weeks[0].days.flatMap(d=>d.sessions.flatMap(s=>s.components)).find(c=>c.durationMinutes!==null)!;
 c.durationMinutes!+=1;expect(auditV3ProposalDoseIntegrity(p).some(c=>c.status==='blocked')).toBe(true);
 c.sport='bike';expect(auditV3ProposalDoseIntegrity(p).some(c=>c.status==='blocked')).toBe(true);
 c.sourceFingerprint='changed';expect(auditV3ProposalDoseIntegrity(p).some(c=>c.status==='blocked')).toBe(true);
});
it('audits actual cross-week recovery and keeps missing race clocks unconfirmed',async()=>{
 const p=await generateAppPlanningV3Proposal(await shared('Semi',8,6),ATHLETE);
 const component=p.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components))).find(c=>c.sport==='run'&&c.review.minimumRecoveryHours>=36&&c.review.minimumRecoveryHours<=48&&c.durationMinutes!==null)!;
 expect(component).toBeDefined();
 const session:ProposedV3Session={sport:'run',role:'key',components:[component],transitionMinutes:null,knownMinutes:component.durationMinutes!,durationMinutes:component.durationMinutes!};
 const miniature:V3PlanProposal={...p,weeks:[{...p.weeks[0],week:1,days:Array.from({length:7},(_,i)=>({day:String(i),rest:i!==6,sessions:i===6?[session]:[]}))},{...p.weeks[0],week:2,days:Array.from({length:7},(_,i)=>({day:String(i),rest:i!==1,sessions:i===1?[session]:[]}))}]};
 expect(auditV3ProposalRecovery(miniature,'2026-11-02').find(c=>c.week===1)?.status).toBe('pending');
 const clock={timeZone:'Europe/Brussels',minutesBySport:{run:[null,1200,null,null,null,null,360]}};
 expect(auditV3ProposalRecovery(miniature,'2026-11-02',clock).find(c=>c.week===1)?.status).toBe('passed');
 expect(auditV3ProposalRecovery(miniature,'2026-11-02',{...clock,minutesBySport:{run:[null,360,null,null,null,null,1200]}}).find(c=>c.week===1)?.status).toBe('blocked');
 miniature.weeks[1].days[1].sessions[0]={...session,role:'race'};
 expect(auditV3ProposalRecovery(miniature,'2026-11-02',clock).find(c=>c.week===1)?.status).toBe('pending');
});

it.each([9,9.5,10])('70.3 ratios use actual exercise minutes when individual swim paces are supplied (%s h)',async hours=>{
 const values={recovery:120,moderate_lt1:110,tempo:103,im_pace:108,'703_pace':102,marathon_pace:103,sub_threshold:98,semi_pace:98,mlss:95,vo2max:88,neuromuscular:80};
 const p=await generateAppPlanningV3Proposal(await shared('Ironman 70.3',12,hours),ATHLETE,{swimDomainPaces:Object.fromEntries(Object.entries(values).map(([d,value])=>[d,{value,kind:'explicit_estimate' as const}]))});
 expect(p.checks.find(c=>c.code==='sport_minute_ratios')?.status).toBe('passed');
 expect(p.prescriptionAllowed).toBe(false);expect(p.sourceReview).toBe('pending');
 expect(p.weeks.some(w=>w.durationMinutes===null)).toBe(true);
},60000);

it('rejects an already proved overlap even when a transition duration is unknown',async()=>{
 const p=await generateAppPlanningV3Proposal(await shared('Semi',8,6),ATHLETE);
 const original=p.weeks[0].days.flatMap(d=>d.sessions).find(s=>s.durationMinutes!==null)!;
 const first={...original,sport:'brick',durationMinutes:null};
 const second={...original,sport:'strength'};
 p.weeks=[{...p.weeks[0],days:[{day:'Lundi',rest:false,sessions:[first,second]}]}];
 const clock={timeZone:'Europe/Brussels',minutesBySport:{brick:[480,null,null,null,null,null,null],strength:[480,null,null,null,null,null,null]}};
 expect(auditV3ProposalRecovery(p,'2026-11-02',clock).find(c=>c.code==='same_day_overlap')?.status).toBe('blocked');
});

it('round-trips full local proposals by owner, detects corruption and reports unavailable storage',async()=>{
 const p=await generateAppPlanningV3Proposal(await shared('Semi',8,6),ATHLETE);
 const values=new Map<string,string>(),store={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const saved=await saveLocalV3Proposal(store,'COACH_A',ATHLETE,p,'context');
 expect(saved.plan).toEqual(p);expect(saved.plan.prescriptionAllowed).toBe(false);
 expect((await loadLocalV3Proposal(store,'COACH_A',ATHLETE))?.hash).toBe(saved.hash);
 expect(await loadLocalV3Proposal(store,'COACH_B',ATHLETE)).toBeNull();
 expect(await loadLocalV3Proposal(store,'COACH_A','OTHER')).toBeNull();
 const [k,v]=[...values][0],changed=JSON.parse(v);changed.plan.prescriptionAllowed=true;values.set(k,JSON.stringify(changed));
 await expect(loadLocalV3Proposal(store,'COACH_A',ATHLETE)).rejects.toThrow();
 changed.plan.prescriptionAllowed=false;changed.plan.objective='tampered';values.set(k,JSON.stringify(changed));
 await expect(loadLocalV3Proposal(store,'COACH_A',ATHLETE)).rejects.toThrow('incohérente');
 await expect(saveLocalV3Proposal({...store,setItem:()=>{throw Error('quota');}},'COACH_A',ATHLETE,p,'context')).rejects.toThrow('quota');
 await expect(saveLocalV3Proposal(store,'COACH_A','OTHER',p,'context')).rejects.toThrow('incompatible');
});

it('generates the common plan without human confirmations or absent swim paces, preserving blocks and export restrictions',async()=>{
 const app=await shared('Ironman 70.3',12,10);
 const p=await generateAppProfileDetPlan(app,ATHLETE,{},'test-engine');
 expect(p.weeks).toHaveLength(12);expect(p.weeks.every(w=>w.sessions.length>0)).toBe(true);
 expect(readPlanProvenance(p).engine).toBe('det');expect(blocksLegacyNolioExport(p)).toBe(true);
 const saved=JSON.parse(JSON.stringify(p));expect(saved).toEqual(p);
 expect(saved._provenance.prescriptionAllowed).toBe(false);
 expect(saved._detSourceProposal.limiterOrder).toEqual(app.limiters.applied);
 expect(saved._detSourceProposal.weeks[0].days.some((d:{sessions:{components:unknown[]}[]})=>d.sessions.some(s=>s.components.length>0))).toBe(true);
});

it('archives and reopens the common partial-data plan through the existing append-only saver without granting approval',async()=>{
 const app=await shared('Ironman 70.3',12,10),plan=await generateAppProfileDetPlan(app,ATHLETE,{},'test-engine');
 expect(()=>appProfileDetArchiveSummary(plan,'OTHER')).toThrow('Athlète');
 const summary=appProfileDetArchiveSummary(plan,ATHLETE);expect(summary.status).toBe('review_required');
 const rows=new Map(),saver=new AppendOnlyPlanVersionSaver({transport:{insert:async row=>{rows.set(row.id,structuredClone(row));return {error:null};},readById:async id=>({data:rows.get(id)??null,error:null})}});
 const payload={athlete_id:ATHLETE,coach_id:'SYNTH_COACH',plan_json:plan,objective:'Ironman 70.3',weeks_count:12,sessions_count:plan.weeks.flatMap(w=>w.sessions).filter(s=>!s.isRest).length,validator_score:null,validator_grade:null,validator_summary:summary};
 const saved=await saver.save(payload);expect(saved.status).toBe('CONFIRMED');
 expect((await saver.save(payload)).attemptId).toBe(saved.attemptId);expect(rows.size).toBe(1);
 const reopened=rows.get(saved.attemptId).plan_json;expect(reopened.weeks).toEqual(JSON.parse(JSON.stringify(plan.weeks)));
 expect(readPlanProvenance(reopened).engine).toBe('det');expect(blocksLegacyNolioExport(reopened)).toBe(true);
 expect(appProfileDetArchiveSummary(reopened).prescriptionAllowed).toBe(false);
 const changed=structuredClone(reopened);changed._provenance.prescriptionAllowed=true;expect(()=>appProfileDetArchiveSummary(changed)).toThrow('Provenance');
 changed._provenance.prescriptionAllowed=false;changed._provenance.planningInput.fingerprint='other';expect(()=>appProfileDetArchiveSummary(changed)).toThrow('divergent');
});

it('preserves exact chosen structures for V2 preparation without admission or an actual send',async()=>{
 const plan=await generateAppProfileDetPlan(await shared('Ironman 70.3',12,10),ATHLETE,{},'test-engine');
 const extracted=sessionsFromPlanJson(JSON.parse(JSON.stringify(plan)));expect(extracted.problems).toEqual([]);
 const structured=extracted.sessions.filter(s=>!!s.detStructuredWorkout);expect(structured.length).toBeGreaterThan(0);
 expect(structured.every(s=>s.sport===s.detStructuredWorkout!.sport)).toBe(true);
 const refs={synthetic:true,athleteId:'usr_SYNTH1',sportIds:{run:'spt_SYNTHRUN',bike:'spt_SYNTHBIKE',swim:'spt_SYNTHSWIM',strength:'spt_SYNTHSTRENGTH'},exerciseIds:Object.fromEntries(requiredExerciseLabels(structured).map((label,i)=>[label,'exf_SYNTH'+i])),competition:null};
 const mapped=mapPlanToNolioV2(structured,refs);expect(mapped.operations.length,JSON.stringify(mapped.refusals)).toBeGreaterThan(0);
 expect(structured.every(s=>s.durationMin===s.detStructuredWorkout!.chosenDurationMin)).toBe(true);
 expect(JSON.stringify(plan)).toContain('"detStructureAdmission":"pending"');
 expect(extracted.sessions.some(s=>s.detStructureRefusal?.reason==='multisport_composition_and_transition_unreviewed')).toBe(true);
 expect(blocksLegacyNolioExport(plan)).toBe(true);
 expect((JSON.parse(JSON.stringify(plan)))._provenance.prescriptionAllowed).toBe(false);
});
