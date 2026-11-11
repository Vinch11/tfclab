import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import {writeFileSync} from 'node:fs';
import {inputFor} from '../../../../scripts/quality/det/form-fixture';
import {generateDetPlanFromPageInput,DetRefusal} from '@/lib/plan/detEngineRun';
import {previewDetGuidance} from '../nolioPreview';
import {generateAppPlanningV3Proposal,type V3PlanProposal} from '../appPlanningV3Proposal';
import {freezeAppPlanningInput} from '../appPlanningInput';
import {appPlanningPriorityGaps} from '@/lib/plan/dedicatedSportGoal';
import {rankPrescriptionGaps} from '@/lib/limiterPrescription';
import {domainMinutes} from '../v3SportingPrescription';

vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
beforeAll(()=>{
  vi.spyOn(console,'log').mockImplementation(()=>{});
  vi.spyOn(console,'warn').mockImplementation(()=>{});
});
const reference:object[]=[];
afterAll(()=>{
  if(process.env.DET_MARATHON_RETURN_EVIDENCE)writeFileSync(process.env.DET_MARATHON_RETURN_EVIDENCE,JSON.stringify({
    inputs:{objective:'Marathon',weeks:16,trainingLevel:'untrained',weeklyHoursAvailable:8,recentWeeklyHours:3,
      recentWeeksCount:4,recentLongRunMinutes:65,recentLongRunFraction:'inconnue',observedRunTte:null,thresholdSecPerKm:240,targetTime:null},
    scope:'Entrée ordinaire du formulaire. Les trois refus sont réexaminés à partir des semaines de la proposition avant sa validation. Les contrôles d’export des deux projets utilisent des références Nolio simulées. La pertinence sportive du marathon reste à évaluer.',
    cases:reference,
  },null,2)+'\n');
});

it.each(['finisher','age_group','competitor','elite','world_class'])('exposes actual run/walk time and the recorded marathon decision for %s',async ambition=>{
  const input=inputFor({objective:'Marathon',weeks:16,hours:8},'untrained',ambition,[],{recentWeeklyHours:'3',recentWeeksCount:'4'});
  const data={...input,marathonRecentLongRunMinutes:65};
  let p:V3PlanProposal,status:string,reasons:string[]=[],operations:number|undefined;
  try{
    const plan=await generateDetPlanFromPageInput(data);
    p=(plan as typeof plan&{_detSourceProposal:V3PlanProposal})._detSourceProposal;
    expect(['finisher','age_group']).toContain(ambition);
    expect(plan.weeks[0].coachNotes).toContain('32 min courues et 90 min marchées');
    expect(plan.finalValidationIssues).toContainEqual(expect.objectContaining({rule:'det_marathon_return_race_review',severity:'warning'}));
    const preview=await previewDetGuidance(plan);
    expect(preview.precheck.complete).toBe(true);
    status='assembled_for_review'; operations=preview.ops.length;
  }catch(error){
    if(!(error instanceof DetRefusal))throw error;
    expect(['competitor','elite','world_class']).toContain(ambition);
    expect(error.decision.kind).toBe('engine_limit');
    expect(error.reasons[0]).toContain('3 h/semaine et une sortie longue de 65 min');
    expect(error.reasons[0]).toMatch(/Rang 1 · Durabilité.+au seuil.+122 min, dont 32 min courues et 90 min marchées/);
    expect(error.reasons).toContainEqual(expect.stringMatching(/Rang 3 · TTE.+au seuil/));
    if(ambition!=='competitor')expect(error.reasons).toContainEqual(expect.stringMatching(/Rang 5 · VMA.+vitesse aérobie/));
    const frozen=await freezeAppPlanningInput({athleteId:input.athleteId,athlete:input.athlete,config:input.config,
      planStartDate:input.config.planStartDate!,coachOverride:null,appAutomaticLimiters:rankPrescriptionGaps(appPlanningPriorityGaps(input.diagnostic)).map(g=>g.metric)});
    p=await generateAppPlanningV3Proposal(frozen,input.athleteId,{completeSessions:true,includeLibrary920:true,marathonRecentLongRunMinutes:65});
    status='engine_limit';reasons=error.reasons;
  }
  const review=p.checks.find(c=>c.code==='marathon_return_race_review');
  expect(review?.status).toBe('pending');
  expect(review?.message).toMatch(/S13.+122 min, dont 32 min courues et 90 min marchées.+maximum de la fiche.+42,195 km/);
  const weeks=p.weeks.map(w=>{
    const long=w.days.flatMap(d=>d.sessions).find(s=>s.sport==='run'&&s.role==='long');
    return {week:w.week,phase:w.phase,type:w.weekType,knownMinutes:w.knownMinutes,longMinutes:long?.knownMinutes??null,longSource:long?.components[0]?.sourceId??null};
  });
  const longest=p.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.filter(s=>s.role==='long'&&s.sport==='run')
    .map(s=>({week:w.week,minutes:s.knownMinutes,component:s.components[0]})))).sort((a,b)=>b.minutes-a.minutes)[0];
  expect(longest.component.sourceId).toBe('V3P_RUN_220');
  expect(longest.minutes).toBe(122);
  const runMinutes=domainMinutes(longest.component.blocks,'moderate_lt1');
  expect(runMinutes).toBe(32);
  reference.push({ambition,effectiveAmbition:input.config.ambitionMeta?.effective,limiterOrder:p.limiterOrder,status,reasons,operations,
    actualLongest:{week:longest.week,source:longest.component.sourceId,totalMinutes:longest.minutes,runMinutes,walkMinutes:longest.minutes-runMinutes},
    availableSourceMaximum:{totalMinutes:122,runMinutes:32},sportingReview:review?.message,weeks});
},120000);

it('distinguishes a declared zero history from an unanswered field',async()=>{
  const input=inputFor({objective:'Marathon',weeks:16,hours:8},'untrained','finisher',[],{recentWeeklyHours:'3',recentWeeksCount:'4'});
  await expect(generateDetPlanFromPageInput(input)).rejects.toMatchObject({decision:{kind:'missing_data',fields:['marathonRecentLongRunMinutes']}});
  await expect(generateDetPlanFromPageInput({...input,marathonRecentLongRunMinutes:0})).rejects.toMatchObject({
    decision:{kind:'engine_limit',fields:[]},message:expect.stringContaining('0 min de sortie longue récemment tolérée')});
  const noPractice={...input,config:{...input.config,loadHistory:{...input.config.loadHistory,recentWeeklyHours:0}}};
  await expect(generateDetPlanFromPageInput(noPractice)).rejects.toMatchObject({decision:{kind:'engine_limit'},message:expect.stringContaining('0 h d’entraînement hebdomadaire récent')});
},120000);
