import {describe,it,expect} from 'vitest';
import {currentExportVerification} from '@/lib/nolio/exportVerification';
import type {PlanDryResp} from '@/qa/pilot-review/planDryRunView';
const op={opIndex:0,sessionKey:'S1-J1-0',date:'2026-11-10',kind:'training' as const,path:'/api/v2/planned/trainings/',bodySha256:'d'.repeat(64)};
const resp={planSha256:'a'.repeat(64),refsSha256:'b'.repeat(64),opsSha256:'c'.repeat(64),manifest:[op]} as PlanDryResp;
const row={id:'11111111-1111-4111-8111-111111111111',coach_id:'coach',plan_version_id:'version',plan_sha256:resp.planSha256,refs_sha256:resp.refsSha256,ops_sha256:resp.opsSha256,op_index:0,session_key:op.sessionKey,session_date:op.date,body_sha256:op.bodySha256,kind:op.kind,path:op.path,outcome:'VERIFIED_UNIQUE',code:'exact_unique',complete_read:true,exact_matches:1,marker_matches:1,provider_resource:'ptrn_SYNTH1',created_at:'2026-11-06T21:00:00Z'};
const check=(receipts:unknown[])=>currentExportVerification({coachId:'coach',planVersionId:'version',resp,receipts});
describe('current-selection provider receipt readback',()=>{
 it('only confirms the exact owner/version/body/context receipt',()=>{expect(check([row])).toMatchObject({verified:1,total:1,fullyVerified:true});expect(check([]).fullyVerified).toBe(false);});
 it.each([{coach_id:'other'},{plan_version_id:'other'},{refs_sha256:'old'},{ops_sha256:'old'},{body_sha256:'other'},{session_key:'S1-J2-0'},{session_date:'2026-11-11'},{exact_matches:2},{marker_matches:2},{complete_read:false},{outcome:'UNKNOWN'},{provider_resource:'not_provider_id'}])('does not accept another context or an ambiguous/unknown result %j',change=>{expect(check([{...row,...change}]).fullyVerified).toBe(false);});
 it('lets the latest negative receipt override an older exact read',()=>{expect(check([row,{...row,id:'new',created_at:'2026-11-06T22:00:00Z',outcome:'ABSENT',code:'absent',exact_matches:0}]).fullyVerified).toBe(false);});
});
