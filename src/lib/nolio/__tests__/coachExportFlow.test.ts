import {describe,it,expect,vi} from 'vitest';
import {runCoachExport,type CoachFlowPorts} from '../coachExportFlow';
const hash='a'.repeat(64),refs='b'.repeat(64),ops='c'.repeat(64),job='33333333-3333-4333-8333-333333333333';
function fixture(total=10){
 const rows=Array.from({length:total},(_,i)=>({sessionKey:`S${i+1}-J1-0`,date:'2026-11-09',sport:'bike',title:'Test',status:'operation',reason:null,opIndex:i}));
 const dry={status:'PROGRESS',code:'ok',planSha256:hash,refsSha256:refs,opsSha256:ops,precheck:{totalSessions:total,operations:total,excludedRest:0,refused:0,complete:true,rows},manifest:rows.map((r,i)=>({opIndex:i,sessionKey:r.sessionKey,date:r.date,kind:'training',path:'/api/v2/planned/trainings/',bodySha256:hash})),progress:{jobId:job,totalOps:total,valid:total,refused:0,unknown:0,pending:0,stoppedOn:null,processedThisBatch:total,fullyValidated:true}};
 let sent=0,verified=0;const invoke=vi.fn(async(name:string,body:Record<string,unknown>):Promise<Record<string,unknown>>=>{
  if(name==='nolio-v2-plan-dry-run')return dry;
  if(body.action==='conflicts'){const from=Number(body.fromIndex),end=Math.min(from+8,total);return {status:'CALENDAR_CHECK',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},fromIndex:from,nextIndex:end,total,rows:dry.manifest.slice(from,end).map(e=>({...e,status:'clear',count:0,reason:'calendar_clear'}))};}
  if(body.action==='precheck')return {status:'READY',existingThroughIndex:sent,gate:[],preview:{planSha256:hash,refsSha256:refs,opsSha256:ops}};
  if(body.action==='send'){sent=Math.min(sent+8,total);return {status:sent===total?'DONE':'STOPPED_BATCH_LIMIT',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:Array.from({length:sent},()=>({state:'confirmed'}))};}
  if(body.action==='verify'){verified=Math.min(verified+8,sent);return {status:'VERIFY',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops}};}
  throw Error('unexpected');
 });
 const p:CoachFlowPorts={planVersionId:job,planSha256:hash,scope:{kind:'all'},current:()=>true,stopRequested:()=>false,invoke,confirmSimulation:vi.fn(async()=>true),verifyReceipts:vi.fn(async()=>({verified,total,fullyVerified:verified===total,nextIndex:verified})),progress:vi.fn(),sleep:async()=>{}};
 return {p,invoke,dry,setSent:(n:number)=>{sent=n;}};
}
describe('one-click coach export controller',()=>{
 it('checks the complete selection and blocks a late previous-version conflict before any simulation or create',async()=>{
  const {p,invoke}=fixture(20),original=invoke.getMockImplementation()!;
  invoke.mockImplementation(async(n,b)=>{const r=await original(n,b);if(b.action==='conflicts'&&b.fromIndex===16)(r.rows as Array<Record<string,unknown>>)[0]={...(r.rows as Array<Record<string,unknown>>)[0],status:'conflict',count:1,reason:'previous_version_calendar_conflict'};return r;});
  await expect(runCoachExport(p)).rejects.toThrow('ancienne(s) activité(s)');expect(invoke.mock.calls.some(([,b])=>b.action==='send'||b.action==='run')).toBe(false);
 });
 it('offers standalone read-only reconciliation with no consent, simulation, receipt or send',async()=>{
  const {p,invoke}=fixture(20);expect(await runCoachExport(p,false,true)).toEqual({verified:0,total:20});
  expect(invoke.mock.calls.map(([,b])=>b.action)).toEqual(['precheck','conflicts','conflicts','conflicts']);expect(p.confirmSimulation).not.toHaveBeenCalled();expect(p.verifyReceipts).not.toHaveBeenCalled();expect(invoke.mock.calls.some(([,b])=>b.consent===true)).toBe(false);
 });
 it.each(['unknown','clear'])('refuses malformed or unknown %s calendar results before any create',async(status)=>{
  const {p,invoke}=fixture(2),original=invoke.getMockImplementation()!;invoke.mockImplementation(async(n,b)=>{const r=await original(n,b);if(b.action==='conflicts')(r.rows as Array<Record<string,unknown>>)[0]={...(r.rows as Array<Record<string,unknown>>)[0],status,count:2};return r;});
  await expect(runCoachExport(p)).rejects.toThrow('Aucun nouvel envoi');expect(invoke.mock.calls.some(([,b])=>b.action==='send'||b.action==='run')).toBe(false);
 });
 it('shows running target mismatches in min/km while retaining a read-only stop',async()=>{
  const {p,invoke,dry}=fixture(1);dry.precheck.rows[0].sport='run';const original=invoke.getMockImplementation()!;
  invoke.mockImplementation(async(name,b)=>b.action==='verify'?{status:'VERIFY',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:[{opIndex:0,result:'ambiguous',diagnostic:{candidates:1,exact:0,fields:['workout'],targets:[{path:'workout[0].targets[0]',unit:'m/s',sent:{value:2.0833333333333335,value_max:3.125},read:{value:2.08,value_max:3.20},resolved:{}}]}}]}:original(name,b));
  await expect(runCoachExport(p,true)).rejects.toThrow('envoyé 5:20–8:00 min/km');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);
 });
 it('automatically validates, sends bounded lots and verifies each before continuing',async()=>{
  const {p,invoke}=fixture();expect(await runCoachExport(p)).toEqual({verified:10,total:10});
  expect(invoke.mock.calls.map(([,b])=>b.action)).toEqual(['precheck','conflicts','conflicts','run','precheck','send','verify','send','verify']);
  expect(invoke.mock.calls.filter(([n])=>n==='nolio-v2-send-plan').every(([,b])=>b.workflow==='coach')).toBe(true);
  expect(invoke.mock.calls.filter(([,b])=>b.action==='send').every(([,b])=>b.consent===true)).toBe(true);
 });
 it('checks previous creates before sending more on resume',async()=>{const {p,invoke,setSent}=fixture();setSent(8);expect(await runCoachExport(p)).toEqual({verified:10,total:10});const actions=invoke.mock.calls.map(([,b])=>b.action);expect(actions).toEqual(['precheck','conflicts','conflicts','run','precheck','verify','send','verify']);});
 it('a deleted or divergent previous activity prevents any additional create',async()=>{const {p,invoke,setSent}=fixture();setSent(8);p.verifyReceipts=async()=>({verified:0,total:10,fullyVerified:false,nextIndex:0});await expect(runCoachExport(p)).rejects.toThrow('Présence exacte');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);});
 it('continues through 101 operations, never treating three weeks as complete',async()=>{const {p,invoke}=fixture(101);expect(await runCoachExport(p)).toEqual({verified:101,total:101});expect(invoke.mock.calls.filter(([,b])=>b.action==='send')).toHaveLength(13);});
 it('never sends without exact own simulation receipts',async()=>{const {p,invoke}=fixture();p.confirmSimulation=async()=>false;await expect(runCoachExport(p)).rejects.toThrow('reçus');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);});
 it('stops before the next batch on uncertain provider readback',async()=>{const {p,invoke}=fixture();p.verifyReceipts=async()=>({verified:0,total:10,fullyVerified:false,nextIndex:0});await expect(runCoachExport(p)).rejects.toThrow('Présence exacte');expect(invoke.mock.calls.filter(([,b])=>b.action==='send')).toHaveLength(1);});
 it('never retries an uncertain creation and reports no completion',async()=>{const {p,invoke}=fixture();const original=invoke.getMockImplementation()!;invoke.mockImplementation(async(name,b)=>name==='nolio-v2-plan-dry-run'||b.action==='conflicts'?original(name,b):b.action==='precheck'?{status:'READY',existingThroughIndex:0,gate:[],preview:{planSha256:hash,refsSha256:refs,opsSha256:ops}}:{status:'STOPPED_UNCONFIRMED',reason:'response_lost',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops}});await expect(runCoachExport(p)).rejects.toThrow('Aucune relance automatique');expect(invoke.mock.calls.filter(([,b])=>b.action==='send')).toHaveLength(1);});
 it('explains an unsent remaining activity during read-only checking without sending it',async()=>{const {p,invoke}=fixture(2);const original=invoke.getMockImplementation()!;invoke.mockImplementation(async(n,b)=>b.action==='verify'?{status:'VERIFY',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:[{opIndex:0,result:'not_sent'}]}:original(n,b));await expect(runCoachExport(p,true)).rejects.toThrow('n’a pas encore été envoyée');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);});
 it('read-only verification does not invoke send or consent',async()=>{const {p,invoke,setSent}=fixture(2);setSent(2);expect(await runCoachExport(p,true)).toEqual({verified:2,total:2});expect(invoke.mock.calls.some(([,b])=>b.action==='send'||b.consent===true)).toBe(false);});
 it('stops when context changes and does not accept stale results',async()=>{const {p,invoke}=fixture();let active=true;p.current=()=>active;p.confirmSimulation=async()=>{active=false;return true;};await expect(runCoachExport(p)).rejects.toThrow('interrompue');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);});
 it('rejects changed references after precheck, before any create',async()=>{const {p,invoke,dry}=fixture();const original=invoke.getMockImplementation()!;invoke.mockImplementation(async(name,b)=>b.action==='conflicts'?original(name,b):({...dry,refsSha256:b.action==='run'?'d'.repeat(64):refs}));await expect(runCoachExport(p)).rejects.toThrow('correspondances modifiés');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);});
});
