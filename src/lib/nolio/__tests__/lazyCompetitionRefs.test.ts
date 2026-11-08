import {describe,it,expect,vi} from 'vitest';
import {runCoachExport,sportRefsFailureMessage,type CoachFlowPorts} from '../coachExportFlow';
const hash='a'.repeat(64),refs='b'.repeat(64),ops='c'.repeat(64),id='22222222-2222-4222-8222-222222222222';
function setup(missing=false,reason='sport_reference_missing:brick'){
 let absent=missing;
 const row={sessionKey:'S12-J6-0',date:'2027-01-31',sport:'brick',title:'COURSE : 70.3',status:'operation',reason:null,opIndex:0};
 const valid={status:'PROGRESS',code:'ok',planSha256:hash,refsSha256:refs,opsSha256:ops,precheck:{totalSessions:1,operations:1,excludedRest:0,refused:0,complete:true,rows:[row]},manifest:[{opIndex:0,sessionKey:row.sessionKey,date:row.date,kind:'competition',path:'/api/v2/planned/competitions/',bodySha256:hash}],progress:{jobId:id,totalOps:1,valid:1,refused:0,unknown:0,pending:0,stoppedOn:null,processedThisBatch:1,fullyValidated:true}};
 const invoke=vi.fn(async(name:string,body:Record<string,unknown>):Promise<unknown>=>{
  if(name==='nolio-v2-plan-dry-run')return body.action==='precheck'&&absent?{...valid,manifest:[],progress:null,precheck:{...valid.precheck,operations:0,refused:1,complete:false,rows:[{...row,status:'refused',reason}]}}:valid;
  if(body.action==='verify')return {status:'VERIFY',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:[{opIndex:0,result:'verified_unique'}]};
  throw Error('Unexpected action '+body.action);
 });
 const refresh=vi.fn(async()=>{absent=false;});
 const p:CoachFlowPorts={planVersionId:id,planSha256:hash,scope:{kind:'weeks',from:12,to:12},current:()=>true,stopRequested:()=>false,invoke,confirmSimulation:async()=>true,verifyReceipts:async()=>({verified:1,total:1,fullyVerified:true,nextIndex:0}),progress:vi.fn(),refreshCompetitionRefs:refresh,sleep:async()=>{}};
 return {p,invoke,refresh};
}
describe('fresh server-owned competition references before another provider read',()=>{
 it('does not read sports when the server already accepts the selected plan',async()=>{
  const {p,invoke,refresh}=setup();
  expect(await runCoachExport(p,true)).toEqual({verified:1,total:1});expect(refresh).not.toHaveBeenCalled();
  expect(invoke.mock.calls.filter(([,b])=>b.action==='precheck')).toHaveLength(1);
 });
 it('refreshes a missing competition mapping once and requires a new complete server precheck',async()=>{
  const {p,invoke,refresh}=setup(true);
  expect(await runCoachExport(p,true)).toEqual({verified:1,total:1});expect(refresh).toHaveBeenCalledOnce();
  expect(invoke.mock.calls.map(([,b])=>b.action)).toEqual(['precheck','precheck','run','verify']);
 });
 it('does not loop or send if the mapping is still refused after refresh',async()=>{
  const {p,invoke,refresh}=setup(true);refresh.mockImplementation(async()=>{});
  await expect(runCoachExport(p,true)).rejects.toThrow('sport Nolio non associé');
  expect(refresh).toHaveBeenCalledOnce();expect(invoke.mock.calls.map(([,b])=>b.action)).toEqual(['precheck','precheck']);
 });
 it('does not retry an unsuccessful refs action or create an activity',async()=>{
  const {p,invoke,refresh}=setup(true);refresh.mockImplementation(async()=>{throw Error('Sports unavailable');});
  await expect(runCoachExport(p,true)).rejects.toThrow('Sports unavailable');
  expect(refresh).toHaveBeenCalledOnce();expect(invoke).toHaveBeenCalledOnce();
 });
 it.each(['sport_reference_missing:run','multisport_contract_unconfirmed'])('does not refresh competition refs for another blocker: %s',async reason=>{
  const {p,invoke,refresh}=setup(true,reason);
  await expect(runCoachExport(p,true)).rejects.toThrow();expect(refresh).not.toHaveBeenCalled();expect(invoke).toHaveBeenCalledOnce();
 });
 it('stops after context changes during refresh',async()=>{
  const {p,invoke,refresh}=setup(true);let current=true;p.current=()=>current;refresh.mockImplementation(async()=>{current=false;});
  await expect(runCoachExport(p,true)).rejects.toThrow('interrompue');expect(invoke).toHaveBeenCalledOnce();
 });
 it('reports safe failure categories without echoing arbitrary response content',()=>{
  expect(sportRefsFailureMessage({reason:'sports_read_rate_limited'})).toContain('Nolio limite');
  expect(sportRefsFailureMessage({reason:'sports_read_authorization'})).toContain('autorisation');
  expect(sportRefsFailureMessage({reason:'refresh:unknown'})).toContain('Aucun nouvel essai');
  for(const reason of ['PRIVATE RESPONSE','__proto__','constructor'])expect(sportRefsFailureMessage({reason})).not.toContain(reason);
 });
});
