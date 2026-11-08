import {beforeAll, describe, expect, it, vi} from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({supabase: {}}));
import {computeAppAthleteContext, buildAppPlanConfig, type AppPlanFormState} from '@/lib/plan/appPlanningPipeline';
import {freezeAppPlanningInput, planningInputFor, semanticPlanningPayload} from '../appPlanningInput';
import {generateAppProfileDetPlan} from '../appProfileDetPlan';
import type {V3PlanProposal} from '../appPlanningV3Proposal';
import {savedDetPreparationTimeline} from '../detPreparationTimeline';
import {auditV3ProposalDoseIntegrity} from '../appPlanningV3Audit';
import {library920SourceMetadata} from '../../../../scripts/library-v3/library920Catalogue';
import {preparePlan} from '../../../../supabase/functions/_shared/nolioV2/planDryRun';
import {sessionsFromPlanJson} from '../../../../supabase/functions/_shared/nolioV2/planSessions';
import {raceIdentityOf, semanticViolations, type V2Node} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
import {exactRemoteMatch} from '../../../../supabase/functions/_shared/nolioV2/plannedClient';
import {parsePaceSeconds} from '../../../../supabase/functions/_shared/nolioV2/paceTarget';
import {coachPlanProblems,nativeCoachPlanProblems} from '../../../../supabase/functions/_shared/nolioV2/coachWorkflow';

// Offline acceptance of the NORMAL pipeline. No private provider calls, AI
// purchases, synthetic human approvals or replacement diagnostic are permitted.
const cases = [
  {id:'half-210', objective:'Ironman 70.3', weeks:12, hours:10, sessions:8, ftp:210, pace:300, vma:15, level:'trained'},
  {id:'half-300', objective:'Ironman 70.3', weeks:12, hours:10, sessions:8, ftp:300, pace:240, vma:18, level:'trained'},
  {id:'semi-light', objective:'Semi', weeks:8, hours:6, sessions:4, ftp:210, pace:330, vma:13, level:'light'},
  {id:'semi-light-finisher', objective:'Semi', weeks:8, hours:6, sessions:4, ftp:210, pace:330, vma:13, level:'light', ambition:'finisher'},
  {id:'semi-trained', objective:'Semi', weeks:8, hours:6, sessions:4, ftp:300, pace:240, vma:18, level:'trained'},
  {id:'10k-empty', objective:'10K', weeks:8, hours:6, sessions:4, ftp:210, pace:270, vma:16, level:'trained'},
  {id:'10k', objective:'10K', weeks:8, hours:6, sessions:4, ftp:210, pace:270, vma:16, level:'trained'},
  {id:'marathon-auto', objective:'Marathon', weeks:16, hours:8, sessions:4, ftp:300, pace:240, vma:18, level:'trained', ambition:'competitor', automaticSessions:true},
  {id:'marathon', objective:'Marathon', weeks:16, hours:8, sessions:4, ftp:300, pace:270, vma:16, level:'trained'},
] as const;

beforeAll(() => {
  vi.spyOn(console,'log').mockImplementation(() => {});
  vi.spyOn(console,'warn').mockImplementation(() => {});
  vi.spyOn(globalThis,'fetch').mockImplementation(() => { throw Error('NETWORK_FORBIDDEN'); });
});
const leaves = (nodes:V2Node[]):V2Node[] => nodes.flatMap(n => n.kind==='repeat' ? leaves(n.steps) : [n]);

