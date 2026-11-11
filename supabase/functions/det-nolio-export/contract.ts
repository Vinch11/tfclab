import {canonicalJson,type NolioV2Refs} from '../_shared/nolioV2/plannedMapper.ts';
import {preparePlan} from '../_shared/nolioV2/planDryRun.ts';
import {operationKey} from '../_shared/nolioV2/marker.ts';
import type {PreparedExport} from '../_shared/nolioV2/exportPlan.ts';

type ReviewedPlan = {
  _detNolioAthleteRef?:string;
  _provenance:{engine:string;mode:string;syntheticFixture:boolean;engineVersion:string;generatedAt?:string};
  _detSourceProposal:{athleteId:string;planningInputFingerprint:string;objective:string;checks:{status:string}[]};
  weeks:{sessions:unknown[]}[];
};
export function isDetArchive(value:unknown): value is ReviewedPlan {
  const p=value as ReviewedPlan|null;
  const source=p?._detSourceProposal,origin=p?._provenance;
  return origin?.engine==='det' && origin.mode==='app-profile' && origin.syntheticFixture===false &&
    typeof origin.engineVersion==='string' && !!origin.engineVersion && !!source?.athleteId && !!source.planningInputFingerprint &&
    Array.isArray(source.checks) && !source.checks.some(c=>c?.status==='blocked') && Array.isArray(p?.weeks) &&
    p.weeks.length>0 && p.weeks.length<=104 && p.weeks.every(w=>Array.isArray(w?.sessions));
}

/** A new click, a new scope and a fresh generation timestamp cannot duplicate the same dated plan. */
export async function archiveIdentity(coachId:string, plan:ReviewedPlan) {
  const {generatedAt:stamp,...provenance}=plan._provenance;
  void stamp;
  const canonical=canonicalJson([coachId,{...plan,_provenance:provenance}]);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical)));
  digest[6]=(digest[6]&15)|128;
  digest[8]=(digest[8]&63)|128;
  const hex=Array.from(digest.slice(0,16),b=>b.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}

export async function prepareDetScope(plan:ReviewedPlan,refs:NolioV2Refs,versionId:string,scope:unknown) {
  const p=await preparePlan(plan,refs,versionId,scope);
  const ops=await Promise.all(p.ops.map(async op=>({sessionKey:op.sessionKey,date:op.date,kind:op.kind,source:op.source,
    body:op.body,opKey:(await operationKey(versionId,op.source)).opKey})));
  const prepared:PreparedExport={engine:'det',ops,rows:p.precheck.rows.map(row=>({sessionKey:row.sessionKey,date:row.date,
    title:row.title,sport:row.sport,status:row.status,reason:row.reason})),problems:p.precheck.planProblems};
  return {complete:p.precheck.complete,prepared};
}
