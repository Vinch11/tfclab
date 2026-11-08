import {describe,it,expect,vi} from 'vitest';
import {validationIssues,formatValidationIssues} from '../../../../supabase/functions/_shared/nolioV2/dryRunValidation';
import {inspectDryRunRefusal} from '../../../../supabase/functions/_shared/nolioV2/inspectDryRunRefusal';
import {postDryRun} from '../../../../supabase/functions/_shared/nolioV2/dryRun';
import type {Prepared,JobRow,OpReceipt} from '../../../../supabase/functions/_shared/nolioV2/planDryRun';
const hash='a'.repeat(64);
function fixture(){
 const prepared={precheck:{complete:true},planSha256:hash,refsSha256:hash,opsSha256:hash,ops:[{opIndex:0,sessionKey:'S1-J1-1',date:'2026-11-10',kind:'training',bodySha256:hash,body:{dry_run:false,name:'SYNTHETIC'}}]} as unknown as Prepared;
 const job:JobRow={id:'SYNTHETIC_JOB',plan_sha256:hash,refs_sha256:hash,ops_sha256:hash,total_ops:1};
 const receipts:OpReceipt[]=[{op_index:0,body_sha256:hash,outcome:'REFUSED',code:'validation_rejected_400'}];
 return {prepared,job,receipts,lease:vi.fn(async()=>true),release:vi.fn(async()=>{}),post:vi.fn(async()=>({code:'validation_rejected_400',httpStatus:400,validationIssues:[{field:'workout.0.targets.0.value_max',reason:'pace_format' as const}]}))};
}
describe('known HTTP400 simulation diagnostics, never a send or proof',()=>{
 it('extracts only known field paths and fixed reasons, without provider values/messages',()=>{
  const issues=validationIssues(JSON.stringify({error:{code:'validation_error',message:'PRIVATE',athlete_name:'PRIVATE',fields:{'workout[1].steps[0].targets[0].value_max':['Invalid pace format for PRIVATE'],private_name:['PRIVATE'],sport:['Invalid unit PRIVATE']}}}));
  expect(issues).toEqual([{field:'workout.1.steps.0.targets.0.value_max',reason:'pace_format'},{field:'sport',reason:'unit'}]);
  expect(JSON.stringify(issues)).not.toContain('PRIVATE');
  expect(formatValidationIssues([...issues,{field:'SECRET',reason:'invalid'},{field:'sport',reason:'SECRET'}])).not.toContain('SECRET');
  for(const text of ['bad','null','{}',JSON.stringify({error:{code:'other',fields:{sport:['PRIVATE']}}})])expect(validationIssues(text)).toEqual([]);
 });
 it('forces dry_run and provides a bound diagnostic without touching receipts',async()=>{
  const a=fixture(),before=JSON.stringify(a.receipts);
  expect(await inspectDryRunRefusal(a)).toMatchObject({status:'REFUSAL_DIAGNOSTIC',refusal:{opIndex:0,sessionKey:'S1-J1-1',httpStatus:400}});
  expect(a.post).toHaveBeenCalledExactlyOnceWith('training',{dry_run:true,name:'SYNTHETIC'},4000);
  expect(a.release).toHaveBeenCalledTimes(1);expect(JSON.stringify(a.receipts)).toBe(before);
 });
 it.each(['UNKNOWN','DRY_RUN_VALID','AUTH','RATE','CHANGED_BODY','MIXED'])('does not retry %s evidence',async kind=>{
  const a=fixture();
  if(kind==='UNKNOWN')a.receipts[0].outcome='UNKNOWN';
  if(kind==='DRY_RUN_VALID')a.receipts[0].outcome='DRY_RUN_VALID';
  if(kind==='AUTH')a.receipts[0].code='auth_rejected_401';
  if(kind==='RATE')a.receipts[0].code='rate_limited_429';
  if(kind==='CHANGED_BODY')a.receipts[0].body_sha256='b'.repeat(64);
  if(kind==='MIXED')a.receipts.push({...a.receipts[0],outcome:'UNKNOWN'});
  expect(await inspectDryRunRefusal(a)).toMatchObject({status:'BLOCKED'});expect(a.post).not.toHaveBeenCalled();
 });
 it('refuses stale plan/refs/manifest, incomplete precheck and a held lease',async()=>{
  for(const key of ['plan_sha256','refs_sha256','ops_sha256'] as const){const a=fixture();a.job[key]='b'.repeat(64);expect(await inspectDryRunRefusal(a)).toMatchObject({status:'BLOCKED'});expect(a.post).not.toHaveBeenCalled();}
  const a=fixture();a.lease.mockResolvedValue(false);expect(await inspectDryRunRefusal(a)).toMatchObject({code:'batch_in_progress'});expect(a.post).not.toHaveBeenCalled();
 });
 it('cannot promote a diagnostic success into a validation receipt',async()=>{
  const a=fixture();a.post.mockResolvedValue({code:'dry_run_valid',httpStatus:201,validationIssues:[]});
  expect(await inspectDryRunRefusal(a)).toMatchObject({status:'REFUSAL_DIAGNOSTIC',code:'diagnostic_only',refusal:{issues:[]}});
  expect(a.receipts[0].outcome).toBe('REFUSED');
 });
 it('uses the fixed-URL dry-run transport and sanitizes actual HTTP400 responses',async()=>{
  const fetch=vi.fn(async(_url:string)=>({status:400,text:async()=>JSON.stringify({error:{code:'validation_error',message:'PRIVATE',fields:{'workout.0.targets.0.value':['Invalid pace PRIVATE']}}})}));
  const r=await postDryRun({fetch,accessToken:'SYNTHETIC_TOKEN',body:{dry_run:true}});
  expect(r.validationIssues).toEqual([{field:'workout.0.targets.0.value',reason:'pace_format'}]);
  // Standard technical errors are now visible only in this owning caller's
  // ephemeral response; arbitrary sibling data are still absent.
  expect(r.providerError?.message).toBe('PRIVATE');expect(fetch.mock.calls[0]?.[0]).toBe('https://www.nolio.io/api/v2/planned/trainings/');
 });
});