describe('normal IA input → DET prescriptions → frozen Nolio operations', () => {
  it.each(cases)('$id preserves the shared profile, every target and scoped bodies', async spec => {
    const athleteId='SYNTHETIC_ACCEPTANCE_'+spec.id;
    const athlete={id:athleteId, name:'SYNTHETIC ONLY', objectif:'703', birth_date:'1991-01-01', sex:'M', active_snapshot_id:'SNAP', refs:{}};
    const snapshots=[{id:'SNAP',athlete_id:athleteId,date:'2026-11-04',source:'manual',sport_main:spec.objective==='Ironman 70.3'?'tri':'run',vma:spec.vma,ftp:spec.ftp,css:95,pace_threshold_sec_per_km:spec.pace,tss_7d:380,fatigue_state:'ok',vo2max:58,weight_kg:72,fc_max:188,...(spec.id==='10k'?{tte_observed_min_run:25}: {})}];
    const context=computeAppAthleteContext(athlete,spec.objective,'ambition' in spec?spec.ambition:'age_group',{snapshots,tests:[],checkins:[]})!;
    const form:AppPlanFormState={objective:spec.objective,ambition:'ambition' in spec?spec.ambition:'age_group',planStartDate:new Date(2026,10,2),raceName:'SYNTHETIC ACCEPTANCE',raceDate:new Date(Date.UTC(2026,10,2+spec.weeks*7-1)).toISOString().slice(0,10),raceFormat:'continuous',raceGoals:[],trailDistanceKm:'',trailElevationM:'',trailTargetTimeH:'',trailMaxAltitudeM:'',weeksAvailable:spec.weeks,weeklyHours:String(spec.hours),sessionsPerWeek:'automaticSessions' in spec?'':String(spec.sessions),maxSessionsPerDay:'2',strengthSessionsPerWeek:'automaticSessions' in spec?'2':'1',deloadCadence:'auto',constraints:'',trainingLevel:spec.level,terrainAvailability:'auto',lockAmbition:false,crossTrainingVelo:false,crossTrainingNatation:false,chronicWeeklyHours:'',recentWeeklyHours:'',recentWeeksCount:'',maxDoubleDaysPerWeek:'',coachLimiterOrder:[],currentAthleteId:athleteId};
    const config=buildAppPlanConfig(context.diagnostic,form);
    const app=await freezeAppPlanningInput({athleteId,athlete:context.data,config,planStartDate:'2026-11-02',appAutomaticLimiters:config.identifiedLimitersRaw??[],coachOverride:null});
    const before=JSON.stringify(app);
    const detInput=planningInputFor(app,'det'),aiInput=planningInputFor(app,'ai');
    expect(semanticPlanningPayload(detInput.athlete,detInput.config)).toEqual(semanticPlanningPayload(aiInput.athlete,aiInput.config));
    if(!app.limiters.applied.length){
      await expect(generateAppProfileDetPlan(app,athleteId,{},'SYNTHETIC_ACCEPTANCE')).rejects.toThrow('Le profil partagé ne contient pas de limiteur prioritaire.');
      expect(JSON.stringify(app)).toBe(before);
      process.stdout.write('NORMAL_ACCEPTANCE '+JSON.stringify({id:spec.id,status:'refused_missing_limiter',providerAcceptance:false})+'\n');
      return;
    }
    if(spec.id==='semi-light'){
      await expect(generateAppProfileDetPlan(app,athleteId,{},'SYNTHETIC_ACCEPTANCE')).rejects.toMatchObject({code:'v3_quality_source_unavailable',week:1,noCompletePlanReturned:true});
      expect(JSON.stringify(app)).toBe(before);
      process.stdout.write('NORMAL_ACCEPTANCE '+JSON.stringify({id:spec.id,status:'refused_quality_source_at_declared_level',providerAcceptance:false})+'\n');
      return;
    }
    const plan=await generateAppProfileDetPlan(app,athleteId,{},'SYNTHETIC_ACCEPTANCE').catch(error=>{
      process.stdout.write('ACCEPTANCE_REFUSAL '+JSON.stringify({id:spec.id,reason:error.message,...error})+'\n');
      throw error;
    });
    const saved=JSON.parse(JSON.stringify(plan));
    expect(coachPlanProblems(saved,athleteId)).toEqual([]);
    expect(nativeCoachPlanProblems(saved)).toEqual([]);
    const proposal=(saved as {_detSourceProposal:V3PlanProposal})._detSourceProposal;
    expect(proposal.limiterOrder).toEqual(app.limiters.applied);
    expect(proposal.planningInputFingerprint).toBe(app.fingerprint);
    expect(proposal.checks.filter(c=>c.status==='blocked')).toEqual([]);
    expect(auditV3ProposalDoseIntegrity(proposal).every(c=>c.status==='passed')).toBe(true);
    const components=proposal.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)));
    const levels=['untrained','light','trained','highly_trained'];
    expect(components.every(c=>levels.indexOf(c.review.minimumLevel)<=levels.indexOf(spec.level))).toBe(true);
    // Check actual athlete-specific execution values, not just source labels.
    for(const c of components)for(const t of c.targets.targets){
      if(t.domain==='recovery'&&c.sport==='bike')expect([t.min,t.max]).toEqual([+(spec.ftp*.4).toFixed(1),+(spec.ftp*.55).toFixed(1)]);
      if(t.domain==='mlss'&&c.sport==='bike')expect([t.min,t.max]).toEqual([+(spec.ftp*.95).toFixed(1),+(spec.ftp*1.03).toFixed(1)]);
    }
    expect(savedDetPreparationTimeline(saved)).toEqual(savedDetPreparationTimeline(plan));
    const races=sessionsFromPlanJson(saved).sessions.map(raceIdentityOf).filter(r=>r!==null);
    expect(races).toHaveLength(1);
    const refs={synthetic:true,athleteId:'usr_SYNTHETIC',sportIds:{run:'spt_RUN',bike:'spt_BIKE',swim:'spt_SWIM',strength:'spt_STRENGTH',brick:'spt_TRI'},exerciseIds:{},competition:{date:races[0]!.date,name:races[0]!.name,sport:races[0]!.sport}};
    const version='SYNTHETIC_VERSION_'+spec.id;
    const whole=await preparePlan(saved,refs,version);
    expect(whole.precheck.complete,JSON.stringify(whole.precheck)).toBe(true);
    const week=await preparePlan(saved,refs,version,{kind:'weeks',from:1,to:1});
    for(const op of week.ops)expect(op.bodySha256).toBe(whole.ops.find(x=>x.sessionKey===op.sessionKey)?.bodySha256);
    let paceTargets=0,powerTargets=0;
    for(const op of whole.ops){
      // Local contract simulation only: this is not provider acceptance.
      expect(exactRemoteMatch(structuredClone(op.body),op.body)).toBe(true);
      const nodes=(op.body.workout??[]) as V2Node[];
      expect(semanticViolations(nodes)).toEqual([]);
      for(const n of leaves(nodes))if(n.kind==='step')for(const t of n.targets??[])if(t.type==='raw'){
        if(t.unit==='/km'||t.unit==='/100m'){
          paceTargets++;expect(parsePaceSeconds(t.value)).not.toBeNull();
          if(t.value_max!==undefined)expect(parsePaceSeconds(t.value_max)).not.toBeNull();
        }
        if(t.unit==='W')powerTargets++;
        expect(t.unit).not.toBe('m/s');
      }
    }
    expect(paceTargets).toBeGreaterThan(0);
    if(spec.objective==='Ironman 70.3')expect(powerTargets).toBeGreaterThan(0);
    expect(JSON.stringify(app)).toBe(before);
    process.stdout.write('NORMAL_ACCEPTANCE '+JSON.stringify({id:spec.id,weeks:plan.weeks.length,activities:whole.ops.length,components:components.length,uniqueSources:new Set(components.map(c=>c.sourceId)).size,importedComponents:components.filter(c=>library920SourceMetadata(c.sourceId)).length,limiterOrder:proposal.limiterOrder,paceTargets,powerTargets,providerAcceptance:false})+'\n');
  },120000);
});
