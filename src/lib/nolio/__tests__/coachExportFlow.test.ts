import {describe,it,expect,vi} from 'vitest';
import {runCoachExport,type CoachFlowPorts} from '../coachExportFlow';
import {currentExportVerification} from '../exportVerification';
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
 it('runs the explicit comparative diagnostic without normal validation, calendar or send actions',async()=>{
  const {p,invoke,dry}=fixture(1),original=invoke.getMockImplementation()!;p.diagnoseOnly=true;
  invoke.mockImplementation(async(n,b)=>b.action==='inspect-refusal'?{status:'REFUSAL_DIAGNOSTIC',planSha256:hash,refsSha256:refs,opsSha256:ops,refusal:{opIndex:0,sessionKey:dry.manifest[0].sessionKey,date:dry.manifest[0].date,httpStatus:400,code:'validation_rejected_400',probes:[{test:'original',httpStatus:400,code:'validation_rejected_400',providerError:{code:'invalid_pace',message:'Use m:ss',fields:[]}},{test:'exact_numeric_mps',httpStatus:201,code:'dry_run_valid',providerError:null}]}}:original(n,b));
  await expect(runCoachExport(p)).rejects.toThrow('Format numérique exact : accepté');
  expect(invoke.mock.calls.map(([,b])=>b.action)).toEqual(['precheck','inspect-refusal']);expect(p.confirmSimulation).not.toHaveBeenCalled();expect(p.verifyReceipts).not.toHaveBeenCalled();
 });
 it('reports the frozen rejected session and allowlisted fields without reaching creates',async()=>{
  const {p,invoke,dry}=fixture(1),original=invoke.getMockImplementation()!;
  dry.progress={...dry.progress,valid:0,refused:1,pending:0,fullyValidated:false};
  invoke.mockImplementation(async(n,b)=>b.action==='inspect-refusal'?{status:'REFUSAL_DIAGNOSTIC',planSha256:hash,refsSha256:refs,opsSha256:ops,refusal:{opIndex:0,sessionKey:dry.manifest[0].sessionKey,date:dry.manifest[0].date,httpStatus:400,issues:[{field:'workout.1.targets.0.value_max',reason:'pace_format'},{field:'PRIVATE',reason:'invalid'}]}}:original(n,b));
  await expect(runCoachExport(p)).rejects.toThrow('S1-J1-0 · 2026-11-09 : Nolio refuse la simulation (HTTP 400). workout.1.targets.0.value_max : format d’allure refusé. Aucune activité créée');
  expect(invoke.mock.calls.filter(([,b])=>b.action==='inspect-refusal')).toHaveLength(1);
  expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);expect(p.confirmSimulation).not.toHaveBeenCalled();
 });
 it('never uses refusal diagnostics for an unknown outcome',async()=>{
  const {p,invoke,dry}=fixture(1);dry.progress={...dry.progress,valid:0,unknown:1,fullyValidated:false};
  await expect(runCoachExport(p)).rejects.toThrow('résultat inconnu');
  expect(invoke.mock.calls.some(([,b])=>b.action==='inspect-refusal'||b.action==='send')).toBe(false);
 });
 it('rereads replacements instead of completing from receipts for deleted resource IDs',async()=>{
  const {p,invoke,dry,setSent}=fixture(10),original=invoke.getMockImplementation()!;setSent(10);
  const bindings=dry.manifest.map(o=>({opIndex:o.opIndex,sessionKey:o.sessionKey,path:o.path,bodySha256:o.bodySha256,state:'confirmed',remoteId:`ptrn_CURRENT${o.opIndex}`}));
  const rows:Record<string,unknown>[]=dry.manifest.map(o=>({id:`11111111-1111-4111-8111-${String(o.opIndex).padStart(12,'0')}`,coach_id:'coach',plan_version_id:job,plan_sha256:hash,refs_sha256:refs,ops_sha256:ops,op_index:o.opIndex,session_key:o.sessionKey,session_date:o.date,body_sha256:o.bodySha256,kind:o.kind,path:o.path,outcome:'VERIFIED_UNIQUE',code:'exact_unique',complete_read:true,exact_matches:1,marker_matches:1,provider_resource:`ptrn_OLD${o.opIndex}`,created_at:'2026-11-07T12:00:00Z'}));
  invoke.mockImplementation(async(n,b)=>{
   const r=await original(n,b);
   if(b.action==='verify'){
    for(const o of dry.manifest.slice(Number(b.fromIndex),Number(b.fromIndex)+8))rows.push({...rows[o.opIndex],id:`22222222-2222-4222-8222-${String(o.opIndex).padStart(12,'0')}`,provider_resource:bindings[o.opIndex].remoteId,created_at:'2026-11-08T12:00:00Z'});
    return {...r,ledgerBindings:bindings};
   }
   return r;
  });
  p.verifyReceipts=async(r,ledgerBindings)=>currentExportVerification({coachId:'coach',planVersionId:job,resp:r,receipts:rows,ledgerBindings});
  expect(await runCoachExport(p,true)).toEqual({verified:10,total:10});
  expect(invoke.mock.calls.filter(([,b])=>b.action==='verify').map(([,b])=>b.fromIndex)).toEqual([0,8]);
  expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);
 });
 it.each([1,5,7,9])('resumes %i prior activities in a 10-activity selection without treating the unsent tail of a read batch as a failed prior send',async prior=>{
  const {p,invoke,setSent}=fixture(10),original=invoke.getMockImplementation()!;setSent(prior);let sent=prior;
  invoke.mockImplementation(async(n,b)=>{
   const r=await original(n,b);
   if(b.action==='send')sent=Math.min(sent+8,10);
   if(b.action==='verify'){const from=Number(b.fromIndex);return {...r,results:Array.from({length:Math.min(from+8,10)-from},(_,i)=>({opIndex:from+i,result:from+i<sent?'verified_unique':'not_sent'}))};}
   return r;
  });
  expect(await runCoachExport(p)).toEqual({verified:10,total:10});
  expect(invoke.mock.calls.filter(([,b])=>b.action==='send')).toHaveLength(Math.ceil((10-prior)/8));
  const actions=invoke.mock.calls.map(([,b])=>b.action);expect(actions.indexOf('verify')).toBeLessThan(actions.indexOf('send'));
 });
 it.each(['absent','ambiguous','unknown','ledger_body_divergent'])('does not ignore an unexpected %s beyond the prior prefix',async result=>{
  const {p,invoke,setSent}=fixture(10),original=invoke.getMockImplementation()!;setSent(5);
  invoke.mockImplementation(async(n,b)=>b.action==='verify'?{...await original(n,b),results:[{opIndex:6,result,retryableRead:true}]}:original(n,b));
  await expect(runCoachExport(p)).rejects.toThrow('Export arrêté');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);
 });
 it('still refuses a not_sent inside the already-attempted prefix',async()=>{
  const {p,invoke,setSent}=fixture(10),original=invoke.getMockImplementation()!;setSent(5);
  invoke.mockImplementation(async(n,b)=>b.action==='verify'?{...await original(n,b),results:[{opIndex:2,result:'not_sent'}]}:original(n,b));
  await expect(runCoachExport(p)).rejects.toThrow('n’a pas encore été envoyée');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);
 });
 it('read-only verification still reports the first unsent activity and never sends it',async()=>{
  const {p,invoke,setSent}=fixture(10),original=invoke.getMockImplementation()!;setSent(5);
  invoke.mockImplementation(async(n,b)=>b.action==='verify'?{...await original(n,b),results:[{opIndex:5,result:'not_sent'}]}:original(n,b));
  await expect(runCoachExport(p,true)).rejects.toThrow('n’a pas encore été envoyée');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);
 });
 it.each([100,'5'])('does not ignore an out-of-window or malformed unsent index %s',async opIndex=>{
  const {p,invoke,setSent}=fixture(10),original=invoke.getMockImplementation()!;setSent(5);
  invoke.mockImplementation(async(n,b)=>b.action==='verify'?{...await original(n,b),results:[{opIndex,result:'not_sent'}]}:original(n,b));
  await expect(runCoachExport(p)).rejects.toThrow('Export arrêté');expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);
 });
 it('restores an unanswered question with fresh server titles and requires a new decision before any write',async()=>{
  const {p,invoke,dry}=fixture(1);
  const decision={planSha256:hash,refsSha256:refs,opsSha256:ops,rows:[{...dry.manifest[0],title:'Untrusted cached title',binding:'d'.repeat(64)}]};
  p.confirmRecreation=vi.fn(async()=>false);p.pendingRecreation=vi.fn();
  await expect(runCoachExport(p,false,false,{kind:'resume',decision})).rejects.toThrow('Export annulé');
  expect(p.confirmRecreation).toHaveBeenCalledWith([{...decision.rows[0],title:'Test'}]);
  expect(invoke.mock.calls.map(([,b])=>b.action)).toEqual(['precheck']);
  expect(p.pendingRecreation).toHaveBeenCalledWith(null);
 });
 it('rejects a cached question after references or selection change, before confirmation or create',async()=>{
  const {p,invoke,dry}=fixture(1);p.confirmRecreation=vi.fn();p.pendingRecreation=vi.fn();
  const decision={planSha256:hash,refsSha256:'e'.repeat(64),opsSha256:ops,rows:[{...dry.manifest[0],title:'Test',binding:'d'.repeat(64)}]};
  await expect(runCoachExport(p,false,false,{kind:'resume',decision})).rejects.toThrow('contexte Nolio a changé');
  expect(p.confirmRecreation).not.toHaveBeenCalled();expect(invoke.mock.calls.map(([,b])=>b.action)).toEqual(['precheck']);expect(p.pendingRecreation).toHaveBeenCalledWith(null);
 });
 it('rereads a transient GET failure without repeating the create, then completes',async()=>{
  const {p,invoke}=fixture(2),original=invoke.getMockImplementation()!;let reads=0;
  invoke.mockImplementation(async(n,b)=>b.action==='verify'&&reads++===0?{status:'VERIFY',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:[{opIndex:0,result:'unknown',retryableRead:true}]}:original(n,b));
  expect(await runCoachExport(p)).toEqual({verified:2,total:2});
  expect(invoke.mock.calls.filter(([,b])=>b.action==='send')).toHaveLength(1);
  expect(invoke.mock.calls.filter(([,b])=>b.action==='verify')).toHaveLength(2);
 });
 it('bounds transient read retries and stops without sending a later batch',async()=>{
  const {p,invoke}=fixture(10),original=invoke.getMockImplementation()!;
  invoke.mockImplementation(async(n,b)=>b.action==='verify'?{status:'VERIFY',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:[{opIndex:0,result:'unknown',retryableRead:true}]}:original(n,b));
  await expect(runCoachExport(p)).rejects.toThrow('Export arrêté');
  expect(invoke.mock.calls.filter(([,b])=>b.action==='verify')).toHaveLength(3);
  expect(invoke.mock.calls.filter(([,b])=>b.action==='send')).toHaveLength(1);
 });
 it('reports a provider rate limit precisely without another create or an immediate retry',async()=>{
  const {p,invoke}=fixture(2),original=invoke.getMockImplementation()!;
  invoke.mockImplementation(async(n,b)=>b.action==='verify'?{status:'VERIFY',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:[{opIndex:0,result:'unknown',readFailure:'rate_limited'}]}:original(n,b));
  await expect(runCoachExport(p)).rejects.toThrow('Nolio limite les requêtes');
  expect(invoke.mock.calls.filter(([,b])=>b.action==='verify')).toHaveLength(1);expect(invoke.mock.calls.filter(([,b])=>b.action==='send')).toHaveLength(1);
 });
 it('does not reread an ambiguous, absent or unclassified result automatically',async()=>{
  for(const result of ['ambiguous','absent','unknown']){
   const {p,invoke}=fixture(2),original=invoke.getMockImplementation()!;
   invoke.mockImplementation(async(n,b)=>b.action==='verify'?{status:'VERIFY',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:[{opIndex:0,result}]}:original(n,b));
   await expect(runCoachExport(p)).rejects.toThrow('Export arrêté');
   expect(invoke.mock.calls.filter(([,b])=>b.action==='verify')).toHaveLength(1);
   expect(invoke.mock.calls.filter(([,b])=>b.action==='send')).toHaveLength(1);
  }
 });
 it('automatically inspects a deleted prior activity and resumes the same export after one contextual decision',async()=>{
  const {p,invoke,dry,setSent}=fixture(2),original=invoke.getMockImplementation()!;setSent(2);let deleted=true;
  p.confirmRecreation=vi.fn(async()=>true);
  invoke.mockImplementation(async(n,b)=>{
   if(b.action==='verify'&&deleted)return {status:'VERIFY',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:[{opIndex:0,result:'absent'}]};
   if(b.action==='repair_check')return {status:'RECREATION_CHECK',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},fromIndex:0,nextIndex:2,total:2,rows:dry.manifest.map((e,i)=>({...e,status:i?'present':'deleted',reason:i?'exact_unique':'known_resource_404_and_complete_day_absence',...(i?{}:{binding:'d'.repeat(64)})}))};
   if(b.action==='repair'){deleted=false;return {status:'DONE',opIndex:0,preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:[{sessionKey:dry.manifest[0].sessionKey,state:'confirmed'}]};}
   return original(n,b);
  });
  expect(await runCoachExport(p)).toEqual({verified:2,total:2});expect(p.confirmRecreation).toHaveBeenCalledOnce();expect(invoke.mock.calls.filter(([,b])=>b.action==='repair')).toHaveLength(1);expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);
 });
 it('cancelling the contextual recreation decision creates nothing',async()=>{
  const {p,invoke,dry,setSent}=fixture(1),original=invoke.getMockImplementation()!;setSent(1);p.confirmRecreation=vi.fn(async()=>false);
  invoke.mockImplementation(async(n,b)=>b.action==='verify'?{status:'VERIFY',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:[{opIndex:0,result:'absent'}]}:b.action==='repair_check'?{status:'RECREATION_CHECK',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},fromIndex:0,nextIndex:1,total:1,rows:[{...dry.manifest[0],status:'deleted',reason:'known_resource_404_and_complete_day_absence',binding:'d'.repeat(64)}]}:original(n,b));
  await expect(runCoachExport(p)).rejects.toThrow('Export annulé');expect(p.confirmRecreation).toHaveBeenCalledOnce();expect(invoke.mock.calls.some(([,b])=>['repair','send'].includes(String(b.action)))).toBe(false);
 });
 it('inspects missing activities without simulation, consent, reservation or creation',async()=>{
  const {p,invoke,dry}=fixture(2),original=invoke.getMockImplementation()!;
  invoke.mockImplementation(async(n,b)=>b.action==='repair_check'?{status:'RECREATION_CHECK',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},fromIndex:0,nextIndex:2,total:2,rows:dry.manifest.map((e,i)=>({...e,status:i?'present':'deleted',reason:i?'exact_unique':'known_resource_404_and_complete_day_absence',...(i?{}:{binding:'d'.repeat(64)})}))}:original(n,b));
  const result=await runCoachExport(p,false,false,{kind:'inspect'});expect(result.recreationDecision?.rows).toHaveLength(1);expect(invoke.mock.calls.map(([,b])=>b.action)).toEqual(['precheck','repair_check']);expect(invoke.mock.calls.some(([,b])=>b.consent===true)).toBe(false);expect(p.confirmSimulation).not.toHaveBeenCalled();expect(p.verifyReceipts).not.toHaveBeenCalled();
 });
 it.each(['recreation_resource_moved_or_changed','recreation_read_unknown','recreation_uncertain_operation'])('refuses a %s before offering recreation',async reason=>{
  const {p,invoke,dry}=fixture(1),original=invoke.getMockImplementation()!;invoke.mockImplementation(async(n,b)=>b.action==='repair_check'?{status:'RECREATION_CHECK',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},fromIndex:0,nextIndex:1,total:1,rows:[{...dry.manifest[0],status:'blocked',reason}]}:original(n,b));
  await expect(runCoachExport(p,false,false,{kind:'inspect'})).rejects.toThrow('Aucune recréation');expect(invoke.mock.calls.some(([,b])=>['repair','run','send'].includes(String(b.action)))).toBe(false);
 });
 it('recreates only the explicitly selected deleted activity then verifies prior sends before continuing',async()=>{
  const {p,invoke,setSent,dry}=fixture(10),original=invoke.getMockImplementation()!;setSent(8);
  const decision={planSha256:hash,refsSha256:refs,opsSha256:ops,rows:[{...dry.manifest[0],title:'Deleted',binding:'d'.repeat(64)}]};
  invoke.mockImplementation(async(n,b)=>b.action==='repair'?{status:'DONE',opIndex:0,preview:{planSha256:hash,refsSha256:refs,opsSha256:ops},results:[{sessionKey:decision.rows[0].sessionKey,state:'confirmed'}]}:original(n,b));
  expect(await runCoachExport(p,false,false,{kind:'apply',decision})).toEqual({verified:10,total:10});
  const repair=invoke.mock.calls.filter(([,b])=>b.action==='repair');expect(repair).toHaveLength(1);expect(repair[0][1]).toMatchObject({consent:true,repair:{opIndex:0,binding:'d'.repeat(64)},expected:{jobId:job}});
  const actions=invoke.mock.calls.map(([,b])=>b.action);expect(actions.indexOf('repair')).toBeLessThan(actions.indexOf('verify'));expect(actions.indexOf('verify')).toBeLessThan(actions.indexOf('send'));
 });
 it('never applies a stale decision or retries an uncertain recreation',async()=>{
  const {p,invoke,dry}=fixture(1),original=invoke.getMockImplementation()!;
  const decision={planSha256:hash,refsSha256:'e'.repeat(64),opsSha256:ops,rows:[{...dry.manifest[0],title:'Deleted',binding:'d'.repeat(64)}]};
  await expect(runCoachExport(p,false,false,{kind:'apply',decision})).rejects.toThrow('périmée');expect(invoke.mock.calls.some(([,b])=>b.action==='repair')).toBe(false);
  decision.refsSha256=refs;invoke.mockClear();invoke.mockImplementation(async(n,b)=>b.action==='repair'?{status:'STOPPED_UNCONFIRMED',reason:'response_lost',preview:{planSha256:hash,refsSha256:refs,opsSha256:ops}}:original(n,b));
  await expect(runCoachExport(p,false,false,{kind:'apply',decision})).rejects.toThrow('aucune relance automatique');expect(invoke.mock.calls.filter(([,b])=>b.action==='repair')).toHaveLength(1);expect(invoke.mock.calls.some(([,b])=>b.action==='send')).toBe(false);
 });
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
