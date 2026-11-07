import {describe,it,expect,beforeAll} from 'vitest';
import {verifySportingRelease,authorizesReviewedPlan,type SportingRelease} from '../../../../supabase/functions/_shared/nolioV2/sportingRelease';
import {canonical} from '../../../../supabase/functions/_shared/nolioV2/dryRun';
import {exportCapabilities,sameExportCapabilities} from '../../../../supabase/functions/_shared/nolioV2/exportCapabilities';
const encode=(bytes:ArrayBuffer)=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const now=Date.parse('2026-11-06T20:00:00Z'),releaseId='a'.repeat(64),engineVersion='b'.repeat(64);
const release:SportingRelease={schema:'tfcl.sporting-release.v1',releaseId,engineVersion,policy:'owned_coach_reviewed_plan',allowedModes:['app-profile'],evidenceSha256:'c'.repeat(64),reviewer:'SYNTHETIC_TEST_REVIEWER',issuedAt:'2026-11-06T19:00:00Z',expiresAt:'2026-11-07T19:00:00Z'};
let key:CryptoKeyPair,publicKey:string,proofJson:string;
async function sign(r:SportingRelease){return JSON.stringify({release:r,signature:encode(await crypto.subtle.sign('Ed25519',key.privateKey,new TextEncoder().encode(canonical(r))))});}
beforeAll(async()=>{key=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']) as CryptoKeyPair;publicKey=encode(await crypto.subtle.exportKey('raw',key.publicKey));proofJson=await sign(release);});
describe('external release authority, never fabricated from ordinary review or a manifest',()=>{
 it('requires a configured proof and key; a source manifest is insufficient',async()=>{
  expect((await verifySportingRelease({releaseId,engineVersion,now})).ok).toBe(false);
  expect((await verifySportingRelease({proofJson,releaseId,engineVersion,now})).ok).toBe(false);
 });
 it('verifies the signed exact release and limits any resulting authorization to a reviewed, covered, non-synthetic plan',async()=>{
  const a=await verifySportingRelease({proofJson,publicKey,releaseId,engineVersion,now});expect(a.ok).toBe(true);
  const p={engine:'det',mode:'app-profile',engineVersion,releaseId,syntheticFixture:false,prescriptionAllowed:false};
  expect(authorizesReviewedPlan(a,p,true,true)).toBe(true);
  for(const altered of [{...p,syntheticFixture:true},{...p,engineVersion:'d'.repeat(64)},{...p,releaseId:'d'.repeat(64)},{...p,releaseId:undefined},{...p,mode:'synthetic-lab'},{...p,engine:'ai'},null])expect(authorizesReviewedPlan(a,altered,true,true)).toBe(false);
  expect(authorizesReviewedPlan(a,p,false,true)).toBe(false);expect(authorizesReviewedPlan(a,p,true,false)).toBe(false);
  expect(p.prescriptionAllowed).toBe(false); // archive remains the original candidate
 });
 it('rejects a changed release, changed engine, wrong key, missing signature and tampered payload',async()=>{
  const other=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']) as CryptoKeyPair;
  const wrong=encode(await crypto.subtle.exportKey('raw',other.publicKey));
  for(const over of [{releaseId:'d'.repeat(64)},{engineVersion:'d'.repeat(64)},{publicKey:wrong},{publicKey:'invalid'},{proofJson:'{}'},{proofJson:proofJson.replace('SYNTHETIC_TEST_REVIEWER','FORGED_REVIEWER')}])expect((await verifySportingRelease({proofJson,publicKey,releaseId,engineVersion,now,...over})).ok).toBe(false);
 });
 it('rejects expired, future and malformed policies even with a test signature',async()=>{
  for(const over of [{expiresAt:'2026-11-06T19:30:00Z'},{issuedAt:'2026-11-07T19:30:00Z'},{evidenceSha256:''},{allowedModes:[]},{allowedModes:['synthetic-lab']},{policy:'skip_review'}]){
   const altered={...release,...over} as SportingRelease;
   expect((await verifySportingRelease({proofJson:await sign(altered),publicKey,releaseId,engineVersion,now})).ok).toBe(false);
  }
 });
 it('requires both scoped backend contract and exact current release',()=>{
  for(const fn of ['nolio-v2-plan-dry-run','nolio-v2-send-plan'] as const){
   const c=exportCapabilities(fn,releaseId);expect(sameExportCapabilities(c,fn,releaseId)).toBe(true);
   for(const bad of [{...c,releaseId:'d'.repeat(64)},{...c,revision:'old'},{...c,scopes:['all']},{...c,serverOwnedPlanOnly:false},null])expect(sameExportCapabilities(bad,fn,releaseId)).toBe(false);
  }
 });
});
