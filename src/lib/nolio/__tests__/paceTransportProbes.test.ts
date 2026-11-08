import {describe,it,expect,vi} from 'vitest';
import {paceTransportProbes} from '../../../../supabase/functions/_shared/nolioV2/paceTransportProbes';
import {providerValidationError,formatPaceProbeReport} from '../../../../supabase/functions/_shared/nolioV2/dryRunValidation';
import {inspectDryRunRefusal} from '../../../../supabase/functions/_shared/nolioV2/inspectDryRunRefusal';
import type {Prepared,JobRow,OpReceipt} from '../../../../supabase/functions/_shared/nolioV2/planDryRun';
const hash='a'.repeat(64);
const body=()=>({name:'SYNTHETIC',athletes:['usr_SYNTH'],sport:'spt_RUN',duration:{value:960,unit:'s'},workout:[{kind:'step',duration:{value:600,unit:'s'},targets:[{type:'raw',unit:'/km',value:'5:20',value_max:'8:00'}]},{kind:'repeat',times:1,steps:[{kind:'step',duration:{value:360,unit:'s'},targets:[{type:'raw',unit:'/km',value:'3:53',value_max:'4:07.4'}]}]}]});
describe('bounded comparative pace transport diagnostics',()=>{
 it('compares the real nested format, exact numeric bounds and ordering without changing the source',()=>{
  const input=body(),before=JSON.stringify(input),p=paceTransportProbes(input);
  expect(p.map(x=>x.test)).toEqual(['original','exact_numeric_mps','pace_speed_order','single_integer_pace','single_fractional_pace']);
  expect(JSON.stringify(input)).toBe(before);
  expect(p[0].body).toEqual(input);
  const numeric=JSON.stringify(p[1].body);expect(numeric).toContain(String(1000/247.4));expect(numeric).toContain(String(1000/233));expect(numeric).not.toContain('value_max":"4:07.4');
  expect(JSON.stringify(p[2].body)).toContain('"value":"4:07.4","value_max":"3:53"');
  for(const test of p.slice(3)){expect(test.body.name).toContain('simulation');expect((test.body.workout as unknown[])).toHaveLength(1);expect(test.body.athletes).toEqual(input.athletes);}
 });
 it('keeps the actual business-rule error when fields are absent, with credential/identity/URL redaction',()=>{
  const e=providerValidationError(JSON.stringify({error:{code:'invalid_pace',message:'Pace must be m:ss. Bearer SECRET usr_ABC person@example.com https://example.com/?token=SECRET2',athlete_name:'PRIVATE',fields:{'workout.1.targets.0.value_max':['Invalid m:ss format']}}}));
  expect(e?.code).toBe('invalid_pace');expect(e?.message).toContain('Pace must be m:ss');
  for(const secret of ['SECRET','usr_ABC','person@example.com','https://','PRIVATE'])expect(JSON.stringify(e)).not.toContain(secret);
  const report=formatPaceProbeReport([{test:'original',httpStatus:400,code:'validation_rejected_400',providerError:e}]);
  expect(report).toContain('invalid_pace');expect(report).toContain('workout.1.targets.0.value_max');
 });
 it.each(['network_error','auth_rejected_401','forbidden_403','rate_limited_429','success_shape_invalid'])('stops the comparative run on %s without any receipt mutation',async code=>{
  const source=body(),rows:OpReceipt[]=[{op_index:0,body_sha256:hash,outcome:'REFUSED',code:'validation_rejected_400'}];
  const post=vi.fn(async()=>({code,httpStatus:code==='network_error'?null:code==='rate_limited_429'?429:code==='auth_rejected_401'?401:code==='forbidden_403'?403:200}));
  const prepared={precheck:{complete:true},planSha256:hash,refsSha256:hash,opsSha256:hash,ops:[{opIndex:0,sessionKey:'S1-J1-1',date:'2026-11-10',kind:'training',bodySha256:hash,body:source}]} as unknown as Prepared;
  const job:JobRow={id:'SYNTHETIC',plan_sha256:hash,refs_sha256:hash,ops_sha256:hash,total_ops:1};
  await inspectDryRunRefusal({prepared,job,receipts:rows,lease:async()=>true,release:async()=>{},post,sleep:async()=>{}});
  expect(post).toHaveBeenCalledTimes(1);expect(rows[0].outcome).toBe('REFUSED');
 });
 it('executes at most five forced simulations, keeping any successes diagnostic-only',async()=>{
  const source=body(),before=JSON.stringify(source),rows:OpReceipt[]=[{op_index:0,body_sha256:hash,outcome:'REFUSED',code:'validation_rejected_400'}];
  let calls=0;const post=vi.fn(async(_kind:unknown,sent:Record<string,unknown>,ms:number)=>{expect(sent.dry_run).toBe(true);expect(ms).toBe(4000);return ++calls===2?{code:'dry_run_valid',httpStatus:201}:{code:'validation_rejected_400',httpStatus:400};});
  const prepared={precheck:{complete:true},planSha256:hash,refsSha256:hash,opsSha256:hash,ops:[{opIndex:0,sessionKey:'S1-J1-1',date:'2026-11-10',kind:'training',bodySha256:hash,body:source}]} as unknown as Prepared;
  const job:JobRow={id:'SYNTHETIC',plan_sha256:hash,refs_sha256:hash,ops_sha256:hash,total_ops:1};
  const result=await inspectDryRunRefusal({prepared,job,receipts:rows,lease:async()=>true,release:async()=>{},post,sleep:async()=>{}});
  expect(result.status).toBe('REFUSAL_DIAGNOSTIC');expect(result.refusal?.probes).toHaveLength(5);expect(rows[0].outcome).toBe('REFUSED');expect(JSON.stringify(source)).toBe(before);
 });
});
