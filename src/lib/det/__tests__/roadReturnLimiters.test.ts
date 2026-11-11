import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import {writeFileSync} from 'node:fs';
import {inputFor} from '../../../../scripts/quality/det/form-fixture';
import {generateDetPlanFromPageInput} from '@/lib/plan/detEngineRun';
import {previewDetGuidance} from '../nolioPreview';
import {parseV3PlanProposal} from '../v3ProposalLocalSave';
import {auditV3SportingPrescription} from '../appPlanningV3Audit';
import {findSource} from '../coachDetContext';
import type {V3PlanProposal} from '../appPlanningV3Proposal';
import {RETURN_THRESHOLD_ID} from '../../../../scripts/library-v3/roadReturnThreshold';

vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
beforeAll(()=>{
  vi.spyOn(console,'log').mockImplementation(()=>{});
  vi.spyOn(console,'warn').mockImplementation(()=>{});
});
const scenario={objective:'10K',weeks:8,hours:6,sessions:4};
const history={recentWeeklyHours:'3',recentWeeksCount:'4'};
const ambitions=['age_group','competitor','elite','world_class'];
const evidence:object[]=[];
afterAll(()=>{
  if(process.env.DET_ROAD_RETURN_EVIDENCE)writeFileSync(process.env.DET_ROAD_RETURN_EVIDENCE,JSON.stringify({
    scope:'Six situations synthétiques utilisant le formulaire ordinaire et les blocs réellement assemblés. Les exports sont simulés hors ligne.',
    source:'V3P_RUN_221, proposition de reprise sur le plat. Principe de seuil fractionné dans le guide débutant 10 km de la British Heart Foundation (2019). Cette dose TFCLab est plafonnée par la séance de reprise effectivement déclarée.',
    sourceReference:'https://www.bhf.org.uk/how-you-can-help/events/running-training-schedules',
    cases:evidence,
  },null,2)+'\n');
});

it.each(ambitions)('uses the actual road-running session and preserves the ranks for %s',async ambition=>{
  const baseline=inputFor(scenario,'untrained',ambition);
  expect(baseline.diagnostic._rawInput.tteObservedMinRun).toBe(25);
  await expect(generateDetPlanFromPageInput(baseline)).rejects.toMatchObject({
    decision:{kind:'missing_data',fields:['roadReturnThresholdReps','loadHistory.recentWeeklyHours']},
  });
  const input=inputFor(scenario,'untrained',ambition,[],history);
  const plan=await generateDetPlanFromPageInput({...input,roadReturnThresholdReps:2});
  const p=parseV3PlanProposal((plan as typeof plan&{_detSourceProposal:V3PlanProposal})._detSourceProposal);
  expect(p.roadReturnThresholdReps).toBe(2);
  expect(p.limiterOrder).toEqual(input.config.identifiedLimitersRaw);
  const work=p.weeks.flatMap(w=>w.days.flatMap((d,day)=>d.sessions.flatMap(s=>s.components
    .filter(c=>c.sourceId===RETURN_THRESHOLD_ID).map(c=>({week:w.week,day,role:s.role,c})))));
  expect(work.map(x=>x.week)).toEqual([5,6]);
  for(const {week,day,role,c} of work){
    expect(day).toBe(2);
    expect(role).toBe('key');
    expect(c.durationMinutes).toBe(25);
    expect(c.zoneMinutes?.high).toBe(6);
    expect(c.blocks[1]).toMatchObject({kind:'repeat',count:{base:2},betweenSec:180,
      steps:[{kind:'time',role:'main',domain:'mlss',seconds:{base:180}}]});
    expect(c.targets.targets).toContainEqual(expect.objectContaining({domain:'mlss',metric:'sec_per_km'}));
    expect(p.checks).toContainEqual(expect.objectContaining({week,code:'source_recovery',status:'passed',
      message:expect.stringContaining(RETURN_THRESHOLD_ID)}));
    expect(p.checks).toContainEqual(expect.objectContaining({week,code:'primary_dose_coverage',status:'pending'}));
    expect(plan.weeks[week-1].coachNotes).toContain('6 min au seuil sur 25 min');
    expect(plan.weeklyQuotas?.[week].layout?.days[day].slots).toContainEqual(expect.objectContaining({sport:'run',isKeySession:true}));
  }
  for(const [rank,raw] of p.limiterOrder.entries()) {
    if(['TTE','Durabilité'].includes(raw))
      expect(p.checks).toContainEqual(expect.objectContaining({code:'ranked_limiter_work',message:expect.stringContaining('Rang '+(rank+1)+' · '+raw+' · '+work[0].c.title+' ('+RETURN_THRESHOLD_ID+', 6 min de travail)')}));
    else
      expect(p.checks).toContainEqual(expect.objectContaining({code:'ranked_limiter_deferred',week:4,status:'pending',message:expect.stringMatching(/Réévaluation le .+\./)}));
  }
  const full=await previewDetGuidance(plan);
  expect(full.precheck.complete).toBe(true);
  const week=await previewDetGuidance(plan,{kind:'weeks',from:5,to:5});
  expect(week.precheck.complete).toBe(true);
  const row=week.ops.find(o=>o.body.name===work[0].c.title);
  expect(row).toBeDefined();
  const one=await previewDetGuidance(plan,{kind:'sessions',keys:[row!.sessionKey]});
  expect(one.precheck.complete).toBe(true);
  expect(one.ops).toHaveLength(1);
  evidence.push({objective:scenario.objective,ambition,trainingLevel:'untrained',effectiveAmbition:input.config.ambitionMeta?.effective,
    weeks:scenario.weeks,weeklyHours:scenario.hours,formSessions:scenario.sessions,
    baseline:{observedRunTte:baseline.diagnostic._rawInput.tteObservedMinRun,kind:'missing_data',fields:['roadReturnThresholdReps','loadHistory.recentWeeklyHours']},
    supplied:{recentWeeklyHours:3,recentWeeksCount:4,toleratedThreeMinuteReps:2},actualWeeklyMinutes:p.weeks.map(w=>w.knownMinutes),
    actualThreshold:work.map(x=>({week:x.week,day:'mercredi',source:x.c.sourceId,totalMinutes:x.c.durationMinutes,thresholdMinutes:x.c.zoneMinutes!.high,
      thresholds:x.c.targets.targets.filter(v=>v.domain==='mlss').map(v=>({unit:v.metric,min:v.min,max:v.max})),recoveryHours:x.c.review.minimumRecoveryHours})),
    limiterOrder:p.limiterOrder,deferred:p.checks.filter(c=>c.code==='ranked_limiter_deferred').map(c=>c.message),
    thresholdCriterion:'La dose de 20 min au seuil utilisée pour la preuve complète du premier rang reste à vérifier.',
    offlineGuidance:{all:full.ops.length,week5:week.ops.length,selectedSession:one.ops.length,complete:full.precheck.complete&&week.precheck.complete&&one.precheck.complete},
  });
},120000);

