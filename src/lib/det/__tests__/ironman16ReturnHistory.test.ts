import {appendFileSync} from 'node:fs';
import {beforeAll,afterAll,expect,it,vi} from 'vitest';
import {inputFor} from '../../../../scripts/quality/det/form-fixture';
import {generateDetPlanFromPageInput,DetRefusal} from '@/lib/plan/detEngineRun';
import {sessionsFromPlanJson} from '../../../../supabase/functions/_shared/nolioV2/planSessions';
import {raceIdentityOf} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
import {preparePlan} from '../../../../supabase/functions/_shared/nolioV2/planDryRun';
import type {V3PlanProposal} from '../appPlanningV3Proposal';

vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
beforeAll(()=>{vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});});
afterAll(()=>{vi.restoreAllMocks();});
const fixture={objective:'IM',weeks:16,hours:14,sessions:10};
const ambitions=['finisher','age_group','competitor','elite','world_class'];
function scenario(ambition:string,hours?:number,ride?:number){
  const history=hours===undefined?{}:{recentWeeklyHours:String(hours),recentWeeksCount:'4'};
  return {...inputFor(fixture,'untrained',ambition,[],history),recentLongRideMinutes:ride};
}
const save=(v:unknown)=>{if(process.env.DET_TRI_75_PROOF)appendFileSync(process.env.DET_TRI_75_PROOF,JSON.stringify(v)+'\n');};
it.each([
  {hours:undefined,ride:undefined,fields:['loadHistory.recentWeeklyHours','recentLongRideMinutes']},
  {hours:5,ride:undefined,fields:['recentLongRideMinutes']},
  {hours:undefined,ride:75,fields:['loadHistory.recentWeeklyHours']},
])('requests only missing return observations at $hours h and $ride min',async({hours,ride,fields})=>{
  const input=scenario('finisher',hours,ride);
  expect(input.config.volumeRamp!.week1HoursMax).toBeGreaterThan(0);
  await expect(generateDetPlanFromPageInput(input)).rejects.toMatchObject({decision:{kind:'missing_data',fields}});
});
it.each([[0,75],[5,0],[0,0]])('recognizes the reported absence of practice at %d h/%d min',async(hours,ride)=>{
  const input=scenario('finisher',hours,ride);
  expect(input.config.loadHistory?.recentWeeklyHours).toBe(hours);
  await expect(generateDetPlanFromPageInput(input)).rejects.toMatchObject({decision:{kind:'engine_limit'},
    message:expect.stringContaining(hours+' h/semaine toutes disciplines et '+ride+' min de vélo continu')});
});
it.each(ambitions)('keeps the 180-minute observed ceiling for %s',async ambition=>{
  const x=scenario(ambition,3,75);
  try{await generateDetPlanFromPageInput(x);throw Error('Expected the time ceiling to be binding');}
  catch(e){
    if(!(e instanceof DetRefusal))throw e;
    expect(e.decision.kind).toBe('engine_limit');expect(e.message).toMatch(/S1.*243 min.*180 min/);
    save({hours:3,ride:75,ambition,decision:e.decision.kind,reasons:e.reasons});
  }
},120000);
it.each(ambitions)('replays %s with 300 observed minutes and a 75-minute ride',async ambition=>{
  const x=scenario(ambition,5,75);
  if(!['finisher','age_group'].includes(ambition)){
    try{await generateDetPlanFromPageInput(x);throw Error('Expected an uncovered priority');}
    catch(e){
      if(!(e instanceof DetRefusal))throw e;
      const labels=ambition==='competitor'?['Durabilité','TTE']:['Durabilité','TTE','FTP/kg','VO2max'];
      expect(e.decision.kind).toBe('engine_limit');
      for(const label of labels)expect(e.reasons.some(r=>r.includes(label)&&r.includes('Aucune fiche V3 admissible'))).toBe(true);
      expect(e.reasons.some(r=>r.includes('S6'))).toBe(false);
      save({hours:5,ride:75,ambition,decision:e.decision.kind,reasons:e.reasons});return;
    }
  }
  const plan=await generateDetPlanFromPageInput(x);
  const p=(plan as typeof plan&{_detSourceProposal:V3PlanProposal})._detSourceProposal;
  expect(p.weeks).toHaveLength(16);
  expect(p.checks.filter(c=>c.status==='blocked')).toEqual([]);
  expect(p.weeks[0].knownMinutes).toBeLessThanOrEqual(300);
  expect(plan.weeks[0].coachNotes).toContain('300 min toutes disciplines');
  expect(plan.weeks[0].coachNotes).toMatch(/58 min, dont 24 min courues/);
  const long:Array<[number,number,number]>=[];
  const repeated:Array<{week:number;source:string;days:number[];minimumRecoveryHours:number}>=[];
  let previousLoad=0,bike=0,run=0;
  for(const w of p.weeks){
    const elapsed=w.knownMinutes+(p.transitionPractice?.some(q=>q.week===w.week)?5:0);
    if(w.weekType==='recovery')expect(elapsed).toBeLessThanOrEqual(previousLoad*.7+1e-7);
    if(w.weekType!=='load')continue;
    if(previousLoad)expect(elapsed).toBeLessThanOrEqual(previousLoad*1.1+1e-7);
    previousLoad=w.knownMinutes;
    const sessions=w.days.flatMap((d,day)=>d.sessions.map(s=>({day,s})));
    const ride=sessions.find(t=>t.s.sport==='bike'&&t.s.role==='long')!.s.knownMinutes;
    const onFoot=sessions.find(t=>t.s.sport==='run'&&t.s.role==='long')!.s.knownMinutes;
    expect(ride).toBeLessThanOrEqual(bike?bike*1.1+1e-7:75);
    if(run)expect(onFoot).toBeLessThanOrEqual(run*1.1+1e-7);
    bike=ride;run=onFoot;long.push([w.week,bike,run]);
    for(const source of ['V3P_BIKE_201','V3P_BIKE_202']){
      const appearances=sessions.filter(t=>t.s.sport==='bike'&&t.s.components[0].sourceId===source);
      if(appearances.length<2)continue;
      const days=appearances.map(t=>t.day);
      for(let i=1;i<days.length;i++){
        const earlier=appearances[i-1].s;
        const available=(days[i]-days[i-1]-1)*24-earlier.knownMinutes/60;
        expect(available).toBeGreaterThanOrEqual(earlier.components[0].review.minimumRecoveryHours);
        expect(earlier.components[0].zoneMinutes!.mid+earlier.components[0].zoneMinutes!.high).toBe(0);
      }
      repeated.push({week:w.week,source,days,minimumRecoveryHours:appearances[0].s.components[0].review.minimumRecoveryHours});
    }
  }
  expect(repeated.length).toBeGreaterThan(0);
  expect(bike).toBe(150);expect(p.weeks[5].knownMinutes).toBeGreaterThan(0);
  const sessions=sessionsFromPlanJson(plan).sessions;
  const refs={synthetic:true,athleteId:'usr_SYNTHETIC',competition:sessions.map(raceIdentityOf).find(r=>r!==null)!,
    sportIds:{run:'spt_RUN',bike:'spt_BIKE',swim:'spt_SWIM',strength:'spt_STRENGTH',brick:'spt_TRI'},exerciseIds:{}};
  const full=await preparePlan(plan,refs,'SYNTHETIC_75');
  expect(full.precheck.complete).toBe(true);
  save({hours:5,ride:75,ambition,decision:'generated',weeks:16,longBikeRunMinutes:long,minutes:p.weeks.map(w=>w.knownMinutes),repeated,operations:full.ops.length});
},120000);
