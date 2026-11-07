import { reconcileExact, originMarker, operationKey, type NolioV2Http, type NolioV2Ledger } from './plannedClient.ts';
import type { Prepared, FrozenOp } from './planDryRun.ts';
export type ReceiptStore={insert(row:Record<string,unknown>):Promise<Record<string,unknown>|null>};
/** Persist then exact read-back; failed persistence never yields a verified result. */
export async function verifyAndPersist(i:{coachId:string;athleteId:string;planVersionId:string;prepared:Prepared;op:FrozenOp;http:NolioV2Http;ledger:NolioV2Ledger;ledgerState:string;store:ReceiptStore;deadline:number;now?:()=>number}) {
 const now=i.now??Date.now; const o=i.op;
 const r=now()>=i.deadline?{kind:'read_failed' as const,detail:'deadline'}:await reconcileExact(i.http,o.source,String(o.body.athletes && (o.body.athletes as string[])[0]),o.body,await originMarker(i.planVersionId,o.source),{deadline:i.deadline,now});
 const exact=r.kind==='exact' && now()<i.deadline && (o.kind==='training'?/^ptrn_[A-Za-z0-9]+$/:/^pcmp_[A-Za-z0-9]+$/).test(r.id);
 const key=await operationKey(i.planVersionId,o.source);
 const row:Record<string,unknown>={coach_id:i.coachId,athlete_id:i.athleteId,plan_version_id:i.planVersionId,plan_sha256:i.prepared.planSha256,refs_sha256:i.prepared.refsSha256,ops_sha256:i.prepared.opsSha256,body_sha256:o.bodySha256,op_key:key.opKey,op_index:o.opIndex,session_key:o.sessionKey,session_date:o.date,kind:o.kind,path:o.path,outcome:exact?'VERIFIED_UNIQUE':r.kind==='absent'?'ABSENT':r.kind==='ambiguous'?'AMBIGUOUS':'UNKNOWN',code:exact?'exact_unique':r.kind==='absent'?'absent':r.kind==='ambiguous'?'ambiguous':now()>=i.deadline?'deadline':'read_failed',provider_resource:exact&&r.kind==='exact'?r.id:null,exact_matches:exact?1:0,marker_matches:exact?1:0,complete_read:exact};
 let saved:Record<string,unknown>|null=null;
 try {saved=await i.store.insert(row);}catch{return {result:'persistence_unknown',receiptId:null};}
 if(!saved || Object.entries(row).some(([k,v])=>saved?.[k]!==v))return {result:'receipt_readback_divergent',receiptId:null};
 if(exact && r.kind==='exact' && (i.ledgerState==='sending'||i.ledgerState==='sent_unconfirmed')) {
  const ok=await i.ledger.transition(key.opKey,i.ledgerState,'confirmed',{remoteId:r.id,detail:'exact_unique_durable_receipt'}).catch(()=>false);
  if(!ok)return {result:'ledger_reconciliation_unknown',receiptId:saved.id};
 }
 // Only transient GET failures may be read again automatically. An unknown
 // receipt never permits another create, nor counts as a successful read.
 const retryableRead=row.outcome==='UNKNOWN'&&(now()>=i.deadline||r.kind==='read_failed'&&/^(?:detail:)?(?:deadline|timeout|network_error|body_unreadable|http_50[0234])$/.test(r.detail));
 const failure=r.kind==='read_failed'?r.detail.replace(/^detail:/,''):null;
 const readFailure=row.outcome!=='UNKNOWN'?null:now()>=i.deadline||failure==='deadline'?'deadline':failure==='http_429'?'rate_limited':failure==='http_401'||failure==='http_403'?'authorization':failure==='timeout'||failure==='network_error'||failure==='body_unreadable'?'network_unavailable':failure&&/^http_5\d\d$/.test(failure)?'provider_error':'unclassified';
 return {result:exact?'verified_unique':String(row.outcome).toLowerCase(),receiptId:saved.id,...(readFailure?{readFailure}:{}),...(retryableRead?{retryableRead:true}:{}),...(r.kind==='ambiguous'&&r.diagnostic?{diagnostic:r.diagnostic}:{})};
}
