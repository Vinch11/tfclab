import {corsHeaders} from '../_shared/nolioV2/cors.ts';
import {authenticate,json,nativeFetch,ownsAthlete,UUID} from '../_shared/nolioV2/edgeAuth.ts';
import {loadConfig} from '../_shared/nolioV2/oauth.ts';
import {confirmedOpKeys,connectionFromGrant,readLink,readyGrant,refsFromLink} from '../_shared/nolioV2/prodConnection.ts';
import {confirmedRowsForPlan,sendExportBatch,verifyConfirmedBatch,type LedgerRow} from '../_shared/nolioV2/exportPlan.ts';
import {fetchNolioV2Http} from '../_shared/nolioV2/httpFetch.ts';
import {supabaseNolioV2Ledger} from '../_shared/nolioV2/ledgerSupabase.ts';
import {archiveIdentity,isDetArchive,prepareDetScope} from './contract.ts';

const refused=(reason:string,status=200)=>json(status,{status:'REFUSED',reason});
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return refused('method_not_allowed',405);
  const caller=await authenticate(req);
  if(caller instanceof Response)return caller;
  const deadline=Date.now()+55_000;
  let body:Record<string,unknown>;
  try{body=await req.json();}catch{return refused('body_not_json',400);}
  if(!body || typeof body!=='object' || Array.isArray(body))return refused('invalid_request',400);
  const action=String(body.action);
  const allowed:Record<string,string[]>={archive:['plan'],prepare:['planVersionId','scope'],send:['planVersionId','scope'],verify:['planVersionId','scope','fromIndex']};
  if(!Object.hasOwn(allowed,action)||Object.keys(body).some(k=>k!=='action'&&!allowed[action].includes(k)))return refused('invalid_request',400);
  if(action==='verify' && (!Number.isSafeInteger(body.fromIndex) || Number(body.fromIndex)<0))return refused('from_index_invalid',400);
  const {user,admin,coachId}=caller;
  if(action==='archive'){
    const plan=body.plan;
    if(!isDetArchive(plan))return refused('det_plan_invalid',400);
    const athleteId=plan._detSourceProposal.athleteId;
    const owns=await ownsAthlete(caller,athleteId);
    if(owns!==true)return refused(owns==='error'?'athlete_read_failed':'athlete_not_owned',owns==='error'?502:403);
    const link=await readLink(admin,coachId,athleteId);
    if(link==='error'||!link)return refused(link==='error'?'link_read_failed':'athlete_not_linked');
    const saved={...plan,_detNolioAthleteRef:link.nolio_athlete_ref};
    const id=await archiveIdentity(coachId,saved);
    const {error}=await user.from('plan_versions').upsert({id,coach_id:coachId,athlete_id:athleteId,plan_json:saved,
      objective:plan._detSourceProposal.objective,weeks_count:plan.weeks.length},{onConflict:'id',ignoreDuplicates:true});
    if(error)return refused('archive_write_failed',502);
    return json(200,{status:'ARCHIVED',planVersionId:id,athleteName:link.nolio_athlete_name});
  }
  const id=body.planVersionId;
  if(typeof id!=='string'||!UUID.test(id))return refused('plan_version_id_invalid',400);
  const {data:row,error}=await user.from('plan_versions').select('coach_id,athlete_id,plan_json').eq('id',id).eq('coach_id',coachId).maybeSingle();
  if(error || !row)return refused(error?'plan_read_failed':'plan_not_owned',error?502:403);
  if(!isDetArchive(row.plan_json)||row.plan_json._detSourceProposal.athleteId!==row.athlete_id || await archiveIdentity(coachId,row.plan_json)!==id)return refused('det_archive_changed');
  const link=await readLink(admin,coachId,row.athlete_id);
  if(link==='error'||!link)return refused(link==='error'?'link_read_failed':'athlete_not_linked');
  if(row.plan_json._detNolioAthleteRef!==link.nolio_athlete_ref)return refused('athlete_link_changed');
  const refs=refsFromLink(link);
  const {complete,prepared}=await prepareDetScope(row.plan_json,refs,id,body.scope);
  if(!complete||!prepared.ops.length)return json(200,{status:'REFUSED',reason:'scope_incomplete',problems:prepared.problems,
    refused:prepared.rows.filter(row=>row.status==='refused').map(row=>({session:row.sessionKey,reason:row.reason}))});
  const keys=await confirmedOpKeys(admin,coachId,id);
  if(!keys)return refused('ledger_read_failed',502);
  if(action==='prepare')return json(200,{status:'PREPARED',athleteName:link.nolio_athlete_name,total:prepared.ops.length,confirmed:prepared.ops.filter(o=>keys.has(o.opKey)).length});
  const config=loadConfig({clientId:Deno.env.get('NOLIO_V2_CLIENT_ID'),clientSecret:Deno.env.get('NOLIO_V2_CLIENT_SECRET'),supabaseUrl:caller.supabaseUrl});
  const ready=await readyGrant({admin,coachId,config,fetch:nativeFetch});
  if(ready.ok===false)return refused(ready.reason);
  if(ready.grant.id!==link.grant_id)return refused('athlete_link_from_previous_connection_relink');
  const accessToken=ready.grant.access_token,http=fetchNolioV2Http({fetch:(u,i)=>fetch(u,i),accessToken,deadline});
  if(action==='verify'){
    const {data,error}=await admin.from('nolio_v2_operations').select('op_key,session_key,path,state,remote_id').eq('coach_id',coachId).eq('plan_version_id',id);
    if(error||!Array.isArray(data))return refused('ledger_read_failed',502);
    const confirmed=confirmedRowsForPlan(prepared,data as LedgerRow[]);
    const result=await verifyConfirmedBatch({prepared,confirmed,http,athleteRef:refs.athleteId,fromIndex:Number(body.fromIndex),deadline});
    return json(200,{...result,status:'VERIFIED',expected:prepared.ops.length});
  }
  const result=await sendExportBatch({prepared,planVersionId:id,refs,connection:connectionFromGrant(ready.grant),http,ledger:supabaseNolioV2Ledger(admin,coachId),
    dryFetch:(u,i)=>fetch(u,i),accessToken,confirmedKeys:keys,batchSize:6,deadline});
  return json(200,result);
});
