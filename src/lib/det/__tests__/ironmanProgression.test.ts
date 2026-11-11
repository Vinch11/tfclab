import {appendFileSync} from 'node:fs';
import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import {inputFor} from '../../../../scripts/quality/det/form-fixture';
import {generateDetPlanFromPageInput} from '@/lib/plan/detEngineRun';
import {raceIdentityOf} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
import {sessionsFromPlanJson} from '../../../../supabase/functions/_shared/nolioV2/planSessions';
import {preparePlan} from '../../../../supabase/functions/_shared/nolioV2/planDryRun';
import {TRIATHLON_STRICT_MINUTE_RANGES} from '../../../../experimental/det-engine/v314-cumulative-ratio-search';
import {verifyTransitionPractice} from './transitionPracticeProof';
import {planTransitionPractice} from '../triathlonProgression';
import type {V3PlanProposal} from '../appPlanningV3Proposal';

vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
beforeAll(()=>{
  vi.stubGlobal('fetch',()=>{throw Error('Unexpected network request');});
  vi.spyOn(console,'log').mockImplementation(()=>{});
  vi.spyOn(console,'warn').mockImplementation(()=>{});
});
afterAll(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

it.each(['competitor','elite','world_class'])('assembles the light Ironman across S9 with the coach ranking for %s',async ambition=>{
  const input=inputFor({objective:'IM',weeks:16,hours:14,sessions:10},'light',ambition);
  const plan=await generateDetPlanFromPageInput(input);
  const proposal=(plan as typeof plan&{_detSourceProposal:V3PlanProposal})._detSourceProposal;
  const ramp=input.config.volumeRamp!.weeklyIncreasePctMax;
  const minutes={swim:0,bike:0,run:0};
  let lastLoad=0;
  const lastLong={bike:0,run:0};
  expect(proposal.weeks).toHaveLength(16);
  expect(plan.weeks[0].coachNotes).toMatch(/Premier enchaînement vélo-course en S[2-9]\./);
  expect(proposal.limiterOrder).toEqual(input.config.identifiedLimitersRaw);
  expect(proposal.checks.filter(c=>c.status==='blocked')).toEqual([]);
  for(const w of proposal.weeks){
    const sessions=w.days.flatMap(d=>d.sessions);
    const elapsedAllowance=w.knownMinutes+(proposal.transitionPractice?.some(p=>p.week===w.week)?5:0);
    expect(elapsedAllowance).toBeLessThanOrEqual(14*60);
    if(w.weekType==='recovery')expect(w.knownMinutes).toBeLessThanOrEqual(lastLoad*.7+1e-7);
    if(w.weekType!=='load')continue;
    if(lastLoad)expect(elapsedAllowance).toBeLessThanOrEqual(lastLoad*(1+ramp)+1e-7);
    lastLoad=w.knownMinutes;
    for(const s of sessions){
      for(const c of s.components){
        if(c.sport==='bike'||c.sport==='run'||c.sport==='swim'){
          minutes[c.sport]+=c.durationMinutes!;
          if(s.role==='long'&&(c.sport==='bike'||c.sport==='run')){
            if(lastLong[c.sport])expect(c.durationMinutes!).toBeLessThanOrEqual(lastLong[c.sport]*(1+ramp)+1e-7);
            lastLong[c.sport]=c.durationMinutes!;
          }
        }
      }
    }
    expect(proposal.checks.some(c=>c.week===w.week&&c.code==='tri_primary_component_dose'&&c.status==='passed')).toBe(true);
  }
  for(const [sport,bounds] of Object.entries(TRIATHLON_STRICT_MINUTE_RANGES.IM)){
    const share=100*minutes[sport as keyof typeof minutes]/(minutes.swim+minutes.bike+minutes.run);
    expect(share).toBeGreaterThanOrEqual(bounds[0]-1e-7);
    expect(share).toBeLessThanOrEqual(bounds[1]+1e-7);
  }
  for(const [i,label] of proposal.limiterOrder.entries()){
    expect(proposal.checks.some(c=>['ranked_limiter_work','ranked_limiter_deferred'].includes(c.code)&&
      c.message.startsWith(`Rang ${i+1} · ${label}`)&&typeof c.week==='number')).toBe(true);
  }
  if(ambition==='elite')expect(proposal.checks.some(c=>c.code==='ranked_limiter_work'&&c.message.startsWith('Rang 5 · FTP/kg'))).toBe(true);
  const sessions=sessionsFromPlanJson(plan).sessions;
  const refs={synthetic:true,athleteId:'usr_SYNTHETIC',competition:sessions.map(raceIdentityOf).find(r=>r!==null)!,
    sportIds:{run:'spt_RUN',bike:'spt_BIKE',swim:'spt_SWIM',strength:'spt_STRENGTH',brick:'spt_TRI'},exerciseIds:{}};
  const full=await preparePlan(plan,refs,'SYNTHETIC_LIGHT_IM');
  expect(full.precheck.complete).toBe(true);
  expect(full.precheck.weeks).toBe(16);
  const practices=verifyTransitionPractice(proposal,full,sessions);
  const firstParent=sessions.find(s=>s.date===practices[0].date&&s.sport==='brick')!;
  const split=await preparePlan(plan,refs,'SYNTHETIC_LIGHT_IM',{kind:'sessions',keys:[firstParent.sessionKey]});
  expect(split.precheck.complete).toBe(true);
  expect(split.ops.map(op=>op.bodySha256)).toEqual(practices[0].components.map(c=>c.bodySha256));
  const scopeCounts:number[]=[];
  for(const scope of [{kind:'weeks',from:9,to:9},{kind:'sessions',keys:[sessions.find(s=>s.catalogId)!.sessionKey]}]){
    const part=await preparePlan(plan,refs,'SYNTHETIC_LIGHT_IM',scope);
    expect(part.precheck.complete).toBe(true);
    expect(part.ops.length).toBeGreaterThan(0);
    scopeCounts.push(part.ops.length);
    expect(part.ops.every(op=>full.ops.some(all=>all.sessionKey===op.sessionKey&&all.bodySha256===op.bodySha256))).toBe(true);
  }
  if(process.env.DET_TRI_PROOF)appendFileSync(process.env.DET_TRI_PROOF,JSON.stringify({goal:'IM',ambition,
    weeklyMinutes:proposal.weeks.map(w=>w.knownMinutes),loadDoses:proposal.weeks.filter(w=>w.weekType==='load').map(w=>{
      const long=w.days.flatMap(d=>d.sessions).filter(s=>s.role==='long');
      return [w.week,...['bike','run'].map(sport=>long.flatMap(s=>s.components).find(c=>c.sport===sport)?.durationMinutes)];
    }),minutes,practices,operations:full.ops.length,scopeCounts,ranked:proposal.limiterOrder})+'\n');
},120_000);


it('keeps an existing appointment, a declared sport ban, a timed slot, and a long ride intact',()=>{
  const slot=(sport:string,role:'support'|'long'='support')=>({sport,role,minimumMinutes:null,maximumMinutes:null,candidates:[]});
  const weeks=Array.from({length:4},(_,index)=>({weekType:'load',week:index+1,days:[
    {day:'lundi',rest:false,slots:[slot('run')]},{day:'mercredi',rest:false,slots:[slot('run')]},
    {day:'vendredi',rest:false,slots:[slot('bike','long')]},{day:'samedi',rest:false,slots:[slot('bike')]},
  ]}));
  const allowed={constraints:'Pas de vélo le lundi'};
  const available=(week:number,day:number)=>day!==1;
  const booked=weeks.map(w=>w.days.map(d=>d.slots.length));
  expect(planTransitionPractice(weeks,allowed,available)).toEqual([{week:3,dayIndex:3,slotIndex:0,originalSport:'bike'}]);
  expect(weeks.map(w=>w.days.map(d=>d.slots.length))).toEqual(booked);
  expect(weeks[2].days.map(d=>d.slots[0].sport)).toEqual(['run','run','bike','brick']);
  weeks[2].days[3].slots[0].sport='bike';
  expect(()=>planTransitionPractice(weeks,allowed,()=>false)).toThrow(/aucun créneau.*transition vélo-course/);
});

it.each([
  {objective:'703',weeks:12,hours:10,sessions:8,level:'light'},
  {objective:'703',weeks:12,hours:10,sessions:8,level:'trained'},
  {objective:'703',weeks:12,hours:10,sessions:8,level:'highly_trained'},
  {objective:'IM',weeks:16,hours:14,sessions:10,level:'trained'},
  {objective:'IM',weeks:16,hours:14,sessions:10,level:'highly_trained'},
])('prescribes and exports earlier transitions to $objective finishers at level $level',async scenario=>{
  const form=inputFor(scenario,scenario.level,'finisher');
  const plan=await generateDetPlanFromPageInput(form);
  const proposal=(plan as typeof plan&{_detSourceProposal:V3PlanProposal})._detSourceProposal;
  const sessions=sessionsFromPlanJson(plan).sessions;
  const refs={synthetic:true,athleteId:'usr_SYNTHETIC',competition:sessions.map(raceIdentityOf).find(r=>r!==null)!,
    sportIds:{run:'spt_RUN',bike:'spt_BIKE',swim:'spt_SWIM',strength:'spt_STRENGTH',brick:'spt_TRI'},exerciseIds:{}};
  const full=await preparePlan(plan,refs,'SYNTHETIC_FINISHER');
  expect(full.precheck.complete).toBe(true);
  const practices=verifyTransitionPractice(proposal,full,sessions,scenario.level!=='light');
  expect(proposal.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions)).some(s=>s.sport!=='brick'&&
    s.components.some(c=>c.sourceId==='V3P_RUN_862'))).toBe(false);
  expect(practices.map(p=>p.week)).toEqual(scenario.weeks===12?[3,7]:[3,7,11]);
  if(process.env.DET_TRI_PROOF)appendFileSync(process.env.DET_TRI_PROOF,JSON.stringify({
    goal:scenario.objective,ambition:'finisher',level:scenario.level,weeks:scenario.weeks,practices,operations:full.ops.length
  })+'\n');
},120000);
