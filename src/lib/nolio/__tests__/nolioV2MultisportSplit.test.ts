import { describe, expect, it } from 'vitest';
import { buildDetStructuredBrick, type DetStructuredWorkout } from '../../../../experimental/det-engine/v400-structured-workout';
import { previewMultisportSplit, type SplitChoice } from '../../../../supabase/functions/_shared/nolioV2/multisportSplit';
import { sessionsFromPlanJson } from '../../../../supabase/functions/_shared/nolioV2/planSessions';
import { preparePlan } from '../../../../supabase/functions/_shared/nolioV2/planDryRun';
import { sendPlannedV2, type LedgerEntry, type NolioV2Ledger } from '../../../../supabase/functions/_shared/nolioV2/plannedClient';
const id = '00000000-0000-4000-8000-000000000001';
const component = (sport: string, min: number): DetStructuredWorkout => ({ schema: 'det-structured-workout-v1', sourceId: 'SYNTH_' + sport, sport,
  chosenDurationMin: min, exactSeconds: min * 60, nodes: [{kind:'step',role:'main',domain:'LT1',label:sport,dose:{seconds:min*60},target:null}] });
const refs = { synthetic: true, athleteId: 'usr_SYNTH', sportIds: {bike:'spt_BIKE',run:'spt_RUN'},exerciseIds:{},competition:null,calendarTimeZone:'Europe/Brussels' };
function plan() {
  const r = buildDetStructuredBrick({ sourceId:'SYNTH_BRICK',bike:{status:'structured',workout:component('bike',139)},run:{status:'structured',workout:component('run',35)},transitionSeconds:360,chosenDurationMin:180 });
  if(r.status!=='structured')throw Error(r.reason);
  return {_planStartDate:'2026-11-09',weeks:[{weekNumber:1,sessions:[{weekNumber:1,dayIndex:0,sport:'brick',catalogId:r.workout.sourceId,
    title:'Synthetic brick',details:'Exact saved prescription',durationMin:180,detStructuredWorkout:r.workout,
    coachStart:{provenance:'coach_confirmed' as const,localDate:'2026-11-09',minuteOfDay:480,timeZone:'Europe/Brussels',utcOffsetMinutes:60}}]}]};
}
async function chosen(p=plan()) {
  const s=sessionsFromPlanJson(p).sessions[0],r=await previewMultisportSplit(s);
  if('reason' in r)throw Error(r.reason);
  const choice:SplitChoice={schema:'nolio-reviewed-split-v1',parentSha256:r.preview.parentSha256,coachConfirmed:true,runStart:r.preview.runStart};
  return {...p,_nolioV2MultisportSplits:{[s.sessionKey]:choice}};
}
describe('explicit two-activity Nolio export, with transition preserved outside training time',()=>{
  it('maps both saved components, exact order/time, source IDs and transition description without changing the plan',async()=>{
    const p=await chosen(),before=JSON.stringify(p),r=await preparePlan(p,refs,id);
    expect(r.precheck.complete).toBe(true);expect(r.ops).toHaveLength(2);
    expect(r.ops.map(o=>[o.sessionKey,o.body.sport,o.body.time,o.body.duration])).toEqual([
      ['S1-J0-0~bike','spt_BIKE','08:00',{value:139,unit:'min'}],['S1-J0-0~run','spt_RUN','10:25',{value:35,unit:'min'}]]);
    for(const op of r.ops)expect(op.body.description).toContain('transition de 360 s hors activité');
    expect(JSON.stringify(p)).toBe(before);
  });
  it('still refuses without explicit representation choice, stale choice or altered parent blocks',async()=>{
    expect((await preparePlan(plan(),refs,id)).precheck.complete).toBe(false);
    for(const change of [(p:Awaited<ReturnType<typeof chosen>>)=>{p.weeks[0].sessions[0].title+=' changed';},
      (p:Awaited<ReturnType<typeof chosen>>)=>{p._nolioV2MultisportSplits['S1-J0-0'].runStart.minuteOfDay++;},
      (p:Awaited<ReturnType<typeof chosen>>)=>{p.weeks[0].sessions[0].detStructuredWorkout.nodes=[];}]){
      const p=await chosen();change(p);const r=await preparePlan(p,refs,id);expect(r.precheck.complete).toBe(false);expect(r.ops).toEqual([]);
    }
  });
  it('uses the actual instant across DST and midnight, keeping the neutral gap exact',async()=>{
    const p=plan();p._planStartDate='2026-10-25';Object.assign(p.weeks[0].sessions[0].coachStart,{localDate:'2026-10-25',minuteOfDay:60,utcOffsetMinutes:120});
    const q=await chosen(p);expect(q._nolioV2MultisportSplits['S1-J0-0'].runStart).toMatchObject({minuteOfDay:145,utcOffsetMinutes:60});
    const midnight=plan();midnight.weeks[0].sessions[0].coachStart.minuteOfDay=23*60;
    const r=await preparePlan(await chosen(midnight),refs,id);expect(r.ops[1].body).toMatchObject({date_start:'2026-11-10',time:'01:25'});
  });
  it('stops on a lost bike response; exact reconciliation resumes the run without a second bike POST',async()=>{
    const p=await preparePlan(await chosen(),refs,id),entries=new Map<string,LedgerEntry>(),remote=new Map<string,Record<string,unknown>>();
    const ledger:NolioV2Ledger={claim:async e=>{const old=entries.get(e.opKey);if(old)return {claimed:false,existing:old};entries.set(e.opKey,e);return {claimed:true};},
      transition:async(k,from,to,patch)=>{const e=entries.get(k);if(e?.state!==from)return false;Object.assign(e,{state:to},patch);return true;}};
    let posts=0;const http={post:async(_path:string,body:unknown)=>{posts++;const key='ptrn_'+posts;remote.set(key,{...(body as object),id:key});return posts===1?{kind:'lost' as const,detail:'synthetic lost response'}:{kind:'response' as const,status:201,json:{id:key}};},
      listPage:async()=>({ok:true as const,items:[...remote.values()],hasMore:false}),getDetail:async(_path:string,key:string)=>({ok:true as const,item:remote.get(key)!})};
    const input={connection:{apiVersion:'v2' as const,mode:'test-mock' as const,grantedScopes:['planned:read','planned:write']},refs,planVersionId:id,operations:p.ops.map(o=>o.source),ledger,http,stopOnRejected:true};
    expect((await sendPlannedV2(input)).status).toBe('STOPPED_UNCONFIRMED');expect(posts).toBe(1);
    expect((await sendPlannedV2(input)).status).toBe('DONE');expect(posts).toBe(2);
    expect((await sendPlannedV2(input)).status).toBe('DONE');expect(posts).toBe(2);
  });
  it.each([400,429,500])('does not start the run or retry automatically after bike HTTP %s',async(status)=>{
    const p=await preparePlan(await chosen(),refs,id),entries=new Map<string,LedgerEntry>();let posts=0;
    const ledger:NolioV2Ledger={claim:async e=>{const old=entries.get(e.opKey);if(old)return {claimed:false,existing:old};entries.set(e.opKey,e);return {claimed:true};},
      transition:async(k,from,to,patch)=>{const e=entries.get(k);if(e?.state!==from)return false;Object.assign(e,{state:to},patch);return true;}};
    const http={post:async()=>{posts++;return {kind:'response' as const,status,json:{}};},listPage:async()=>({ok:true as const,items:[],hasMore:false}),getDetail:async()=>({ok:false as const,detail:'not available'})};
    const input={connection:{apiVersion:'v2' as const,mode:'test-mock' as const,grantedScopes:['planned:read','planned:write']},refs,planVersionId:id,operations:p.ops.map(o=>o.source),ledger,http,stopOnRejected:true,noRetry:true};
    expect((await sendPlannedV2(input)).status).not.toBe('DONE');expect(posts).toBe(1);
    expect((await sendPlannedV2(input)).status).not.toBe('DONE');expect(posts).toBe(1);
  });
});
