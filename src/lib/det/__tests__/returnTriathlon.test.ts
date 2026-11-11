import {appendFileSync} from 'node:fs';
import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import {inputFor} from '../../../../scripts/quality/det/form-fixture';
import {generateDetPlanFromPageInput,DetRefusal} from '@/lib/plan/detEngineRun';
import {parseV3PlanProposal} from '../v3ProposalLocalSave';
import {v3ExtendedCatalogue} from '../../../../scripts/library-v3/supplementalCatalogue';
import {auditV3Catalogue} from '../../../../scripts/library-v3/catalogueRuntime';
import {sessionsFromPlanJson} from '../../../../supabase/functions/_shared/nolioV2/planSessions';
import {raceIdentityOf} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
import {preparePlan} from '../../../../supabase/functions/_shared/nolioV2/planDryRun';
import {verifyTransitionPractice} from './transitionPracticeProof';
import type {V3PlanProposal} from '../appPlanningV3Proposal';

vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
beforeAll(()=>{
  vi.stubGlobal('fetch',()=>{throw Error('Unexpected network request');});
  vi.spyOn(console,'log').mockImplementation(()=>{});
  vi.spyOn(console,'warn').mockImplementation(()=>{});
});
afterAll(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

const history=(hours:number)=>({recentWeeklyHours:String(hours),recentWeeksCount:'4'});
const short={objective:'703',weeks:12,hours:10,sessions:8};

it('asks specifically for continuous cycling tolerance when the training history is multisport',async()=>{
  const input=inputFor(short,'untrained','finisher',[],history(3));
  await expect(generateDetPlanFromPageInput(input)).rejects.toMatchObject({
    message:expect.stringContaining('50 min de vélo'),decision:{kind:'missing_data',fields:['recentLongRideMinutes']},
  });
  await expect(generateDetPlanFromPageInput({...input,recentLongRideMinutes:50})).rejects.toMatchObject({
    message:expect.stringMatching(/88 min.*105 min/),decision:{kind:'engine_limit'},
  });
});
it('maintains a complete and bounded source contract for the additional return doses',()=>{
  const workouts=v3ExtendedCatalogue.workouts.filter(w=>['V3P_BIKE_205','V3P_BIKE_206','V3P_SWIM_217'].includes(w.id));
  expect(workouts).toHaveLength(3);
  expect(auditV3Catalogue({...v3ExtendedCatalogue,workouts,count:3,counts:{run:0,bike:2,swim:1,strength:0}})).toEqual([]);
  for(const source of workouts)expect(source.prescription.admissibility.prerequisites.length).toBeGreaterThan(0);
});
it.each([
  {objective:'703',weeks:24,hours:7,sessions:6,recent:3,ride:50},
  {objective:'703',weeks:24,hours:7,sessions:6,recent:5,ride:65},
  {objective:'IM',weeks:32,hours:12,sessions:8,recent:6,ride:90},
  {objective:'IM',weeks:36,hours:10,sessions:7,recent:5,ride:65},
])('keeps $objective return doses within prior tolerance and exports $weeks weeks ($ride min)',async scenario=>{
  const input=inputFor(scenario,'untrained','finisher',[],history(scenario.recent));
  const plan=await generateDetPlanFromPageInput({...input,recentLongRideMinutes:scenario.ride});
  const proposal=(plan as typeof plan&{_detSourceProposal:V3PlanProposal})._detSourceProposal;
  expect(proposal.weeks).toHaveLength(scenario.weeks);
  expect(proposal.weeks[0].knownMinutes).toBeLessThanOrEqual(scenario.recent*60);
  expect(proposal.returnTriathlon?.recentLongRideMinutes).toBe(scenario.ride);
  expect(plan.weeks[0].coachNotes).toContain(`Sortie vélo récemment tolérée déclarée par le coach : ${scenario.ride} min`);
  expect(plan.weeks[0].coachNotes).toMatch(/Premier enchaînement vélo-course en S[2-9]\./);
  expect(parseV3PlanProposal(JSON.parse(JSON.stringify(proposal))).returnTriathlon).toEqual(proposal.returnTriathlon);
  const allIds=new Set<string>();
  let lastRide=0,lastLoad=0;
  const ramp=input.config.volumeRamp!.weeklyIncreasePctMax;
  for(const w of proposal.weeks){
    const sessions=w.days.flatMap(d=>d.sessions);
    const elapsedAllowance=w.knownMinutes+(proposal.transitionPractice?.some(p=>p.week===w.week)?5:0);
    expect(elapsedAllowance).toBeLessThanOrEqual(scenario.hours*60);
    if(w.weekType==='recovery')expect(w.knownMinutes).toBeLessThanOrEqual(lastLoad*.7+1e-7);
    if(w.weekType==='load'){
      if(lastLoad)expect(elapsedAllowance).toBeLessThanOrEqual(lastLoad*(1+ramp)+1e-7);
      lastLoad=w.knownMinutes;
      const ride=sessions.find(s=>s.role==='long'&&(s.sport==='bike'||s.sport==='brick'))?.components.find(c=>c.sport==='bike')?.durationMinutes;
      if(ride){
        expect(ride).toBeLessThanOrEqual(lastRide?lastRide*(1+ramp)+1e-7:scenario.ride);
        lastRide=ride;
      }
    }
    for(const session of sessions)for(const c of session.components){
      expect(c.review.minimumLevel).toBe('untrained');allIds.add(c.sourceId);
      if(c.sourceId==='V3P_BIKE_205'||c.sourceId==='V3P_BIKE_206')expect(session.role).toBe('long');
    }
  }
  expect([...allIds]).toContain('V3P_BIKE_205');
  expect([...allIds]).toContain('V3P_BIKE_206');
  if(scenario.objective==='703')expect([...allIds]).toContain('V3P_SWIM_217');
  const sessions=sessionsFromPlanJson(plan).sessions;
  const refs={synthetic:true,athleteId:'usr_SYNTHETIC',competition:sessions.map(raceIdentityOf).find(r=>r!==null)!,
    sportIds:{run:'spt_RUN',bike:'spt_BIKE',swim:'spt_SWIM',strength:'spt_STRENGTH',brick:'spt_TRI'},exerciseIds:{}};
  const full=await preparePlan(plan,refs,'SYNTHETIC_RETURN');
  expect(full.precheck.complete,JSON.stringify(full.precheck.rows.filter(row=>row.status==='refused'))).toBe(true);
  expect(full.precheck.weeks).toBe(scenario.weeks);
  const practices=verifyTransitionPractice(proposal,full,sessions);
  expect(parseV3PlanProposal(JSON.parse(JSON.stringify(proposal))).transitionPractice).toEqual(proposal.transitionPractice);
  if(process.env.DET_TRI_PROOF)appendFileSync(process.env.DET_TRI_PROOF,JSON.stringify({...scenario,
    firstWeek:proposal.weeks[0].knownMinutes,lastLongRide:lastRide,weeklyPeak:Math.max(...proposal.weeks.map(w=>w.knownMinutes)),
    practices,operations:full.ops.length,additionalSources:[...allIds].filter(id=>['V3P_BIKE_205','V3P_BIKE_206','V3P_SWIM_217'].includes(id))})+'\n');
},120000);

it.each([
  {objective:'703',weeks:24,hours:7,sessions:6},
  {objective:'IM',weeks:36,hours:10,sessions:7},
])('documents the remaining prescription gap with all four return priorities for $objective',async scenario=>{
  const input=inputFor(scenario,'untrained','finisher',[],history(3),true);
  expect(input.config.identifiedLimitersRaw).toEqual(['VLamax','FatMax','FTP/kg','VO2max']);
  try{
    const plan=await generateDetPlanFromPageInput({...input,recentLongRideMinutes:50});
    const proposal=(plan as typeof plan&{_detSourceProposal:V3PlanProposal})._detSourceProposal;
    expect(proposal.weeks).toHaveLength(scenario.weeks);
    for(const [i,label] of proposal.limiterOrder.entries())expect(proposal.checks.some(c=>
      ['ranked_limiter_work','ranked_limiter_deferred'].includes(c.code)&&c.message.startsWith(`Rang ${i+1} · ${label}`)&&c.week)).toBe(true);
  }catch(error){
    if(!(error instanceof DetRefusal))throw error;
    expect(error.decision.kind).toBe('engine_limit');
    for(const label of ['FatMax','FTP/kg','VO2max'])expect(error.reasons.some(reason=>reason.includes(label))).toBe(true);
    if(process.env.DET_TRI_PROOF)appendFileSync(process.env.DET_TRI_PROOF,JSON.stringify({...scenario,
      recentHours:3,ride:50,priorities:input.config.identifiedLimitersRaw,decision:error.decision,reasons:error.reasons})+'\n');
  }
},120000);
