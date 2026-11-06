import {describe,it,expect,vi} from 'vitest';
import {runCoachExport,type CoachFlowPorts} from '../coachExportFlow';
const hash='a'.repeat(64),refs='b'.repeat(64),ops='c'.repeat(64),job='33333333-3333-4333-8333-333333333333';
function fixture(total=10){
 const rows=Array.from({length:total},(_,i)=>({sessionKey:`S${i+1}-J1-0`,date:'2026-11-09',sport:'bike',title:'Test',status:'operation',reason:null,opIndex:i}));
 const dry={status:'PROGRESS',code:'ok',planSha256:hash,refsSha256:refs,opsSha256:ops,precheck:{totalSessions:total,operations:total,excludedRest:0,refused:0,complete:true,rows},manifest:rows.map((r,i)=>({opIndex:i,sessionKey:r.sessionKey,date:r.date,kind:'training',path:'/api/v2/planned/trainings/',bodySha256:hash})),progress:{jobId:job,totalOps:total,valid:total,refused:0,unknown:0,pending:0,stoppedOn:null,processedThisBatch:total,fullyValidated:true}};
 let sent=0,verified=0;const invoke=vi.fn(async(name:string,body:Record<string,unknown>)=>{
  if(name==='nolio-v2-plan-dry-run')return dry;
  if(body.action==='precheck')return {status:'READY',gate:[],preview:{planSha256:hash,refsSha256:refs,opsSha256:ops}};
  if(body.action==='send'){sent=Math.min(sent+8,total);return {status:sent===total?'DONE':'STOPPED_BATCH_LIMIT',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:Array.from({length:sent},()=>({state:'confirmed'}))};}
  if(body.action==='verify'){verified=Math.min(verified+8,sent);return {status:'VERIFY',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops}};}
  throw Error('unexpected');
 });
 const p:CoachFlowPorts={planVersionId:job,planSha256:hash,scope:{kind:'all'},current:()=>true,stopRequested:()=>false,invoke,confirmSimulation:vi.fn(async()=>true),verifyReceipts:vi.fn(async()=>({verified,total,fullyVerified:verified===total,nextIndex:verified})),progress:vi.fn(),sleep:async()=>{}};
 return {p,invoke,dry,setSent:(n:number)=>{sent=n;}};
}
describe('one-click coach export controller',()=>{
 it('automatically validates, sends bounded lots and verifies each before continuing',async()=>{
  const {p,invoke}=fixture();expect(await runCoachExport(p)).toEqual({verified:10,total:10});
  expect(invoke.mock.calls.map(([,b])=>b.action)).toEqual(['precheck','run','precheck','send','verify','send','verify']);
  expect(invoke.mock.calls.filter(([n])=>n==='nolio-v2-send-plan').every(([,b])=>b.workflow==='coach')).toBe(true);
  expect(invoke.mock.calls.filter(([,b])=>b.action==='send').every(([,b])=>b.consent===true)).toBe(true);
 });
 it('never sends without exact own simulation receipts',async()=>{const {p,invoke}=fixture();p.confirmSimulation=async()=>false;await expect(runCoachExport(p)).rejects.toThrow('reçus');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);});
 it('stops before the next batch on uncertain provider readback',async()=>{const {p,invoke}=fixture();p.verifyReceipts=async()=>({verified:0,total:10,fullyVerified:false,nextIndex:0});await expect(runCoachExport(p)).rejects.toThrow('Présence exacte');expect(invoke.mock.calls.filter(([,b])=>b.action==='send')).toHaveLength(1);});
 it('never retries an uncertain creation and reports no completion',async()=>{const {p,invoke}=fixture();invoke.mockImplementation(async(name,b)=>name==='nolio-v2-plan-dry-run'?fixture().dry:b.action==='precheck'?{status:'READY',gate:[],preview:{planSha256:hash,refsSha256:refs,opsSha256:ops}}:{status:'STOPPED_UNCONFIRMED',reason:'response_lost',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops}});await expect(runCoachExport(p)).rejects.toThrow('Aucune relance automatique');expect(invoke.mock.calls.filter(([,b])=>b.action==='send')).toHaveLength(1);});
 it('read-only verification does not invoke send or consent',async()=>{const {p,invoke,setSent}=fixture(2);setSent(2);expect(await runCoachExport(p,true)).toEqual({verified:2,total:2});expect(invoke.mock.calls.some(([,b])=>b.action==='send'||b.consent===true)).toBe(false);});
 it('stops when context changes and does not accept stale results',async()=>{const {p,invoke}=fixture();let active=true;p.current=()=>active;p.confirmSimulation=async()=>{active=false;return true;};await expect(runCoachExport(p)).rejects.toThrow('interrompue');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);});
 it('rejects changed references after precheck, before any create',async()=>{const {p,invoke,dry}=fixture();invoke.mockImplementation(async(_name,b)=>({...dry,refsSha256:b.action==='run'?'d'.repeat(64):refs}));await expect(runCoachExport(p)).rejects.toThrow('correspondances modifiés');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);});
});
