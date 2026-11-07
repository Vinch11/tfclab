import type {PlanDryResp} from '@/qa/pilot-review/planDryRunView';
/** Current-scope readback, never inferred from a POST acknowledgement or an
 * old receipt with another refs/operations digest. Latest negative wins. */
export function currentExportVerification(a:{coachId:string;planVersionId:string;resp:PlanDryResp;receipts:unknown[]}){
 const m=a.resp.manifest??[],latest=new Map<number,Record<string,unknown>>();
 const rows=a.receipts.filter((r):r is Record<string,unknown>=>!!r&&typeof r==='object').filter(r=>r.coach_id===a.coachId&&r.plan_version_id===a.planVersionId&&r.plan_sha256===a.resp.planSha256&&r.refs_sha256===a.resp.refsSha256&&r.ops_sha256===a.resp.opsSha256).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
 for(const r of rows)if(Number.isSafeInteger(r.op_index)&&!latest.has(Number(r.op_index)))latest.set(Number(r.op_index),r);
 const valid=m.filter(o=>{const r=latest.get(o.opIndex);return r&&typeof r.id==='string'&&/^[0-9a-f-]{36}$/i.test(r.id)&&r.session_key===o.sessionKey&&r.session_date===o.date&&r.body_sha256===o.bodySha256&&r.kind===o.kind&&r.path===o.path&&r.outcome==='VERIFIED_UNIQUE'&&r.code==='exact_unique'&&r.complete_read===true&&r.exact_matches===1&&r.marker_matches===1&&typeof r.provider_resource==='string'&&(o.kind==='training'?/^ptrn_[A-Za-z0-9]+$/:/^pcmp_[A-Za-z0-9]+$/).test(r.provider_resource);});
 const keys=new Set(valid.map(o=>o.opIndex));
 return {verified:valid.length,total:m.length,fullyVerified:m.length>0&&valid.length===m.length,nextIndex:m.find(o=>!keys.has(o.opIndex))?.opIndex??0};
}
