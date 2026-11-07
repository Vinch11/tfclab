import {coachRefsForPlan} from '../_shared/nolioV2/coachRefs.ts';
import {checkCalendarConflict,markersForVersion} from '../_shared/nolioV2/calendarConflicts.ts';
import {withCalendarWriteLock} from '../_shared/nolioV2/calendarWriteLock.ts';
import {inspectDeletedOperation,recreationLedger} from '../_shared/nolioV2/deletedRecreation.ts';
import type {LedgerEntry} from '../_shared/nolioV2/plannedClient.ts';
import {readAthleteZones,powerZoneSummary} from '../_shared/nolioV2/athleteZones.ts';
import {coachPlanProblems,nativeCoachPlanProblems} from '../_shared/nolioV2/coachWorkflow.ts';
import {exportCapabilities} from '../_shared/nolioV2/exportCapabilities.ts';
import {verifySportingRelease,authorizesReviewedPlan} from '../_shared/nolioV2/sportingRelease.ts';
import {CHECKED_IN_PLAN_RELEASE_INFO} from '../_shared/planReleaseManifest.ts';
/**
 * Nolio V2 — envoi RÉEL planifié d'un plan complet (QA). SÉPARÉ de V1.
 *
 * Ordre strict :
 * 1. Auth : getClaims sur le JWT appelant (verify_jwt ne suffit pas).
 * 2. Entrée fermée : planVersionId, action (precheck|send|verify), expected
 *    {planSha256, refsSha256, opsSha256, jobId}, consent, fromIndex (verify). Aucun corps/URL client.
 * 3. Propriété : plan_versions + athletes lus PAR LE CLIENT DE L'APPELANT (RLS).
 * 4. Service-role créé SEULEMENT ensuite ; connexion V2 liée coach+athlète
 *    (le chargeur peut renouveler le jeton OAuth, jamais d'écriture calendrier).
 * 5. Corps figés MARQUÉS (même empreinte que la simulation) ; `realSendGate` :
 *    consentement, empreintes attendues, simulation intégrale concordante,
 *    prescription autorisée, attestation humaine. Un seul manque ⇒ BLOCKED, aucun réseau Nolio.
 * 6. `sendPlannedV2` : réservation durable avant POST, lot ≤ 8 nouveaux POST,
 *    arrêt sur incertain/401/403/429/refus, jamais de relance d'une opération incertaine.
 * 7. verify : lecture seule (liste complète du jour + détail, marqueur, correspondance exacte unique).
 */
