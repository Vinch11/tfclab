import {describe,it,expect,vi} from 'vitest';
import {checkCalendarConflict,markersForVersion} from '../../../../supabase/functions/_shared/nolioV2/calendarConflicts';
import {withCalendarWriteLock} from '../../../../supabase/functions/_shared/nolioV2/calendarWriteLock';
import {sendPlannedV2,type NolioV2Http,type NolioV2Ledger} from '../../../../supabase/functions/_shared/nolioV2/plannedClient';
import type {V2Operation} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
const version='22222222-2222-4222-8222-222222222222',old='33333333-3333-4333-8333-333333333333';
const op:V2Operation={kind:'training',sessionKey:'S1-J1-0',sourceId:'V3P_BIKE_147',precisionNotes:[],path:'/api/v2/planned/trainings/',body:{date_start:'2026-11-09',name:'Nouveau titre',sport:'spt_BIKE',athletes:['usr_TEST']}};
const detail={id:'ptrn_OLD',date_start:'2026-11-09',sport:'spt_BIKE',description:'Ancien titre et autres watts'};
async function fixture(){
 const currentMarkers=await markersForVersion(version,[op]);
 const http={listPage:vi.fn(async(_path:string,_athlete:string,_date:string,_after:string|null)=>({ok:true as const,items:[{id:detail.id}],hasMore:false})),getDetail:vi.fn(async(_path:string,_id:string,_athlete:string)=>({ok:true as const,item:{...detail} as Record<string,unknown>}))};
 const a={op,http,athleteRef:'usr_TEST',currentMarkers,priorRemoteIds:new Set<string>(),deadline:1000,now:()=>0};
 return {a,http};
}
describe('cross-version calendar checks (injected reads, no real Nolio traffic)',()=>{
 it('finds an older version after a change of title, workout and targets',async()=>{
  const {a,http}=await fixture();http.getDetail.mockResolvedValue({ok:true,item:{...detail,description:[...await markersForVersion(old,[op])][0]}});
  expect(await checkCalendarConflict(a)).toMatchObject({status:'conflict',count:1});
  expect(http.listPage).toHaveBeenCalledWith(op.path,'usr_TEST','2026-11-09',null);
 });
 it('finds a known old resource after its marker has been removed',async()=>{const {a}=await fixture();a.priorRemoteIds.add(detail.id);expect(await checkCalendarConflict(a)).toMatchObject({status:'conflict',count:1});});
 it('leaves an ordinary manually written session alone',async()=>{const {a}=await fixture();expect(await checkCalendarConflict(a)).toMatchObject({status:'clear',count:0});});
 it('does not confuse a legitimate second current-version session with an old plan',async()=>{const {a,http}=await fixture();http.getDetail.mockResolvedValue({ok:true,item:{...detail,description:[...a.currentMarkers][0]}});expect(await checkCalendarConflict(a)).toMatchObject({status:'clear',count:0});});
 it('does not flag an old activity in a different sport on the same day',async()=>{const {a,http}=await fixture();a.priorRemoteIds.add(detail.id);http.getDetail.mockResolvedValue({ok:true,item:{...detail,sport:'spt_RUN'}});expect(await checkCalendarConflict(a)).toMatchObject({status:'clear'});});
 it('reads later pages before granting clearance',async()=>{
  const {a,http}=await fixture();a.priorRemoteIds.add('ptrn_LATER');
  http.listPage.mockImplementation(async(_p,_a,_d,after)=>({ok:true,items:[{id:after?'ptrn_LATER':detail.id}],hasMore:!after}));
  http.getDetail.mockImplementation(async(_p,id)=>({ok:true,item:{...detail,id}}));
  expect(await checkCalendarConflict(a)).toMatchObject({status:'conflict',count:1});expect(http.listPage).toHaveBeenCalledTimes(2);
 });
 it('counts a matching old activity once even with several foreign markers',async()=>{const {a,http}=await fixture();a.priorRemoteIds.add(detail.id);http.getDetail.mockResolvedValue({ok:true,item:{...detail,description:[...await markersForVersion(old,[op])][0]}});expect(await checkCalendarConflict(a)).toMatchObject({status:'conflict',count:1});});
 it('treats a repeated pagination item as unknown',async()=>{const {a,http}=await fixture();http.listPage.mockResolvedValue({ok:true,items:[{id:detail.id}],hasMore:true});expect(await checkCalendarConflict(a)).toMatchObject({status:'unknown',reason:'calendar_pagination_invalid'});});
 it('treats missing detail/date and a divergent returned day as unknown',async()=>{for(const patch of [{date_start:undefined},{date_start:'2026-11-10'},{id:'ptrn_OTHER'}]){const {a,http}=await fixture();http.getDetail.mockResolvedValue({ok:true,item:{...detail,...patch}});expect(await checkCalendarConflict(a)).toMatchObject({status:'unknown'});}});
 it('does not call a failed, empty or timed-out read a clear calendar',async()=>{
  const {a,http}=await fixture();http.listPage.mockRejectedValue(Error('transport'));expect(await checkCalendarConflict(a)).toMatchObject({status:'unknown'});
  http.listPage.mockResolvedValue({ok:true,items:[],hasMore:true});expect(await checkCalendarConflict(a)).toMatchObject({status:'unknown'});
  expect(await checkCalendarConflict({...a,now:()=>1000})).toMatchObject({status:'unknown',reason:'calendar_read_timeout'});
 });
 it('returns no provider IDs, text, targets or audience in the conflict diagnostic',async()=>{const {a}=await fixture();a.priorRemoteIds.add(detail.id);const text=JSON.stringify(await checkCalendarConflict(a));for(const secret of ['ptrn_OLD','Ancien','spt_BIKE','usr_TEST'])expect(text).not.toContain(secret);});
 it.each(['previous_version_calendar_conflict','calendar_read_failed'])('a %s causes zero claims and zero POSTs',async(reason)=>{
  const claim=vi.fn(),post=vi.fn();const ledger:NolioV2Ledger={claim,transition:vi.fn()};
  const http={post,listPage:vi.fn(),getDetail:vi.fn()} as NolioV2Http;
  const r=await sendPlannedV2({connection:{apiVersion:'v2',mode:'test-mock',grantedScopes:['planned:read','planned:write']},refs:{synthetic:true,athleteId:'usr_TEST',sportIds:{bike:'spt_BIKE'},exerciseIds:{},competition:null},planVersionId:version,operations:[op],ledger,http,beforeClaim:async()=>reason});
  expect(r).toMatchObject({status:'BLOCKED',reason});expect(claim).not.toHaveBeenCalled();expect(post).not.toHaveBeenCalled();
 });
});
describe('provider calendar write lease',()=>{
 it('serializes two different versions sharing the same provider calendar',async()=>{
  let held=false,release!:()=>void;const wait=new Promise<void>(r=>{release=r;});
  const rpc=vi.fn(async(name:string)=>{if(name.includes('begin')){if(held)return {data:false,error:null};held=true;return {data:true,error:null};}held=false;return {data:true,error:null};});
  const input={client:{rpc},coachId:'coach',athleteRef:'usr_TEST',planVersionId:version};
  const first=withCalendarWriteLock({...input,run:async()=>{await wait;return 1;}});await Promise.resolve();
  const second=vi.fn(async()=>2);await expect(withCalendarWriteLock({...input,planVersionId:old,run:second})).rejects.toThrow('calendar_write_busy');expect(second).not.toHaveBeenCalled();
  release();expect(await first).toBe(1);expect(await withCalendarWriteLock({...input,planVersionId:old,run:second})).toBe(2);
  const calls=rpc.mock.calls;expect(calls.filter(([n])=>n==='nolio_v2_end_calendar_write')).toHaveLength(2);
 });
 it('releases its own lease after a failed scan, and never swallows the original error',async()=>{const rpc=vi.fn(async()=>({data:true,error:null}));await expect(withCalendarWriteLock({client:{rpc},coachId:'coach',athleteRef:'usr_TEST',planVersionId:version,run:async()=>{throw Error('read failed');}})).rejects.toThrow('read failed');expect(rpc).toHaveBeenCalledTimes(2);});
 it('never runs on an unavailable or malformed acquisition response',async()=>{for(const data of [null,false,{},'true']){const run=vi.fn();await expect(withCalendarWriteLock({client:{rpc:async()=>({data,error:null})},coachId:'coach',athleteRef:'usr_TEST',planVersionId:version,run})).rejects.toThrow('calendar_write_busy');expect(run).not.toHaveBeenCalled();}});
});
