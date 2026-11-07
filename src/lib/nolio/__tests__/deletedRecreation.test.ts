import {describe,it,expect,vi} from 'vitest';
import {inspectDeletedOperation,recreationLedger} from '../../../../supabase/functions/_shared/nolioV2/deletedRecreation';
import {bodyToSend,operationKey,sendPlannedV2,type LedgerEntry,type NolioV2Http,type NolioV2Ledger} from '../../../../supabase/functions/_shared/nolioV2/plannedClient';
import type {Prepared,FrozenOp} from '../../../../supabase/functions/_shared/nolioV2/planDryRun';
import type {V2Operation} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
const pv='22222222-2222-4222-8222-222222222222',coach='33333333-3333-4333-8333-333333333333';
async function fixture(){
 const source:V2Operation={kind:'training',path:'/api/v2/planned/trainings/',sessionKey:'S1-J1-1',sourceId:'V3P_BIKE_147',precisionNotes:[],body:{name:'SYNTHETIC',date_start:'2026-11-10',sport:'spt_BIKE',athletes:['usr_TEST'],description:'Synthetic source',workout:[{kind:'step',duration:{value:900,unit:'s'},targets:[{type:'raw',unit:'W',value:200,value_max:250}]}]}};
 const key=await operationKey(pv,source),body=await bodyToSend(pv,source);
 const op:FrozenOp={opIndex:0,sessionKey:source.sessionKey,date:'2026-11-10',kind:'training',path:source.path,source,body,bodySha256:key.payloadSha256};
 const prepared:Prepared={precheck:{} as Prepared['precheck'],ops:[op],planSha256:'a'.repeat(64),refsSha256:'b'.repeat(64),opsSha256:'c'.repeat(64)};
 const entry:LedgerEntry={opKey:key.opKey,planVersionId:pv,sessionKey:source.sessionKey,path:source.path,athleteRef:'usr_TEST',payloadSha256:key.payloadSha256,apiVersion:'v2',state:'confirmed',remoteId:'ptrn_OLD',detail:'acknowledged'};
 const http:NolioV2Http={getDetail:vi.fn(async()=>({ok:false as const,detail:'http_404'})),listPage:vi.fn(async()=>({ok:true as const,items:[],hasMore:false})),post:vi.fn()};
 const input={http,entry,op,prepared,planVersionId:pv,athleteRef:'usr_TEST',deadline:1000,now:()=>0};
 return {input,http,entry,op,prepared};
}
describe('acknowledged deleted activity recreation, no real provider calls',()=>{
 it('requires a direct resource 404 AND a complete empty candidate search',async()=>{const {input,http}=await fixture();expect(await inspectDeletedOperation(input)).toMatchObject({status:'deleted',reason:'known_resource_404_and_complete_day_absence',binding:expect.stringMatching(/^[a-f0-9]{64}$/)});expect(http.getDetail).toHaveBeenCalledWith(input.op.path,'ptrn_OLD','usr_TEST');expect(http.listPage).toHaveBeenCalledWith(input.op.path,'usr_TEST','2026-11-10',null);expect(http.post).not.toHaveBeenCalled();});
 it.each(['http_401','http_403','http_429','http_500','timeout','network_error'])('never treats %s as a deletion',async detail=>{const {input,http}=await fixture();vi.mocked(http.getDetail).mockResolvedValue({ok:false,detail});expect(await inspectDeletedOperation(input)).toMatchObject({status:'blocked',reason:'recreation_read_unknown'});expect(http.post).not.toHaveBeenCalled();});
 it('detects a moved/edited resource through its original ID even when the planned day is empty',async()=>{const {input,http}=await fixture();vi.mocked(http.getDetail).mockResolvedValue({ok:true,item:{...input.op.body,id:'ptrn_OLD',date_start:'2026-11-12'}});expect(await inspectDeletedOperation(input)).toMatchObject({status:'blocked',reason:'recreation_resource_moved_or_changed'});expect(http.listPage).not.toHaveBeenCalled();});
 it('recognizes a present exact resource with a full unique calendar read',async()=>{const {input,http}=await fixture();const item={...input.op.body,id:'ptrn_OLD'};vi.mocked(http.getDetail).mockResolvedValue({ok:true,item});vi.mocked(http.listPage).mockResolvedValue({ok:true,items:[item],hasMore:false});expect(await inspectDeletedOperation(input)).toEqual({status:'present',reason:'exact_unique'});});
 it('refuses recreation if the old ID is gone but another exact marked copy exists',async()=>{const {input,http}=await fixture();const item={...input.op.body,id:'ptrn_CLONE'};vi.mocked(http.getDetail).mockImplementation(async(_path,id)=>id==='ptrn_OLD'?{ok:false,detail:'http_404'}:{ok:true,item});vi.mocked(http.listPage).mockResolvedValue({ok:true,items:[item],hasMore:false});expect(await inspectDeletedOperation(input)).toMatchObject({status:'blocked'});});
 it('keeps partial/unreadable pagination unknown',async()=>{const {input,http}=await fixture();vi.mocked(http.listPage).mockResolvedValue({ok:false,detail:'timeout'});expect(await inspectDeletedOperation(input)).toMatchObject({status:'blocked'});vi.mocked(http.listPage).mockResolvedValue({ok:true,items:[],hasMore:true});expect(await inspectDeletedOperation(input)).toMatchObject({status:'blocked'});});
 it.each(['sending','sent_unconfirmed','ambiguous','rejected','rate_limited'] as const)('never retries an uncertain or unacknowledged %s operation',async state=>{const {input,http}=await fixture();input.entry.state=state;expect(await inspectDeletedOperation(input)).toMatchObject({status:'blocked',reason:'recreation_uncertain_operation'});expect(http.getDetail).not.toHaveBeenCalled();});
 it('binds the decision to the exact version/provider/body/ref set and previous resource',async()=>{const {input}=await fixture();const first=await inspectDeletedOperation(input);expect(first.binding).toBeDefined();input.entry.remoteId='ptrn_NEW';expect((await inspectDeletedOperation(input)).binding).not.toBe(first.binding);input.entry.athleteRef='usr_OTHER';expect(await inspectDeletedOperation(input)).toMatchObject({status:'blocked',reason:'recreation_ledger_divergent'});});
 it('refuses deadline exhaustion and direct detail ID divergence',async()=>{const {input,http}=await fixture();expect(await inspectDeletedOperation({...input,now:()=>1000})).toMatchObject({status:'blocked'});vi.mocked(http.getDetail).mockResolvedValue({ok:true,item:{...input.op.body,id:'ptrn_OTHER'}});expect(await inspectDeletedOperation(input)).toMatchObject({status:'blocked'});});
 it('an audited atomic claim permits only one recreation across two concurrent calls',async()=>{
  const {input,http,entry,prepared,op}=await fixture();let state=entry.state,posts=0;let release!:()=>void;const hold=new Promise<void>(r=>{release=r;});
  const rpc=vi.fn(async()=>{if(state!=='confirmed')return {data:false,error:null};state='sending';return {data:true,error:null};});
  const ordinary:NolioV2Ledger={claim:vi.fn(),transition:async(_k,from,to)=>{if(state!==from)return false;state=to;return true;}};
  http.post=vi.fn(async()=>{posts++;await hold;return {kind:'response' as const,status:201,json:{id:'ptrn_NEW'}};});
  const run=()=>sendPlannedV2({connection:{apiVersion:'v2',mode:'test-mock',grantedScopes:['planned:read','planned:write']},refs:{synthetic:true,athleteId:'usr_TEST',sportIds:{bike:'spt_BIKE'},exerciseIds:{},competition:null},planVersionId:pv,operations:[op.source],http,ledger:recreationLedger({client:{rpc},ledger:ordinary,entry,prepared,coachId:coach,requestId:'request',binding:'d'.repeat(64)}),noRetry:true});
  const a=run(),b=run();await vi.waitFor(()=>expect(posts).toBe(1));release();const results=await Promise.all([a,b]);expect(results.filter(r=>r.status==='DONE')).toHaveLength(1);expect(posts).toBe(1);expect(ordinary.claim).not.toHaveBeenCalled();expect(state).toBe('confirmed');
 });
 it('a lost recreation response stays unconfirmed; subsequent ordinary recovery cannot claim deletion',async()=>{
  const {input,http,entry,prepared,op}=await fixture();const ordinary:NolioV2Ledger={claim:vi.fn(),transition:async(_k,_f,to)=>{entry.state=to;return true;}};
  http.post=vi.fn(async()=>({kind:'lost' as const,detail:'timeout'}));
  const ledger=recreationLedger({client:{rpc:async()=>({data:true,error:null})},ledger:ordinary,entry,prepared,coachId:coach,requestId:'request',binding:'d'.repeat(64)});
  const result=await sendPlannedV2({connection:{apiVersion:'v2',mode:'test-mock',grantedScopes:['planned:read','planned:write']},refs:{synthetic:true,athleteId:'usr_TEST',sportIds:{bike:'spt_BIKE'},exerciseIds:{},competition:null},planVersionId:pv,operations:[op.source],http,ledger,noRetry:true});
  expect(result.status).toBe('STOPPED_UNCONFIRMED');expect(entry.state).toBe('sent_unconfirmed');expect(await inspectDeletedOperation(input)).toMatchObject({status:'blocked',reason:'recreation_uncertain_operation'});expect(http.post).toHaveBeenCalledOnce();
 });
});