import { verifyAndPersist } from "../_shared/nolioV2/verificationReceipt.ts";
import { reviewAccepted } from "../_shared/nolioV2/coachReview.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/nolioV2/cors.ts";
import { sendPlannedV2 } from "../_shared/nolioV2/plannedClient.ts";
import { loadV2ConnectionWithRefresh, type ConnectionStoreClient } from "../_shared/nolioV2/connectionStore.ts";
import { refreshGrantToken, supabaseRefreshStore } from "../_shared/nolioV2/tokenRefresh.ts";
import { loadConfig,QA_COACHES } from "../_shared/nolioV2/oauth.ts";
import { supabaseNolioV2Ledger } from "../_shared/nolioV2/ledgerSupabase.ts";
import { fetchNolioV2Http } from "../_shared/nolioV2/httpFetch.ts";
import { preparePlan } from "../_shared/nolioV2/planDryRun.ts";
import { realSendGate, sendPreview, PLAN_SEND_BATCH, type DryJob, type DryReceipt } from "../_shared/nolioV2/planSend.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED = new Set(["workflow","planVersionId", "action", "expected", "consent", "fromIndex", "scope","repair"]);
const SIM_JOBS = "qa_nolio_v2_plan_dry_run_jobs";
const SIM_RECEIPTS = "qa_nolio_v2_plan_dry_run_receipts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { status: "REFUSED", reason: "method_not_allowed" });
  const requestDeadline=Date.now()+35000;
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json(401, { status: "REFUSED", reason: "unauthorized" });
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return json(500, { status: "REFUSED", reason: "server_misconfigured" });
  if(new URL(url).hostname.split(".")[0]!=="lkjesdacgpolrwfxulbo")return json(403,{status:"BLOCKED",reason:"qa_origin_required"});
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(auth.slice(7));
  const sub = claims?.claims?.sub;
  if (claimsErr || typeof sub !== "string" || !UUID.test(sub)) return json(401, { status: "REFUSED", reason: "unauthorized" });

  if(!QA_COACHES.has(sub)){
    const staff = await userClient.rpc("is_staff_coach",{_user_id:sub});
    if(staff.error||staff.data!==true)return json(403,{status:"BLOCKED",reason:"staff_coach_required"});
  }
  let body: unknown;
  try { body = await req.json(); } catch { return json(400, { status: "REFUSED", reason: "body_not_json" }); }
  const b = (body ?? {}) as Record<string, unknown>;
  const extra = Object.keys(b).filter((k) => !ALLOWED.has(k));
  if (extra.length) return json(400, { status: "REFUSED", reason: `unknown_fields:${extra.join(",")}` });
  if (typeof b.planVersionId !== "string" || !UUID.test(b.planVersionId)) return json(400, { status: "REFUSED", reason: "plan_version_id_invalid" });
  if(b.workflow!==undefined&&b.workflow!=='coach')return json(400,{status:'REFUSED',reason:'workflow_unknown'});
  const action = b.action ?? "precheck";
  if (!['precheck','send','verify','capabilities','zones','conflicts','repair_check','repair'].includes(String(action))) return json(400, { status: "REFUSED", reason: "action_unknown" });
  if((action==='repair_check'||action==='repair')&&b.workflow!=='coach')return json(400,{status:'REFUSED',reason:'recreation_request_invalid'});
  if(b.repair!==undefined&&action!=='repair')return json(400,{status:'REFUSED',reason:'recreation_request_invalid'});
  if(action==='conflicts'&&(b.workflow!=='coach'||!Number.isSafeInteger(b.fromIndex)||Number(b.fromIndex)<0))return json(400,{status:'REFUSED',reason:'calendar_request_invalid'});
  if(action==='zones'&&(b.workflow!=='coach'||Object.keys(b).some(k=>!['workflow','action','planVersionId'].includes(k))))return json(400,{status:'REFUSED',reason:'zones_request_invalid'});
  const ex = (b.expected ?? null) as Record<string, unknown> | null;
  const expected = ex && typeof ex === "object" ? { planSha256: String(ex.planSha256 ?? ""), refsSha256: String(ex.refsSha256 ?? ""), opsSha256: String(ex.opsSha256 ?? ""), jobId: String(ex.jobId ?? "") } : null;

  const { data: pv, error: pvErr } = await userClient.from("plan_versions")
    .select("id, coach_id, athlete_id, plan_json").eq("id", b.planVersionId).eq("coach_id", sub).maybeSingle();
  if (pvErr) return json(502, { status: "REFUSED", reason: "plan_read_failed" });
  if (!pv) return json(404, { status: "REFUSED", reason: "plan_version_not_found_or_not_owned" });
  const { data: ath, error: athErr } = await userClient.from("athletes").select("id").eq("id", pv.athlete_id).eq("coach_id", sub).maybeSingle();
  if (athErr) return json(502, { status: "REFUSED", reason: "athlete_read_failed" });
  if (!ath) return json(403, { status: "REFUSED", reason: "athlete_not_owned" });

  if(b.action==='capabilities'){
    const a=await verifySportingRelease({proofJson:Deno.env.get('NOLIO_V2_SPORTING_RELEASE_PROOF'),publicKey:Deno.env.get('NOLIO_V2_SPORTING_RELEASE_PUBLIC_KEY'),releaseId:CHECKED_IN_PLAN_RELEASE_INFO.releaseId,engineVersion:CHECKED_IN_PLAN_RELEASE_INFO.components['det-engine'],now:Date.now()});
    return json(200,{...exportCapabilities('nolio-v2-send-plan',CHECKED_IN_PLAN_RELEASE_INFO.releaseId),coachWorkflow:true,sportingReleaseAuthorized:a.ok,blockers:a.ok?[]:[a.reason]});
  }
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return json(500, { status: "REFUSED", reason: "server_misconfigured" });
  // Service-role créé SEULEMENT après getClaims + propriété plan/athlète vérifiées.
  const admin = createClient(url, serviceKey);
  const cfg = loadConfig({ clientId: Deno.env.get("NOLIO_V2_CLIENT_ID"), clientSecret: Deno.env.get("NOLIO_V2_CLIENT_SECRET"), supabaseUrl: url });
  const loaded = await loadV2ConnectionWithRefresh(admin as unknown as ConnectionStoreClient, { coachId: sub, athleteId: pv.athlete_id },
    (grantId, generation, scopes) => refreshGrantToken({ grantId, generation, currentScopes: scopes, config: cfg, store: supabaseRefreshStore(admin), now: Date.now,
      fetch: async (u, i) => { const res = await fetch(u, i); return { status: res.status, json: () => res.json() }; } }));
  if (!loaded.ok) return json(200, { status: "BLOCKED", reason: loaded.reason, network: "none", gate: [] });
  const conn = loaded.value;
  const planJson = pv.plan_json as Record<string, unknown> | null;
  // Authenticated owner only. This branch cannot reach simulation, send,
  // ledger, verification-receipt writes or mutate remote zone settings.
  if(action==='zones'){
    const zones=await readAthleteZones({fetch:(u,i)=>fetch(u,i),accessToken:conn.accessToken,athleteRef:conn.refs.athleteId,scopes:conn.connection.grantedScopes});
    if(!zones.ok)return json(200,{status:'ZONES_UNAVAILABLE',reason:zones.reason});
    try{return json(200,{status:'ZONES_READ',summary:powerZoneSummary(planJson,conn.refs,zones.wrappers)});}
    catch{return json(200,{status:'ZONES_UNAVAILABLE',reason:'zones_plan_structure_invalid'});}
  }
  const normal=b.workflow==='coach';
  const normalProblems=normal?[...coachPlanProblems(planJson,pv.athlete_id,CHECKED_IN_PLAN_RELEASE_INFO.components['det-engine']),...nativeCoachPlanProblems(planJson)]:[];
  if(normalProblems.length)return json(200,{status:'BLOCKED',reason:normalProblems[0],gate:normalProblems,network:'none'});
  const effectiveRefs=await coachRefsForPlan(admin as unknown as Parameters<typeof coachRefsForPlan>[0],{coachId:sub,athleteId:pv.athlete_id,plan:planJson,refs:conn.refs,now:Date.now()});
  const prepared = await preparePlan(planJson, effectiveRefs, pv.id,b.scope);

  // Preuve de simulation : job du MÊME plan + empreintes ; reçus relus (service-role, coach lié).
  let job: DryJob = null, receipts: DryReceipt[] = [];
  if (expected && UUID.test(expected.jobId)) {
    const j = await admin.from(SIM_JOBS).select("id,plan_version_id,plan_sha256,refs_sha256,ops_sha256,total_ops").eq("id", expected.jobId).eq("coach_id", sub).maybeSingle();
    if (j.error) return json(502, { status: "BLOCKED", reason: "simulation_job_read_failed", network: "none", gate: [] });
    job = (j.data as DryJob) ?? null;
    if (job) {
      const r = await admin.from(SIM_RECEIPTS).select("op_index,session_key,session_date,body_sha256,outcome,code,http_status").eq("job_id", job.id).eq("coach_id", sub);
      if (r.error || !Array.isArray(r.data)) return json(502, { status: "BLOCKED", reason: "simulation_receipts_read_failed", network: "none", gate: [] });
      receipts = r.data as DryReceipt[];
    }
  }
  const reviewRead = normal?{data:null,error:null}:await admin.from("qa_plan_coach_reviews").select("*").eq("coach_id",sub).eq("plan_version_id",pv.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
  const fullReviewPrepared=normal||b.scope===undefined?prepared:await preparePlan(planJson,effectiveRefs,pv.id);
  const reviewOk = !reviewRead.error && reviewAccepted(reviewRead.data,{coachId:sub,athleteId:pv.athlete_id,planVersionId:pv.id,planSha256:fullReviewPrepared.planSha256,refsSha256:fullReviewPrepared.refsSha256,opsSha256:fullReviewPrepared.opsSha256});
  const authority=await verifySportingRelease({proofJson:Deno.env.get('NOLIO_V2_SPORTING_RELEASE_PROOF'),publicKey:Deno.env.get('NOLIO_V2_SPORTING_RELEASE_PUBLIC_KEY'),releaseId:CHECKED_IN_PLAN_RELEASE_INFO.releaseId,engineVersion:CHECKED_IN_PLAN_RELEASE_INFO.components['det-engine'],now:Date.now()});
  const serverAuthorized=authorizesReviewedPlan(authority,planJson?._provenance,reviewOk,fullReviewPrepared.precheck.complete);
  const gate = await realSendGate({...(normal?{coachExportBinding:{planVersionId:pv.id,planSha256:prepared.planSha256}}:{}),...(serverAuthorized&&authority.ok?{serverPrescriptionAuthorization:{planVersionId:pv.id,planSha256:prepared.planSha256,releaseId:authority.release.releaseId}}:{}), planVersionId: pv.id, prepared, expected: expected ?? { planSha256: "", refsSha256: "", opsSha256: "", jobId: "" },
    consent: b.consent, job, receipts, provenance: planJson?._provenance ?? null, attestation: reviewOk ? {planVersionId:pv.id,planSha256:prepared.planSha256,reviewer:sub} : null });
  if (!normal&&!reviewOk) gate.push("coach_review_absent_or_stale");
  // A checked-in manifest cannot authorize release. The external signature
  // is verified against an operator-installed key and this exact source release.
  if(!normal&&!authority.ok)gate.push(authority.reason);
  const preview = sendPreview(prepared);
  const savedVersionId=pv.id;

  // All information comes from the owned saved version and its provider link.
  // A server-side bounded history read also catches known old remote IDs whose
  // descriptions have since lost their origin marker. Never expose those IDs.
  async function calendarContext(){
    const history=await admin.from('nolio_v2_operations').select('remote_id,state',{count:'exact'}).eq('coach_id',sub).eq('athlete_ref',effectiveRefs.athleteId).neq('plan_version_id',savedVersionId).limit(1001);
    if(history.error||!Array.isArray(history.data)||history.data.length>1000||history.count!==history.data.length)throw Error('previous_exports_read_failed');
    if(history.data.some(x=>['sending','sent_unconfirmed','ambiguous'].includes(x.state)&&!x.remote_id))throw Error('previous_export_unresolved');
    const full=b.scope===undefined?prepared:await preparePlan(planJson,effectiveRefs,savedVersionId);
    return {currentMarkers:await markersForVersion(savedVersionId,full.ops.map(o=>o.source)),priorRemoteIds:new Set<string>(history.data.flatMap(x=>typeof x.remote_id==='string'?[x.remote_id]:[]))};
  }
  if(action==='conflicts'){
    if(!expected||expected.planSha256!==prepared.planSha256||expected.refsSha256!==prepared.refsSha256||expected.opsSha256!==prepared.opsSha256||!prepared.precheck.complete)return json(200,{status:'BLOCKED',reason:'verification_hashes_stale',preview});
    const from=Number(b.fromIndex);
    if(from>=prepared.ops.length)return json(400,{status:'REFUSED',reason:'calendar_request_invalid'});
    let context;
    try{context=await calendarContext();}catch(e){return json(200,{status:'BLOCKED',reason:(e as Error).message,preview});}
    const http=fetchNolioV2Http({fetch:(u,i)=>fetch(u,i),accessToken:conn.accessToken,deadline:requestDeadline});
    const rows=[];
    for(const o of prepared.ops.slice(from,from+PLAN_SEND_BATCH)){
      const result=await checkCalendarConflict({...context,http,athleteRef:effectiveRefs.athleteId,op:o.source,deadline:requestDeadline});
      rows.push({opIndex:o.opIndex,sessionKey:o.sessionKey,date:o.date,...result});
      if(result.status!=='clear')break;
    }
    return json(200,{status:'CALENDAR_CHECK',preview,fromIndex:from,nextIndex:from+rows.length,total:prepared.ops.length,rows});
  }
  if(action==='repair_check'||action==='repair'){
    if(!expected||expected.planSha256!==prepared.planSha256||expected.refsSha256!==prepared.refsSha256||expected.opsSha256!==prepared.opsSha256||!prepared.precheck.complete)return json(200,{status:'BLOCKED',reason:'verification_hashes_stale',preview});
    const history=await admin.from('nolio_v2_operations').select('*',{count:'exact'}).eq('coach_id',sub).eq('plan_version_id',pv.id).limit(1001);
    if(history.error||!Array.isArray(history.data)||history.data.length>1000||history.count!==history.data.length)return json(200,{status:'BLOCKED',reason:'ledger_read_failed',preview});
    const entries:LedgerEntry[]=history.data.map(e=>({opKey:e.op_key,planVersionId:e.plan_version_id,sessionKey:e.session_key,path:e.path,athleteRef:e.athlete_ref,payloadSha256:e.payload_sha256,apiVersion:'v2',state:e.state,remoteId:e.remote_id,detail:e.detail}));
    const attempted=prepared.ops.flatMap(op=>{const entry=entries.find(e=>e.sessionKey===op.sessionKey&&e.path===op.path);return entry?[{op,entry}]:[];});
    const http=fetchNolioV2Http({fetch:(u,i)=>fetch(u,i),accessToken:conn.accessToken,deadline:requestDeadline});
    if(action==='repair_check'){
      const from=Number(b.fromIndex);if(!Number.isSafeInteger(from)||from<0||from>attempted.length)return json(400,{status:'REFUSED',reason:'recreation_request_invalid'});
      const rows=[];
      for(const {op,entry} of attempted.slice(from,from+PLAN_SEND_BATCH)){
        const result=await inspectDeletedOperation({http,entry,op,prepared,planVersionId:pv.id,athleteRef:effectiveRefs.athleteId,deadline:requestDeadline});
        rows.push({opIndex:op.opIndex,sessionKey:op.sessionKey,date:op.date,...result});
        if(result.status==='blocked')break;
      }
      return json(200,{status:'RECREATION_CHECK',preview,fromIndex:from,nextIndex:from+rows.length,total:attempted.length,rows});
    }
    if(gate.length)return json(200,{status:'BLOCKED',reason:gate[0],gate,preview});
    const repair=b.repair as Record<string,unknown>|null;
    if(!repair||Object.keys(repair).some(k=>!['opIndex','binding'].includes(k))||!Number.isSafeInteger(repair.opIndex)||typeof repair.binding!=='string'||!/^[a-f0-9]{64}$/.test(repair.binding))return json(400,{status:'REFUSED',reason:'recreation_request_invalid'});
    const selected=attempted.find(x=>x.op.opIndex===repair.opIndex);if(!selected)return json(200,{status:'BLOCKED',reason:'recreation_ledger_divergent',preview});
    try{return await withCalendarWriteLock({client:admin,coachId:sub,athleteRef:effectiveRefs.athleteId,planVersionId:pv.id,run:async requestId=>{
      const context=await calendarContext();
      const fresh=await inspectDeletedOperation({http,...selected,prepared,planVersionId:pv.id,athleteRef:effectiveRefs.athleteId,deadline:requestDeadline});
      if(fresh.status!=='deleted'||fresh.binding!==repair.binding)return json(200,{status:'BLOCKED',reason:fresh.status==='blocked'?fresh.reason:'recreation_decision_stale',preview});
      const conflict=await checkCalendarConflict({...context,http,athleteRef:effectiveRefs.athleteId,op:selected.op.source,deadline:requestDeadline});
      if(conflict.status!=='clear')return json(200,{status:'BLOCKED',reason:conflict.reason,preview});
      const ordinary=supabaseNolioV2Ledger(admin,sub);
      const report=await sendPlannedV2({connection:conn.connection,refs:effectiveRefs,planVersionId:pv.id,operations:[selected.op.source],ledger:recreationLedger({client:admin,ledger:ordinary,entry:selected.entry,coachId:sub,requestId,prepared,binding:fresh.binding!}),http,maxNewPosts:1,stopOnRejected:true,noRetry:true});
      return json(200,{...report,preview,opIndex:selected.op.opIndex});
    }});}catch{return json(200,{status:'BLOCKED',reason:'recreation_unconfirmed',preview});}
  }

  if (action === "precheck") {
    const prior = await admin.from("nolio_v2_operations").select("session_key,payload_sha256,path").eq("coach_id", sub).eq("plan_version_id", pv.id);
    if (prior.error || !Array.isArray(prior.data)) return json(502, {status:"BLOCKED",reason:"ledger_read_failed",network:"none"});
    // Re-read every previously attempted operation before any new batch. A
    // deleted/edited earlier activity must not cause eight more creates on retry.
    const existingThroughIndex = prepared.ops.reduce((end, op) => prior.data.some((row: {session_key:string;payload_sha256:string;path:string}) => row.session_key===op.sessionKey && row.path===op.path && row.payload_sha256===op.bodySha256) ? Math.max(end,op.opIndex+1) : end, 0);
    return json(200, { status: gate.length ? "BLOCKED" : "READY", reason: gate[0] ?? null, gate, preview, existingThroughIndex, network: "none" });
  }
  const ledger = supabaseNolioV2Ledger(admin, sub);
  if (action === "send") {
    if (gate.length) return json(200, { status: "BLOCKED", reason: gate[0], gate, preview, network: "none" });
    // Hold across history+calendar reads, reservations and provider POSTs. The
    // lease spans versions, unlike the existing per-operation idempotency key.
    try{return await withCalendarWriteLock({client:admin,coachId:sub,athleteRef:effectiveRefs.athleteId,planVersionId:pv.id,run:async()=>{
    const context=await calendarContext();
    const attempted=await admin.from('nolio_v2_operations').select('session_key,path',{count:'exact'}).eq('coach_id',sub).eq('plan_version_id',pv.id).limit(1001);
    if(attempted.error||!Array.isArray(attempted.data)||attempted.data.length>1000||attempted.count!==attempted.data.length)throw Error('previous_exports_read_failed');
    const attemptedKeys=new Set(attempted.data.map(x=>`${x.path}|${x.session_key}`));
    const http=fetchNolioV2Http({fetch:(u,i)=>fetch(u,i),accessToken:conn.accessToken,deadline:requestDeadline});
    const report = await sendPlannedV2({
      connection: conn.connection, refs: effectiveRefs, planVersionId: pv.id, operations: prepared.ops.map((o) => o.source),
      ledger, http,
      beforeClaim:async op=>{if(attemptedKeys.has(`${op.path}|${op.sessionKey}`))return null;const r=await checkCalendarConflict({...context,http,athleteRef:effectiveRefs.athleteId,op,deadline:requestDeadline});return r.status==='clear'?null:r.reason;},
      maxNewPosts: PLAN_SEND_BATCH, stopOnRejected: true, noRetry: true,
    });
    return json(200, { ...report, gate, preview });
    }});}catch(e){const reason=(e as Error).message;return json(200,{status:'BLOCKED',reason:['previous_exports_read_failed','previous_export_unresolved','calendar_write_busy_or_unavailable'].includes(reason)?reason:'calendar_read_failed',gate,preview,network:'no_create'});}
  }
  // verify : LECTURE SEULE des opérations confirmées du journal (aucun POST).
  const ops = await admin.from("nolio_v2_operations").select("session_key,state,payload_sha256,path").eq("coach_id", sub).eq("plan_version_id", pv.id);
  if (ops.error || !Array.isArray(ops.data)) return json(502, { status: "BLOCKED", reason: "ledger_read_failed", network: "none" });
  if (!ops.data.length) return json(200, { status: "NOTHING_SENT", reason: "no_ledger_entry", network: "none", gate, preview });
  const from = Number.isSafeInteger(b.fromIndex) && (b.fromIndex as number) >= 0 ? b.fromIndex as number : 0;
  const http = fetchNolioV2Http({ fetch: (u, i) => fetch(u, i), accessToken: conn.accessToken,deadline:requestDeadline });
  if (!expected || expected.planSha256!==prepared.planSha256 || expected.refsSha256!==prepared.refsSha256 || expected.opsSha256!==prepared.opsSha256) return json(200,{status:"BLOCKED",reason:"verification_hashes_stale",gate,preview});
  const deadline=requestDeadline;
  const results: Array<{ opIndex: number; result: string; receiptId?: unknown }> = [];
  for (const o of prepared.ops.slice(from, from + PLAN_SEND_BATCH)) {
    const led = (ops.data as Array<{ session_key: string; state: string; payload_sha256: string; path: string }>).find((x) => x.session_key === o.sessionKey && x.path === o.path);
    if (!led) { results.push({ opIndex: o.opIndex, result: "not_sent" }); continue; }
    if (led.payload_sha256 !== o.bodySha256) { results.push({ opIndex: o.opIndex, result: "ledger_body_divergent" }); break; }
    if(Date.now()>=deadline)break;
    const rc=await verifyAndPersist({coachId:sub,athleteId:pv.athlete_id,planVersionId:pv.id,prepared,op:o,http,ledger,ledgerState:led.state,deadline,store:{insert:async(row)=>{
      const w=await admin.from("qa_nolio_v2_plan_verify_receipts").insert(row).select("id").single();if(w.error||!w.data)return null;
      const r=await admin.from("qa_nolio_v2_plan_verify_receipts").select("*").eq("id",w.data.id).eq("coach_id",sub).maybeSingle();return r.error?null:r.data;
    }}});
    results.push({opIndex:o.opIndex,...rc});
    if(rc.result!=="verified_unique")break;
  }
  return json(200, { status: "VERIFY", gate, preview, fromIndex: from, results, total: prepared.ops.length, ledgerStates: ops.data.map((x) => (x as { state: string }).state) });
});
