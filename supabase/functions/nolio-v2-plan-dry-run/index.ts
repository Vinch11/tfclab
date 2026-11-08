import {coachRefsForPlan} from '../_shared/nolioV2/coachRefs.ts';
import {inspectDryRunRefusal} from '../_shared/nolioV2/inspectDryRunRefusal.ts';
import {exportCapabilities} from '../_shared/nolioV2/exportCapabilities.ts';
import {CHECKED_IN_PLAN_RELEASE_INFO} from '../_shared/planReleaseManifest.ts';
/**
 * Nolio V2 — simulation dry_run d'un plan COMPLET sauvegardé (QA). DRY-RUN ONLY :
 * n'importe ni sendPlannedV2, ni ledger de création, ni trialSession.
 * Entrée stricte {planVersionId, action ∈ precheck|run}. Ordre : backend QA → getClaims →
 * coach QA → plan_versions + athlète relus par le client appelant (RLS) → service-role →
 * connexion V2 active → précontrôle → (run) job figé + bail + lot borné (trainings ET competitions,
 * routes fermées de postDryRun, dry_run forcé).
 * Journaux : codes/compteurs seulement.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/nolioV2/cors.ts";
import { loadConfig, qaBackendOk, QA_COACHES } from "../_shared/nolioV2/oauth.ts";
import { loadV2ConnectionWithRefresh, type ConnectionStoreClient } from "../_shared/nolioV2/connectionStore.ts";
import { refreshGrantToken, supabaseRefreshStore } from "../_shared/nolioV2/tokenRefresh.ts";
import { postDryRun } from "../_shared/nolioV2/dryRun.ts";
import { preparePlan, runPlanDryRunBatch, progressOf, manifestOf, type JobRow, type PlanDryRunStore } from "../_shared/nolioV2/planDryRun.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JOB_COLS = "id,plan_sha256,refs_sha256,ops_sha256,total_ops";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { status: "BLOCKED", code: "method_not_allowed" });
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return json(500, { status: "BLOCKED", code: "server_misconfigured" });
  if (!qaBackendOk(url)) return json(403, { status: "BLOCKED", code: "backend_not_qa" });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json(401, { status: "BLOCKED", code: "unauthorized" });
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.slice(7));
  const sub = claims?.claims?.sub;
  if (cErr || typeof sub !== "string" || !UUID.test(sub)) return json(401, { status: "BLOCKED", code: "unauthorized" });
  if (!QA_COACHES.has(sub)) return json(403, { status: "BLOCKED", code: "coach_not_qa" });

  let b: Record<string, unknown>;
  try { b = (await req.json()) ?? {}; } catch { return json(400, { status: "BLOCKED", code: "body_not_json" }); }
  if (Object.keys(b).some((k) => !["planVersionId", "action", "scope"].includes(k))) return json(400, { status: "BLOCKED", code: "unknown_fields" });
  if (typeof b.planVersionId !== "string" || !UUID.test(b.planVersionId)) return json(400, { status: "BLOCKED", code: "plan_version_id_invalid" });
  if (b.action !== "precheck" && b.action !== "run" && b.action !== "capabilities" && b.action !== 'inspect-refusal') return json(400, { status: "BLOCKED", code: "action_unknown" });
  const pv = await userClient.from("plan_versions").select("id,athlete_id,plan_json").eq("id", b.planVersionId).eq("coach_id", sub).maybeSingle();
  if (pv.error) return json(502, { status: "BLOCKED", code: "plan_read_failed" });
  if (!pv.data) return json(403, { status: "BLOCKED", code: "plan_not_owned" });
  const athleteId = (pv.data as { athlete_id: string }).athlete_id;
  const ath = await userClient.from("athletes").select("id").eq("id", athleteId).eq("coach_id", sub).maybeSingle();
  if (ath.error || !ath.data) return json(403, { status: "BLOCKED", code: "athlete_not_owned" });

  if(b.action==='capabilities')return json(200,exportCapabilities('nolio-v2-plan-dry-run',CHECKED_IN_PLAN_RELEASE_INFO.releaseId));
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return json(500, { status: "BLOCKED", code: "server_misconfigured" });
  const admin = createClient(url, serviceKey); // seulement après getClaims + propriété
  const cfg = loadConfig({ clientId: Deno.env.get("NOLIO_V2_CLIENT_ID"), clientSecret: Deno.env.get("NOLIO_V2_CLIENT_SECRET"), supabaseUrl: url });
  const loaded = await loadV2ConnectionWithRefresh(admin as unknown as ConnectionStoreClient, { coachId: sub, athleteId },
    (grantId, generation, scopes) => refreshGrantToken({ grantId, generation, currentScopes: scopes, config: cfg, store: supabaseRefreshStore(admin), now: Date.now,
      fetch: async (u, i) => { const res = await fetch(u, i); return { status: res.status, json: () => res.json() }; } }));
  if (!loaded.ok) return json(200, { status: "BLOCKED", code: (loaded as { reason: string }).reason, precheck: null, progress: null });
  const planJson=(pv.data as {plan_json:unknown}).plan_json;
  const effectiveRefs=await coachRefsForPlan(admin as unknown as Parameters<typeof coachRefsForPlan>[0],{coachId:sub,athleteId,plan:planJson,refs:loaded.value.refs,now:Date.now()});
  const prepared = await preparePlan(planJson, effectiveRefs, b.planVersionId,b.scope);
  const planVersionId = b.planVersionId;
  const store: PlanDryRunStore = {
    async freezeJob(p) {
      const ins = await admin.from("qa_nolio_v2_plan_dry_run_jobs").upsert({ coach_id: sub, athlete_id: athleteId, plan_version_id: planVersionId, plan_sha256: p.planSha256, refs_sha256: p.refsSha256, ops_sha256: p.opsSha256, total_sessions: p.totalSessions, total_ops: p.totalOps },
        { onConflict: "coach_id,plan_version_id,refs_sha256,ops_sha256", ignoreDuplicates: true });
      if (ins.error) throw new Error("freeze");
      const { data, error } = await admin.from("qa_nolio_v2_plan_dry_run_jobs").select(JOB_COLS).eq("coach_id", sub).eq("plan_version_id", planVersionId).eq("refs_sha256", p.refsSha256).eq("ops_sha256", p.opsSha256).single();
      if (error || !data) throw new Error("freeze_read");
      return data as JobRow;
    },
    async lease(id, lock, s) { const { data, error } = await admin.rpc("qa_nolio_v2_plan_job_lease", { p_job_id: id, p_coach_id: sub, p_lock_id: lock, p_seconds: s }); return !error && data === true; },
    async release(id, lock) { await admin.rpc("qa_nolio_v2_plan_job_release", { p_job_id: id, p_coach_id: sub, p_lock_id: lock }); },
    async receipts(id) {
      const { data, error } = await admin.from("qa_nolio_v2_plan_dry_run_receipts").select("op_index,body_sha256,outcome,code").eq("job_id", id).eq("coach_id", sub);
      if (error || !Array.isArray(data)) throw new Error("receipts");
      return data as never;
    },
    async insertReceipt(r) { const { error } = await admin.from("qa_nolio_v2_plan_dry_run_receipts").insert({ ...r, coach_id: sub }); return !error; },
  };
  // precheck : aucune requête Nolio ; progression existante relue si un job identique existe déjà.
  const pc = prepared.precheck;
  const publicPrecheck = { ...pc, rows: pc.rows };
  // Manifeste SANS identifiant Nolio (index, séance, date, kind, path, empreinte du corps) + empreintes du job :
  // le navigateur le recalcule et le compare au job et à CHAQUE reçu relus sous RLS.
  const binding = { planSha256: prepared.planSha256, refsSha256: prepared.refsSha256, opsSha256: prepared.opsSha256, manifest: manifestOf(prepared.ops) };
  if(b.action==='inspect-refusal'){
    const j=await admin.from('qa_nolio_v2_plan_dry_run_jobs').select(JOB_COLS).eq('coach_id',sub).eq('plan_version_id',planVersionId).eq('refs_sha256',prepared.refsSha256).eq('ops_sha256',prepared.opsSha256).maybeSingle();
    if(j.error||!j.data)return json(200,{status:'BLOCKED',code:'refusal_context_stale',...binding});
    const job=j.data as JobRow;
    const lock=crypto.randomUUID();
    try{
      const out=await inspectDryRunRefusal({prepared,job,receipts:await store.receipts(job.id),lease:()=>store.lease(job.id,lock,30),release:()=>store.release(job.id,lock),post:(kind,body,ms)=>postDryRun({kind,fetch:(u,i)=>fetch(u,i),accessToken:loaded.value.accessToken,body,budgetMs:ms})});
      return json(200,{...out,...binding});
    }catch{return json(200,{status:'BLOCKED',code:'refusal_diagnostic_unavailable',...binding});}
  }
  if (b.action === "precheck") {
    let progress = null;
    const j = await admin.from("qa_nolio_v2_plan_dry_run_jobs").select(JOB_COLS).eq("coach_id", sub).eq("plan_version_id", planVersionId).eq("refs_sha256", prepared.refsSha256).eq("ops_sha256", prepared.opsSha256).maybeSingle();
    if (!j.error && j.data) { try { progress = { ...progressOf(j.data as JobRow, prepared.ops, await store.receipts((j.data as JobRow).id)), stoppedOn: null, processedThisBatch: 0 }; } catch { progress = null; } }
    console.log(JSON.stringify({ fn: "nolio-v2-plan-dry-run", action: "precheck", total: pc.totalSessions, ops: pc.operations, refused: pc.refused, complete: pc.complete }));
    return json(200, { status: pc.complete ? "PRECHECK_COMPLETE" : "PRECHECK_BLOCKED", code: pc.complete ? "ok" : "coverage_incomplete", precheck: publicPrecheck, ...binding, progress });
  }
  let out;
  try {
    out = await runPlanDryRunBatch({ prepared, store, lockId: crypto.randomUUID(), now: Date.now,
      post: (kind, body, ms) => postDryRun({ kind, fetch: (u, i) => fetch(u, i), accessToken: loaded.value.accessToken, body, budgetMs: ms }) });
  } catch { out = { status: "BLOCKED" as const, code: "store_failed", progress: null }; }
  console.log(JSON.stringify({ fn: "nolio-v2-plan-dry-run", action: "run", status: out.status, code: out.code, valid: out.progress?.valid ?? null, total: out.progress?.totalOps ?? null }));
  return json(200, { ...out, precheck: publicPrecheck, ...binding });
});
