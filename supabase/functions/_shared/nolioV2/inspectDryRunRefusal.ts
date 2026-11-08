import {forceDryRun,type DryRunKind} from './dryRun.ts';
import type {Prepared,JobRow,OpReceipt} from './planDryRun.ts';
import type {ValidationIssue,ProviderValidationError} from './dryRunValidation.ts';
import {paceTransportProbes} from './paceTransportProbes.ts';
/** Bounded comparative DRY-RUN of an already known HTTP400 refusal. Diagnostic
 * only: no successful receipt, ledger transition or send authority is produced.
 * Unknown/auth/quota outcomes are never retried. Caller owns the frozen job. */
export async function inspectDryRunRefusal(a:{prepared:Prepared;job:JobRow|null;receipts:OpReceipt[];
 lease:()=>Promise<boolean>;release:()=>Promise<void>;
 post:(kind:DryRunKind,body:Record<string,unknown>,ms:number)=>Promise<{code:string;httpStatus:number|null;validationIssues?:ValidationIssue[];providerError?:ProviderValidationError|null;quotaRemainingHour?:number|null}>;
 sleep?:(ms:number)=>Promise<void>}){
 const p=a.prepared,j=a.job;
 if(!p.precheck.complete||!j||j.plan_sha256!==p.planSha256||j.refs_sha256!==p.refsSha256||j.ops_sha256!==p.opsSha256||j.total_ops!==p.ops.length)return {status:'BLOCKED',code:'refusal_context_stale'};
 const op=p.ops.find(o=>{
   const rows=a.receipts.filter(r=>r.op_index===o.opIndex&&r.body_sha256===o.bodySha256);
   return rows.length>0&&rows.every(r=>r.outcome==='REFUSED'&&r.code==='validation_rejected_400');
 });
 if(!op)return {status:'BLOCKED',code:'no_known_validation_refusal'};
 if(!await a.lease())return {status:'BLOCKED',code:'batch_in_progress'};
 try{
   const variants=op.kind==='training'?paceTransportProbes(op.body):[{test:'original',body:op.body}];
   const probes:Array<{test:string;httpStatus:number|null;code:string;providerError:ProviderValidationError|null}>=[];
   let first:Awaited<ReturnType<typeof a.post>>|null=null;
   for(const variant of variants){
    if(probes.length)await (a.sleep??(ms=>new Promise(resolve=>setTimeout(resolve,ms))))(300);
    const r=await a.post(op.kind,forceDryRun(variant.body),4000);first??=r;
    probes.push({test:variant.test,httpStatus:r.httpStatus,code:r.code,providerError:r.httpStatus===400?r.providerError??null:null});
    if((r.code!=='dry_run_valid'&&!(r.httpStatus===400&&r.code==='validation_rejected_400'))||(typeof r.quotaRemainingHour==='number'&&r.quotaRemainingHour<50)||(probes.length===1&&r.code==='dry_run_valid'))break;
   }
   return {status:'REFUSAL_DIAGNOSTIC',code:'diagnostic_only',refusal:{opIndex:op.opIndex,sessionKey:op.sessionKey,date:op.date,httpStatus:first?.httpStatus??null,code:first?.code??'diagnostic_unavailable',issues:first?.httpStatus===400?first.validationIssues??[]:[],probes}};
 }finally{await a.release().catch(()=>undefined);}
}