it('caps the source at three tolerated repetitions and independently checks an archived dose',async()=>{
  const input=inputFor(scenario,'untrained','competitor',[],history);
  const plan=await generateDetPlanFromPageInput({...input,roadReturnThresholdReps:4});
  const p=parseV3PlanProposal((plan as typeof plan&{_detSourceProposal:V3PlanProposal})._detSourceProposal);
  const work=p.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components))).filter(c=>c.sourceId===RETURN_THRESHOLD_ID);
  expect(p.roadReturnThresholdReps).toBe(3);
  expect(work.map(c=>[c.durationMinutes,c.zoneMinutes?.high])).toEqual([[31,9],[31,9]]);
  evidence.push({objective:'10K',ambition:'competitor',toleratedThreeMinuteReps:4,maxRepetitions:p.roadReturnThresholdReps,
    actualDose:work.map(c=>({source:c.sourceId,totalMinutes:c.durationMinutes,thresholdMinutes:c.zoneMinutes!.high}))});
  p.roadReturnThresholdReps=2;
  expect(auditV3SportingPrescription(p,input.config)).toContainEqual(expect.objectContaining({
    code:'source_prescription_context',status:'blocked',message:expect.stringContaining('fractions confirmées'),
  }));
},120000);

it('distinguishes a different or unknown session, insufficient volume, fatigue, and an unavailable recovery window',async()=>{
  const input=inputFor(scenario,'untrained','competitor',[],history);
  const expectFailure=(data:Parameters<typeof generateDetPlanFromPageInput>[0],kind:string,part:string)=>
    expect(generateDetPlanFromPageInput(data)).rejects.toMatchObject({decision:{kind},message:expect.stringContaining(part)});
  await expectFailure(input,'missing_data','fractions de 3 min');
  await expectFailure({...input,config:{...input.config,loadHistory:{recentWeeklyHours:0,recentWeeksCount:3}},roadReturnThresholdReps:2},'engine_limit','0 h');
  for(const declared of [0,1]) await expectFailure({...input,roadReturnThresholdReps:declared},'engine_limit','2 × 3 min');
  await expectFailure({...input,roadReturnThresholdReps:3,athlete:{...input.athlete,paceThresholdSecPerKm:null}},'missing_data','allure individuelle au seuil');
  const small=inputFor(scenario,'untrained','competitor',[],{recentWeeklyHours:'0.5',recentWeeksCount:'4'});
  await expectFailure({...small,roadReturnThresholdReps:2},'engine_limit','30 min');
  await expectFailure(small,'engine_limit','30 min');
  await expectFailure({...input,diagnostic:{...input.diagnostic,_rawInput:{...input.diagnostic._rawInput,fatigueState:'injured'}}},'engine_limit','exclu');
  await expectFailure({...input,config:{...input.config,constraints:'Pas de course le mardi.'}},'engine_limit','48 h');
},120000);

it.each(['elite','world_class'])('explains the half-marathon catalogue gap independently for each blocked rank (%s)',async ambition=>{
  const input=inputFor({...scenario,objective:'Semi'},'untrained',ambition,[],history);
  const problem=await generateDetPlanFromPageInput(input).catch(e=>e);
  expect(problem.decision).toEqual({kind:'engine_limit',fields:[]});
  for(const [rank,raw] of input.config.identifiedLimitersRaw!.entries()){
    if(raw==='VLamax')continue;
    const reason=problem.reasons.find((message:string)=>message.startsWith('Rang '+(rank+1)+' · '+raw+' :'));
    expect(reason).toContain(['Durabilité','TTE'].includes(raw)?'Aucune fiche de course au seuil':'Aucune fiche de course avec des fractions à vitesse aérobie');
  }
  expect(findSource('V3P_RUN_209')?.minimumLevel).toBe('light');
  evidence.push({objective:'Semi',ambition,trainingLevel:'untrained',effectiveAmbition:input.config.ambitionMeta?.effective,
    weeks:scenario.weeks,weeklyHours:scenario.hours,formSessions:scenario.sessions,observedRunTte:input.diagnostic._rawInput.tteObservedMinRun??null,
    limiterOrder:input.config.identifiedLimitersRaw,decision:problem.decision,reasons:problem.reasons});
  const stillAtReturn={...input,roadReturnThresholdReps:3};
  await expect(generateDetPlanFromPageInput(stillAtReturn)).rejects.toMatchObject({decision:{kind:'engine_limit'}});
},120000);
