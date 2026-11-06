import {canonical} from './dryRun.ts';
/** External sporting release authorization, not a source-manifest declaration
 * or an ordinary coach review. Only a deployment operator can configure the
 * trusted public key. No browser field can install a key or a release. */
export type SportingRelease={schema:'tfcl.sporting-release.v1';releaseId:string;engineVersion:string;policy:'owned_coach_reviewed_plan';allowedModes:Array<'app-profile'|'coach-inputs'>;evidenceSha256:string;reviewer:string;issuedAt:string;expiresAt:string};
export type ReleaseAuthority={ok:true;release:SportingRelease}|{ok:false;reason:string};
const hex=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
function bytes(s:string){if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('base64url');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));}
export async function verifySportingRelease(input:{proofJson?:string;publicKey?:string;releaseId:string;engineVersion:string;now:number}):Promise<ReleaseAuthority>{
 if(!input.proofJson||!input.publicKey)return {ok:false,reason:'release_sporting_attestation_absent'};
 try{
  const envelope=JSON.parse(input.proofJson) as {release:SportingRelease;signature:string};
  if(Object.keys(envelope).sort().join(',')!=='release,signature')throw Error('envelope');
  const r=envelope.release;
  if(!r||Object.keys(r).sort().join(',')!=='allowedModes,engineVersion,evidenceSha256,expiresAt,issuedAt,policy,releaseId,reviewer,schema'||r.schema!=='tfcl.sporting-release.v1'||r.policy!=='owned_coach_reviewed_plan'||!hex(r.releaseId)||!hex(r.engineVersion)||!hex(r.evidenceSha256)||r.releaseId!==input.releaseId||r.engineVersion!==input.engineVersion||typeof r.reviewer!=='string'||!r.reviewer.trim()||r.reviewer.length>200||!Array.isArray(r.allowedModes)||!r.allowedModes.length||new Set(r.allowedModes).size!==r.allowedModes.length||r.allowedModes.some(m=>!['app-profile','coach-inputs'].includes(m)))throw Error('release');
  if(typeof r.issuedAt!=='string'||typeof r.expiresAt!=='string')throw Error('date');
  const issued=Date.parse(r.issuedAt),expires=Date.parse(r.expiresAt);
  if(!Number.isFinite(issued)||!Number.isFinite(expires)||issued>input.now||expires<=input.now||issued>=expires)throw Error('validity');
  const raw=bytes(input.publicKey),signature=bytes(envelope.signature);if(raw.length!==32||signature.length!==64)throw Error('key');
  const key=await crypto.subtle.importKey('raw',raw,{name:'Ed25519'},false,['verify']);
  if(!await crypto.subtle.verify('Ed25519',key,signature,new TextEncoder().encode(canonical(r))))throw Error('signature');
  return {ok:true,release:r};
 }catch{return {ok:false,reason:'release_sporting_attestation_invalid_or_stale'};}
}
/** This result is computed on the server from a verified external release,
 * the exact immutable plan and its ordinary authenticated coach review. It
 * never changes the original candidate provenance or claims scientific proof. */
export function authorizesReviewedPlan(authority:ReleaseAuthority,provenance:unknown,reviewAccepted:boolean,fullCoverageComplete:boolean):boolean{
 const p=provenance as Record<string,unknown>|null;
 return authority.ok&&reviewAccepted&&fullCoverageComplete&&!!p&&p.engine==='det'&&p.syntheticFixture===false&&p.engineVersion===authority.release.engineVersion&&p.releaseId===authority.release.releaseId&&authority.release.allowedModes.includes(p.mode as 'app-profile'|'coach-inputs');
}
