import type {NolioExportScope} from '../../../supabase/functions/_shared/nolioV2/exportScope';
import type {RecreationDecision} from './coachExportFlow';
import {restoreStructuredPlan} from '../plan/restoreStructuredPlan';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const digest=/^[a-f0-9]{64}$/;
export type ExportResume={athleteId:string;versionId:string;scope:NolioExportScope};
// Navigation only. No plan body, credential, delivery proof or send consent.
export function readExportResume(search:string):ExportResume|null{
 try{
  const q=new URLSearchParams(search),athleteId=q.get('nolioAthlete'),versionId=q.get('nolioVersion');
  if(!uuid.test(athleteId??'')||!uuid.test(versionId??''))return null;
  const scope=JSON.parse(q.get('nolioScope')??'null');
  const valid=scope&&((scope.kind==='all'&&Object.keys(scope).length===1)
   ||(scope.kind==='weeks'&&Object.keys(scope).sort().join(',')==='from,kind,to'&&Number.isSafeInteger(scope.from)&&Number.isSafeInteger(scope.to)&&scope.from>0&&scope.to>=scope.from&&scope.to<=104)
   ||(scope.kind==='sessions'&&Object.keys(scope).sort().join(',')==='keys,kind'&&Array.isArray(scope.keys)&&scope.keys.length>0&&scope.keys.length<=5000&&scope.keys.every((k:unknown)=>typeof k==='string'&&/^S\d+-J[0-6]-\d+$/.test(k))&&new Set(scope.keys).size===scope.keys.length));
  return valid?{athleteId:athleteId!,versionId:versionId!,scope}:null;
 }catch{return null;}
}
export function writeExportResume(context:ExportResume|null){
 const u=new URL(window.location.href);
 for(const key of ['nolioAthlete','nolioVersion','nolioScope'])u.searchParams.delete(key);
 if(context){u.searchParams.set('nolioAthlete',context.athleteId);u.searchParams.set('nolioVersion',context.versionId);u.searchParams.set('nolioScope',JSON.stringify(context.scope));}
 window.history.replaceState(window.history.state,'',u);
}
const decisionKey=(coachId:string,versionId:string,hash:string)=>`tfclab-nolio-pending:${coachId}:${versionId}:${hash}`;
/** A pending question, never an approval. Untrusted browser hints are rebound
 * to a fresh server precheck and rechecked by the repair endpoint before POST. */
export function pendingRecreation(coachId:string,versionId:string,hash:string,write?:RecreationDecision|null):RecreationDecision|null{
 const key=decisionKey(coachId,versionId,hash);
 try{
  if(write!==undefined){if(write)sessionStorage.setItem(key,JSON.stringify(write));else sessionStorage.removeItem(key);return null;}
  const d=JSON.parse(sessionStorage.getItem(key)??'null') as RecreationDecision|null;
  if(!d||d.planSha256!==hash||![d.planSha256,d.refsSha256,d.opsSha256].every(x=>typeof x==='string'&&digest.test(x))||!Array.isArray(d.rows)||!d.rows.length||d.rows.length>5000||new Set(d.rows.map(r=>r.opIndex)).size!==d.rows.length||d.rows.some(r=>!r||!Number.isSafeInteger(r.opIndex)||r.opIndex<0||!digest.test(r.binding)))return null;
  return d;
 }catch{return null;}
}

export async function readOwnedExportArchive(resume:ExportResume,coachId:string,ports:{user:()=>Promise<string|null>;read:()=>Promise<{id:string;coach_id:string;athlete_id:string;plan_json:unknown}|null>}){
 if(await ports.user()!==coachId)return null;
 const row=await ports.read();
 if(await ports.user()!==coachId||!row||row.id!==resume.versionId||row.coach_id!==coachId||row.athlete_id!==resume.athleteId)return null;
 const plan=restoreStructuredPlan(row.plan_json),start=(row.plan_json as Record<string,unknown>)?._planStartDate;
 if(!plan||typeof start!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(start))return null;
 const date=new Date(`${start}T00:00:00Z`);
 if(isNaN(date.getTime())||date.toISOString().slice(0,10)!==start)return null;
 return {id:row.id,plan_json:plan,startDate:start};
}
