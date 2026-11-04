import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { preparePlan } from '../_shared/nolioV2/planDryRun.ts';
import { parseReview, matchingCoachReview } from '../_shared/nolioV2/coachReview.ts';
const json=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST')return json(405,{status:'BLOCKED'});
 const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return json(401,{status:'BLOCKED'});
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY');if(!url||!anon)return json(500,{status:'BLOCKED'});
 // Dedicated isolated QA endpoint; no provider network or token reads.
 if(new URL(url).hostname.split('.')[0]!=='lkjesdacgpolrwfxulbo')return json(403,{status:'BLOCKED'});
 const user=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:c,error:ce}=await user.auth.getClaims(auth.slice(7));const sub=c?.claims?.sub;if(ce||typeof sub!=='string')return json(401,{status:'BLOCKED'});
 const staff=await user.rpc('is_staff_coach',{_user_id:sub});if(staff.error||staff.data!==true)return json(403,{status:'BLOCKED'});
 let b:Record<string,unknown>;try{b=await req.json();}catch{return json(400,{status:'BLOCKED'});}
 if(!b||Object.keys(b).some(k=>!['planVersionId','action','expected','review'].includes(k))||typeof b.planVersionId!=='string'||!/^[0-9a-f-]{36}$/i.test(b.planVersionId)||!['load','save'].includes(String(b.action)))return json(400,{status:'BLOCKED'});
 const pv=await user.from('plan_versions').select('id,coach_id,athlete_id,plan_json').eq('id',b.planVersionId).eq('coach_id',sub).maybeSingle();
 if(pv.error||!pv.data)return json(403,{status:'BLOCKED',reason:'plan_not_owned'});
 const ath=await user.from('athletes').select('id').eq('id',pv.data.athlete_id).eq('coach_id',sub).maybeSingle();if(ath.error||!ath.data)return json(403,{status:'BLOCKED'});
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)return json(500,{status:'BLOCKED'});const admin=createClient(url,key);
 const cn=await admin.from('nolio_v2_connections').select('refs').eq('coach_id',sub).eq('athlete_id',ath.data.id).eq('status','active').maybeSingle();
 if(cn.error||!cn.data)return json(200,{status:'BLOCKED',reason:'active_refs_absent'});
 const p=await preparePlan(pv.data.plan_json,cn.data.refs,pv.data.id);
 const binding={coachId:sub,athleteId:ath.data.id,planVersionId:pv.data.id,planSha256:p.planSha256,refsSha256:p.refsSha256,opsSha256:p.opsSha256};
 const expected=b.expected as Record<string,unknown>|null;
 if(b.action==='save'){
  if(!expected||expected.planSha256!==p.planSha256||expected.refsSha256!==p.refsSha256||expected.opsSha256!==p.opsSha256)return json(200,{status:'STALE'});
  const review=parseReview(b.review);if(!review)return json(400,{status:'BLOCKED',reason:'decisions_incomplete'});
  const row={coach_id:sub,athlete_id:ath.data.id,plan_version_id:pv.data.id,plan_sha256:p.planSha256,refs_sha256:p.refsSha256,ops_sha256:p.opsSha256,decisions:review.decisions,blockers:review.blockers,reviewed_by_coach:true,prescription_allowed:false,scientific_attestation:false};
  const ins=await admin.from('qa_plan_coach_reviews').insert(row).select('id').single();if(ins.error||!ins.data)return json(502,{status:'UNKNOWN'});
  const read=await user.from('qa_plan_coach_reviews').select('*').eq('id',ins.data.id).maybeSingle();
  if(read.error||!matchingCoachReview(read.data,binding)||JSON.stringify(read.data?.decisions)!==JSON.stringify(row.decisions) && JSON.stringify(Object.entries(read.data?.decisions??{}).sort())!==JSON.stringify(Object.entries(row.decisions).sort())||JSON.stringify(read.data?.blockers)!==JSON.stringify(row.blockers))return json(502,{status:'UNKNOWN'});
  return json(200,{status:'CONFIRMED',binding,review:read.data});
 }
 const read=await user.from('qa_plan_coach_reviews').select('*').eq('coach_id',sub).eq('plan_version_id',pv.data.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
 if(read.error)return json(502,{status:'UNKNOWN'});
 return json(200,{status:read.data?(matchingCoachReview(read.data,binding)?'CONFIRMED':'STALE'):'EMPTY',binding,review:matchingCoachReview(read.data,binding)?read.data:null});
});
