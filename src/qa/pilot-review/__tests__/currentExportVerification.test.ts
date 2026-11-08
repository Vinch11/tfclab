import {describe,it,expect} from 'vitest';
import {currentExportVerification} from '@/lib/nolio/exportVerification';
import type {PlanDryResp} from '@/qa/pilot-review/planDryRunView';
const op={opIndex:0,sessionKey:'S1-J1-0',date:'2026-11-10',kind:'training' as const,path:'/api/v2/planned/trainings/',bodySha256:'d'.repeat(64)};
const resp={planSha256:'a'.repeat(64),refsSha256:'b'.repeat(64),opsSha256:'c'.repeat(64),manifest:[op]} as PlanDryResp;
const row={id:'11111111-1111-4111-8111-111111111111',coach_id:'coach',plan_version_id:'version',plan_sha256:resp.planSha256,refs_sha256:resp.refsSha256,ops_sha256:resp.opsSha256,op_index:0,session_key:op.sessionKey,session_date:op.date,body_sha256:op.bodySha256,kind:op.kind,path:op.path,outcome:'VERIFIED_UNIQUE',code:'exact_unique',complete_read:true,exact_matches:1,marker_matches:1,provider_resource:'ptrn_SYNTH1',created_at:'2026-11-06T21:00:00Z'};
const binding={opIndex:0,sessionKey:op.sessionKey,path:op.path,bodySha256:op.bodySha256,state:'confirmed',remoteId:row.provider_resource};
const check=(receipts:unknown[],ledgerBindings:unknown=[binding])=>currentExportVerification({coachId:'coach',planVersionId:'version',resp,receipts,ledgerBindings});
describe('current-selection provider receipt readback',()=>{
 it('does not reuse a successful receipt for the deleted resource after the ledger acknowledges its replacement',()=>{
  const replacement={...binding,remoteId:'ptrn_REPLACEMENT'};
  expect(check([row],[replacement])).toMatchObject({verified:0,fullyVerified:false,nextIndex:0});
  const fresh={...row,id:'22222222-2222-4222-8222-222222222222',provider_resource:replacement.remoteId,created_at:'2026-11-08T12:00:00Z'};
  expect(check([row,fresh],[replacement])).toMatchObject({verified:1,fullyVerified:true});
 });
 it.each([null,[],[binding,binding],[{...binding,opIndex:1}],[{...binding,path:'/other'}],[{...binding,sessionKey:'S2-J1-0'}],[{...binding,bodySha256:'old'}],[{...binding,state:'sending'}],[{...binding,remoteId:null}]])('fails closed for missing, incomplete, ambiguous or noncurrent ledger bindings %j',bindings=>{
  expect(check([row],bindings).fullyVerified).toBe(false);
 });
 it('requires ledger context rather than treating an absent response field as legacy success',()=>{
  expect(currentExportVerification({coachId:'coach',planVersionId:'version',resp,receipts:[row],ledgerBindings:undefined}).fullyVerified).toBe(false);
 });
 it('does not jump over 83 stale resource receipts in a 101-activity plan',()=>{
  const manifest=Array.from({length:101},(_,i)=>({...op,opIndex:i,sessionKey:`S${i+1}-J1-0`,bodySha256:(i+1).toString(16).padStart(64,'0')}));
  const response={...resp,manifest};
  const ledgerBindings=manifest.map(o=>({...binding,opIndex:o.opIndex,sessionKey:o.sessionKey,bodySha256:o.bodySha256,remoteId:`ptrn_NEW${o.opIndex}`}));
  const old=manifest.map(o=>({...row,id:`11111111-1111-4111-8111-${String(o.opIndex).padStart(12,'0')}`,op_index:o.opIndex,session_key:o.sessionKey,body_sha256:o.bodySha256,provider_resource:o.opIndex<83?`ptrn_OLD${o.opIndex}`:`ptrn_NEW${o.opIndex}`}));
  const inspect=(receipts:unknown[])=>currentExportVerification({coachId:'coach',planVersionId:'version',resp:response,receipts,ledgerBindings});
  expect(inspect(old)).toMatchObject({verified:18,total:101,fullyVerified:false,nextIndex:0});
  const first=old.slice(0,8).map((r,i)=>({...r,id:`22222222-2222-4222-8222-${String(i).padStart(12,'0')}`,provider_resource:`ptrn_NEW${i}`,created_at:'2026-11-08T12:00:00Z'}));
  expect(inspect([...old,...first])).toMatchObject({verified:26,nextIndex:8,fullyVerified:false});
  const fresh=old.map((r,i)=>({...r,id:`33333333-3333-4333-8333-${String(i).padStart(12,'0')}`,provider_resource:`ptrn_NEW${i}`,created_at:'2026-11-08T12:00:00Z'}));
  expect(inspect([...old,...fresh])).toMatchObject({verified:101,total:101,fullyVerified:true});
 });
 it('only confirms the exact owner/version/body/context receipt',()=>{expect(check([row])).toMatchObject({verified:1,total:1,fullyVerified:true});expect(check([]).fullyVerified).toBe(false);});
 it.each([{coach_id:'other'},{plan_version_id:'other'},{refs_sha256:'old'},{ops_sha256:'old'},{body_sha256:'other'},{session_key:'S1-J2-0'},{session_date:'2026-11-11'},{exact_matches:2},{marker_matches:2},{complete_read:false},{outcome:'UNKNOWN'},{provider_resource:'not_provider_id'}])('does not accept another context or an ambiguous/unknown result %j',change=>{expect(check([{...row,...change}]).fullyVerified).toBe(false);});
 it('lets the latest negative receipt override an older exact read',()=>{expect(check([row,{...row,id:'new',created_at:'2026-11-06T22:00:00Z',outcome:'ABSENT',code:'absent',exact_matches:0}]).fullyVerified).toBe(false);});
});
