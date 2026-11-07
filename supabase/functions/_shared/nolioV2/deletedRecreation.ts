import {reconcileExact,exactRemoteMatch,type NolioV2Http,type LedgerEntry,type NolioV2Ledger} from './plannedClient.ts';
import {operationKey,originMarker} from './marker.ts';
import type {FrozenOp,Prepared} from './planDryRun.ts';
import {sha256Hex,canonical} from './dryRun.ts';
import type {RpcClient} from './ledgerSupabase.ts';
export type RecreationCheck={status:'present'|'deleted'|'blocked';reason:string;binding?:string};
/** A calendar search miss alone NEVER grants recreation. The acknowledged
 * resource must also return 404 for the very same provider athlete. */
export async function inspectDeletedOperation(a:{http:NolioV2Http;entry:LedgerEntry;op:FrozenOp;prepared:Prepared;planVersionId:string;athleteRef:string;deadline:number;now?:()=>number}):Promise<RecreationCheck>{
 const no=(reason:string):RecreationCheck=>({status:'blocked',reason}),now=a.now??Date.now;
 const e=a.entry,o=a.op,key=await operationKey(a.planVersionId,o.source);
 if(e.apiVersion!=='v2'||e.opKey!==key.opKey||e.planVersionId!==a.planVersionId||e.payloadSha256!==o.bodySha256||e.athleteRef!==a.athleteRef||e.path!==o.path||e.sessionKey!==o.sessionKey)return no('recreation_ledger_divergent');
 if(e.state!=='confirmed'||!e.remoteId)return no('recreation_uncertain_operation');
 if(!(o.kind==='training'?/^ptrn_[A-Za-z0-9]+$/:/^pcmp_[A-Za-z0-9]+$/).test(e.remoteId))return no('recreation_ledger_divergent');
 try{
  if(now()>=a.deadline)return no('recreation_read_unknown');
  const direct=await a.http.getDetail(o.path,e.remoteId,a.athleteRef);
  if(now()>=a.deadline)return no('recreation_read_unknown');
  if(direct.ok){
   if(direct.item.id!==e.remoteId||!exactRemoteMatch(direct.item,o.body))return no('recreation_resource_moved_or_changed');
   const match=await reconcileExact(a.http,o.source,a.athleteRef,o.body,await originMarker(a.planVersionId,o.source),{deadline:a.deadline,now});
   return match.kind==='exact'&&match.id===e.remoteId?{status:'present',reason:'exact_unique'}:no('recreation_read_unknown');
  }
  if(!('detail' in direct)||direct.detail!=='http_404')return no('recreation_read_unknown');
  const match=await reconcileExact(a.http,o.source,a.athleteRef,o.body,await originMarker(a.planVersionId,o.source),{deadline:a.deadline,now});
  if(now()>=a.deadline||match.kind!=='absent')return no('recreation_read_unknown');
  const binding=await sha256Hex(canonical({kind:'deleted-recreation-v1',opKey:e.opKey,oldResource:e.remoteId,plan:a.prepared.planSha256,refs:a.prepared.refsSha256,ops:a.prepared.opsSha256,body:o.bodySha256}));
  return {status:'deleted',reason:'known_resource_404_and_complete_day_absence',binding};
 }catch{return no('recreation_read_unknown');}
}
/** One service-only audited CAS from an ACKNOWLEDGED, now deleted resource.
 * Unknown/lost sends keep the ordinary no-retry ledger path. */
export function recreationLedger(a:{client:RpcClient;ledger:NolioV2Ledger;entry:LedgerEntry;coachId:string;requestId:string;prepared:Prepared;binding:string}):NolioV2Ledger{
 return {transition:a.ledger.transition,claim:async e=>{
  const old=a.entry;
  if(e.opKey!==old.opKey||e.planVersionId!==old.planVersionId||e.athleteRef!==old.athleteRef||e.payloadSha256!==old.payloadSha256||e.path!==old.path||e.sessionKey!==old.sessionKey||!old.remoteId)throw Error('recreation_ledger_divergent');
  const r=await a.client.rpc('nolio_v2_recreate_deleted_operation',{p_coach_id:a.coachId,p_plan_version_id:old.planVersionId,p_op_key:old.opKey,p_athlete_ref:old.athleteRef,p_old_remote_id:old.remoteId,p_payload_sha256:old.payloadSha256,p_request_id:a.requestId,p_plan_sha256:a.prepared.planSha256,p_refs_sha256:a.prepared.refsSha256,p_ops_sha256:a.prepared.opsSha256,p_binding:a.binding,p_consent:true});
  if(r.error||r.data!==true)throw Error('recreation_claim_stale');
  return {claimed:true};
 }};
}
