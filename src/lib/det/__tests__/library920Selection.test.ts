import {describe,it,expect,vi,beforeAll} from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
import {library920Catalogue,library920Manifest,library920SpecialRecords,library920EngineeringRecords,library920Problems,library920CandidatesForProposal,library920SourceMetadata,library920RecordStatus} from '../../../../scripts/library-v3/library920Catalogue';
import {v3FullCatalogue,type V3Workout} from '../../../../scripts/library-v3/catalogueRuntime';
import {fingerprintV3SportingSource,qualifyV3IndividualSportingSource,recomputeSourceBlockers,type V3IndividualSportingEvidence} from '../../../../scripts/library-v3/sportingQualification800';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings} from '../../../../experimental/det-engine/v31-v3-catalogue';
import {library920ContextProblems,library920TimingPaces,resolveLibrary920Targets} from '../library920Selection';
import {filterDraftV3Sources} from '../appPlanningDetDraft';
import {findSource} from '../coachDetContext';
import {computeAppAthleteContext,buildAppPlanConfig,type AppPlanFormState} from '@/lib/plan/appPlanningPipeline';
import {freezeAppPlanningInput} from '../appPlanningInput';
import {generateAppProfileDetPlan} from '../appProfileDetPlan';
import {coachFamilyFor} from '../../../../experimental/det-engine/v401-coach-inputs-core';
import type {V3PlanProposal} from '../appPlanningV3Proposal';
import {appProfileDetArchiveSummary} from '../appProfileDetArchive';
const only=(predicate:(w:V3Workout)=>boolean)=>{const w=library920Catalogue.workouts.find(predicate);if(!w)throw Error('Missing source in test');return w;};
beforeAll(()=>{vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});});
describe('920 source engineering admission and athlete contextualization',()=>{
 it('accounts for every original ID, preserves the historical cohort and audits every imported prescription',()=>{
  expect(library920Problems()).toEqual([]);expect(v3FullCatalogue.workouts).toHaveLength(800);
  expect(library920Manifest.records).toHaveLength(920);expect(library920Catalogue.workouts).toHaveLength(826);expect(library920SpecialRecords).toHaveLength(94);
  expect(new Set([...v3FullCatalogue.workouts,...library920Catalogue.workouts].map(w=>w.id)).size).toBe(1626);
  expect(library920CandidatesForProposal()).toHaveLength(661);
  expect(library920EngineeringRecords.every(r=>!r.humanSportingApproved&&!r.scientificSessionValidated&&!r.athleteApproved)).toBe(true);
  expect(library920Catalogue.workouts.every(w=>findSource(w.id)===w&&w.status==='candidate'&&!w.automaticSelection)).toBe(true);
  for(const row of library920Manifest.records)expect(library920RecordStatus(row.sourceId)?.sourceId).toBe(row.sourceId);
 });
 it('does not route composites, protocols, rest or specialist work as ordinary source IDs',()=>{
  expect(new Set(library920SpecialRecords.map(r=>r.recordType)).size).toBe(8);
  for(const record of library920SpecialRecords){expect(library920Manifest.records.find(r=>r.sourceId===record.sourceId)?.runtimeId).toBeNull();expect(findSource(record.sourceId)).toBeUndefined();expect(record.prescription.automaticSelection).toBe(false);}
 });
 it('rejects an unknown/insufficient level and the wrong event without interpreting absence as clearance',()=>{
  const w=only(w=>w.primaryDomain==='703_pace'&&w.primaryIntent==='race_specific');
  expect(library920ContextProblems(w,'Ironman 70.3',undefined)).toContain('athlete_level_unknown');
  expect(library920ContextProblems(w,'Ironman 70.3','untrained')).toContain('athlete_level_insufficient');
  expect(library920ContextProblems(w,'Marathon','highly_trained')).toContain('race_specific_domain_incompatible');
  const easy=findSource('V3P_RUN_500')!;expect(library920ContextProblems(easy,'10 km','trained')).toEqual([]);
  expect(filterDraftV3Sources([easy],{}, {presentContraindications:[easy.contraindications[0]]})).toEqual([]);
  expect(filterDraftV3Sources([easy],{}, {unmetPrerequisites:[easy.prerequisites[0]]})).toEqual([]);
  expect(filterDraftV3Sources([easy],{injuryRisk:{run:{level:'ELEVE'}}} as never,{})).toEqual([]);
 });
 it('retains fatigue restrictions and source blockers regardless of a limiter affinity',()=>{
  const hard=only(w=>w.primaryDomain==='mlss');
  expect(filterDraftV3Sources([hard],{}, {currentFatigue:'fatigued'})).toEqual([]);
  for(const r of library920EngineeringRecords.filter(r=>r.sourceBlockers.length))expect(library920ContextProblems(findSource(r.id)!,'Marathon','highly_trained')).toContain('source_engineering_blocked');
 });
 it.each([['10 km','10k'],['Semi','semi'],['Marathon','marathon'],['Ironman 70.3','half'],['Ironman','ironman'],['triathlon_sprint','sprint'],['Triathlon olympique','olympic'],['trail_short','trail_short'],['trail_mountain','trail_mountain'],['trail_ultra','trail_ultra'],['cycling_ftp','bike'],['swimming_css','swim']])('keeps the imported source scope for %s', (objective,goal)=>{
  expect(coachFamilyFor(objective)).not.toBeNull();
  const source=library920CandidatesForProposal().find(w=>w.primaryIntent!=='race_specific'&&w.primaryIntent!=='test'&&
   (goal==='bike'||goal==='swim'?w.sport===goal:library920SourceMetadata(w.id)!.goals.includes(goal)));
  expect(source).toBeDefined();expect(library920ContextProblems(source!,objective,'highly_trained')).toEqual([]);
 });
 it('does not silently route the unsupported 5 km family to 10 km',()=>{
  expect(coachFamilyFor('5 km')).toBeNull();
  expect(library920ContextProblems(findSource('V3P_RUN_500')!,'5 km','trained')).toContain('source_goal_incompatible');
 });
 it('uses explicit inter-repetition recovery, without borrowing recovery between multiple unseparated bursts',()=>{
  const w=structuredClone(only(w=>w.primaryIntent==='neuromuscular'&&w.sport==='run'));
  const burst={kind:'time' as const,role:'main' as const,label:'SYNTHETIC sprint',domain:'neuromuscular' as const,seconds:{min:10,base:10,max:10}};
  w.blocks=[{kind:'repeat',label:'SYNTHETIC',count:{min:6,base:6,max:6},betweenSec:60,steps:[burst]}];
  expect(recomputeSourceBlockers(w)).not.toContain('short_sprint_recovery_less_than_five_to_one');
  const repeat=w.blocks[0];if(repeat.kind!=='repeat')throw Error('Missing synthetic repeat');
  repeat.steps.push(burst);expect(recomputeSourceBlockers(w)).toContain('short_sprint_recovery_less_than_five_to_one');
 });
 it('never applies a swimming pace to a run distance or a flat-road pace to a hill prescription',()=>{
  const run=only(w=>w.sport==='run'),swim=only(w=>w.sport==='swim'&&!library920SourceMetadata(w.id)!.techniqueSpecificSwimPaceRequired);
  expect(library920TimingPaces(run,{mlss:95})).toEqual({});expect(library920TimingPaces(swim,{mlss:95})).toEqual({mlss:95});
  const hill=only(w=>w.sport==='run'&&library920SourceMetadata(w.id)!.terrainEffortRequired);
  const targets=resolveLibrary920Targets(hill,{runThresholdPaceSecPerKm:240});expect(targets.status).toBe('unresolved');expect(targets.targets).toEqual([]);
  const bike=only(w=>w.sport==='bike'&&w.primaryDomain==='moderate_lt1');
  const a=resolveLibrary920Targets(bike,{bikeFtpWatts:250}),b=resolveLibrary920Targets(bike,{bikeFtpWatts:300});
  expect(a.status).toBe('resolved');expect(a.targets).not.toEqual(b.targets);expect(a.notScientificValidation).toBe(true);
 });
 it('refuses every imported source without a genuine athlete-scoped review, including stale fingerprints',()=>{
  for(const w of library920Catalogue.workouts)expect(qualifyV3IndividualSportingSource(w,undefined,'SYNTHETIC_ONLY').allowedToSubmitToDet).toBe(false);
  const w=findSource('V3P_RUN_500')!;
  const evidence:V3IndividualSportingEvidence={athleteId:'SYNTHETIC_ONLY',sourceFingerprint:fingerprintV3SportingSource(w),coachReviewedSource:true,currentPhase:w.phase[0],recentLoad:'moderate',fatigue:'ready',injuryScreen:'cleared_by_coach',checkedPrerequisites:[...w.prerequisites],checkedContraindications:[...w.contraindications],stopRuleExplained:true,environmentAndEquipmentConfirmed:true,limiterAndSportingGoalReviewed:true,trainingLoadCompatible:true,recoveryContextReviewed:true,runningImpactToleranceConfirmed:true};
  const setting:V3ReviewedSettings={id:w.id,objective:'10 km',athleteLevel:'trained',athleteLevelSource:'manual',allPrerequisitesChecked:true,individualCoachApproval:true,expectedAthleteId:'SYNTHETIC_ONLY',sportingReview:evidence,athleteAnchors:{runThresholdPaceSecPerKm:240}};
  expect(buildDetV3ContractFromCatalogue([setting]).report.accepted.map(w=>w.id)).toEqual([w.id]);
  expect(buildDetV3ContractFromCatalogue([{...setting,expectedAthleteId:'OTHER_SYNTHETIC'}]).report.accepted).toEqual([]);
  expect(qualifyV3IndividualSportingSource(w,{...evidence,sourceFingerprint:'stale'},'SYNTHETIC_ONLY').allowedToSubmitToDet).toBe(false);
 });
 it('selects imported recipes in the actual normal app plan, preserving dose integrity and explicit pending approvals',async()=>{
  const athleteId='SYNTHETIC_LIBRARY_920',objective='Semi';
  const record={id:athleteId,name:'SYNTHETIC ONLY',objectif:'semi',birth_date:'1991-01-01',sex:'M',active_snapshot_id:'SYNTHETIC_SNAPSHOT',refs:{}};
  const ctx=computeAppAthleteContext(record,objective,'age_group',{snapshots:[{id:'SYNTHETIC_SNAPSHOT',athlete_id:athleteId,date:'2026-11-04',source:'manual',sport_main:'run',vma:18,ftp:300,css:95,pace_threshold_sec_per_km:240,tss_7d:380,fatigue_state:'ok',vo2max:58,weight_kg:72,fc_max:188}],tests:[],checkins:[]})!;
  const state={objective,ambition:'age_group',planStartDate:new Date(2026,10,2),raceName:'SYNTHETIC',raceDate:'2026-12-27',raceFormat:'continuous',raceGoals:[],weeksAvailable:8,weeklyHours:'6',sessionsPerWeek:'4',maxSessionsPerDay:'2',strengthSessionsPerWeek:'1',deloadCadence:'auto',constraints:'',trainingLevel:'trained',terrainAvailability:'auto',lockAmbition:false,crossTrainingVelo:false,crossTrainingNatation:false,chronicWeeklyHours:'',recentWeeklyHours:'',recentWeeksCount:'',maxDoubleDaysPerWeek:'',coachLimiterOrder:[],currentAthleteId:athleteId} as AppPlanFormState;
  const config=buildAppPlanConfig(ctx.diagnostic,state);
  const app=await freezeAppPlanningInput({athleteId,athlete:ctx.data,config,planStartDate:'2026-11-02',appAutomaticLimiters:config.identifiedLimitersRaw??[],coachOverride:null});
  const plan=await generateAppProfileDetPlan(app,athleteId,{},'SYNTHETIC_ENGINE');
  const proposal=(plan as unknown as {_detSourceProposal:V3PlanProposal})._detSourceProposal;
  const imported=proposal.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components))).filter(c=>library920SourceMetadata(c.sourceId));
  expect(imported.length).toBeGreaterThan(0);
  expect(proposal.checks.filter(c=>c.status==='blocked')).toEqual([]);
  expect(proposal.checks.some(c=>c.code==='athlete_current_context'&&c.status==='pending')).toBe(true);
  expect(appProfileDetArchiveSummary(plan,athleteId).prescriptionAllowed).toBe(false);
  expect((plan as unknown as {_provenance:{planningInput:{fingerprint:string};sportingAttestation:boolean}})._provenance.planningInput.fingerprint).toBe(app.fingerprint);
  expect((plan as unknown as {_provenance:{planningInput:{fingerprint:string};sportingAttestation:boolean}})._provenance.sportingAttestation).toBe(false);
  await expect(generateAppProfileDetPlan(app,'ANOTHER_ATHLETE',{},'SYNTHETIC_ENGINE')).rejects.toThrow();
 },60000);
});
