/**
 * Nolio V2 — essai réel contrôlé d'UNE séance technique (recette QA unique).
 * Entrée stricte {athleteId, recipeCode, action ∈ prepare|send|verify} ; aucun corps, URL,
 * date ou mode venant du client. N'importe NI sendPlannedV2 NI le transport dry_run.
 * Ordre : backend QA → getClaims → coach QA A/B → athlète possédé (client appelant, RLS)
 * → service-role → connexion V2 active validée → action. Journaux : codes seulement.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { loadConfig, qaBackendOk, QA_COACHES } from "../_shared/nolioV2/oauth.ts";
import { loadV2ConnectionWithRefresh, type ConnectionStoreClient } from "../_shared/nolioV2/connectionStore.ts";
import { refreshGrantToken, supabaseRefreshStore } from "../_shared/nolioV2/tokenRefresh.ts";
import { fetchNolioV2Http } from "../_shared/nolioV2/httpFetch.ts";
import { runTrialAction, TRIAL_POST_BUDGET_MS, TRIAL_RECIPE_CODE, type TrialRow, type TrialStore } from "../_shared/nolioV2/trialSession.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLS = "id,trial_date,payload_sha256,state,remote_id";

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
  const extra = Object.keys(b).filter((k) => !["athleteId", "recipeCode", "action"].includes(k));
  if (extra.length) return json(400, { status: "BLOCKED", code: "unknown_fields" });
  if (typeof b.athleteId !== "string" || !UUID.test(b.athleteId)) return json(400, { status: "BLOCKED", code: "athlete_id_invalid" });
  if (b.recipeCode !== TRIAL_RECIPE_CODE) return json(400, { status: "BLOCKED", code: "recipe_unknown" });
  if (!["prepare", "send", "verify"].includes(String(b.action))) return json(400, { status: "BLOCKED", code: "action_unknown" });
  const { data: ath, error: aErr } = await userClient.from("athletes").select("id").eq("id", b.athleteId).eq("coach_id", sub).maybeSingle();
  if (aErr) return json(502, { status: "BLOCKED", code: "athlete_read_failed" });
  if (!ath) return json(403, { status: "BLOCKED", code: "athlete_not_owned" });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return json(500, { status: "BLOCKED", code: "server_misconfigured" });
  const admin = createClient(url, serviceKey); // seulement après getClaims + propriété
  const cfg = loadConfig({ clientId: Deno.env.get("NOLIO_V2_CLIENT_ID"), clientSecret: Deno.env.get("NOLIO_V2_CLIENT_SECRET"), supabaseUrl: url });
  const athleteId = b.athleteId;
  const rowOf = (x: unknown): TrialRow => { const o = x as Record<string, unknown>; if (!o || typeof o.id !== "string") throw new Error("row"); return o as unknown as TrialRow; };
  const store: TrialStore = {
    async get() {
      const { data, error } = await admin.from("qa_nolio_v2_trials").select(COLS).eq("coach_id", sub).eq("athlete_id", athleteId).eq("recipe_code", TRIAL_RECIPE_CODE).limit(2);
      if (error || !Array.isArray(data) || data.length > 1) throw new Error("store");
      return data.length ? rowOf(data[0]) : null;
    },
    async freeze(date, sha) {
      const { data, error } = await admin.rpc("qa_nolio_v2_trial_freeze", { p_coach_id: sub, p_athlete_id: athleteId, p_recipe_code: TRIAL_RECIPE_CODE, p_trial_date: date, p_payload_sha256: sha });
      if (error) throw new Error("freeze");
      return rowOf(data);
    },
    async claimSend(id, sha) {
      const { data, error } = await admin.rpc("qa_nolio_v2_trial_claim_send", { p_trial_id: id, p_coach_id: sub, p_payload_sha256: sha });
      if (error || typeof data !== "boolean") throw new Error("claim");
      return data;
    },
    async finishSend(id, to, remoteId, http) {
      const { data, error } = await admin.rpc("qa_nolio_v2_trial_finish_send", { p_trial_id: id, p_coach_id: sub, p_to: to, p_remote_id: remoteId, p_http_status: http });
      if (error || typeof data !== "boolean") throw new Error("finish");
      return data;
    },
    async insertReceipt(r) {
      const { data, error } = await admin.from("qa_nolio_v2_trial_receipts").insert(r).select("id").single();
      return error || !data ? null : (data as { id: string }).id;
    },
  };
  const r = await runTrialAction({
    coachId: sub, athleteId, recipeCode: b.recipeCode, action: b.action, now: Date.now, store,
    loadConnection: () => loadV2ConnectionWithRefresh(admin as unknown as ConnectionStoreClient, { coachId: sub, athleteId },
      (grantId, generation, scopes) => refreshGrantToken({ grantId, generation, currentScopes: scopes, config: cfg, store: supabaseRefreshStore(admin), now: Date.now,
        fetch: async (u, i) => { const res = await fetch(u, i); return { status: res.status, json: () => res.json() }; } })),
    loadRecipient: async (athleteRef) => {
      // Relit l'association ACTUELLE (connexion active → grant) : la ref doit être celle du corps haché.
      const { data: cs, error: e1 } = await admin.from("nolio_v2_connections").select("grant_id,nolio_athlete_ref,status")
        .eq("coach_id", sub).eq("athlete_id", athleteId).eq("status", "active").limit(2);
      if (e1 || !Array.isArray(cs) || cs.length !== 1) return { ok: false, reason: "recipient_connection_unconfirmed" };
      const c = cs[0] as Record<string, unknown>;
      if (c.nolio_athlete_ref !== athleteRef || typeof c.grant_id !== "string") return { ok: false, reason: "recipient_association_changed" };
      const { data: g, error: e2 } = await admin.from("nolio_v2_oauth_grants").select("status,selected_athlete_ref,allowed_athletes")
        .eq("id", c.grant_id).eq("coach_id", sub).eq("athlete_id", athleteId).maybeSingle();
      if (e2 || !g) return { ok: false, reason: "recipient_grant_unconfirmed" };
      const gr = g as Record<string, unknown>;
      if (gr.status !== "active" || gr.selected_athlete_ref !== athleteRef || !Array.isArray(gr.allowed_athletes)) return { ok: false, reason: "recipient_grant_unconfirmed" };
      const hits = (gr.allowed_athletes as unknown[]).filter((x) => !!x && typeof x === "object" && (x as Record<string, unknown>).id === athleteRef);
      if (hits.length !== 1) return { ok: false, reason: "recipient_not_unique" };
      const h = hits[0] as Record<string, unknown>;
      if (typeof h.name !== "string" || h.has_api_access !== true) return { ok: false, reason: "recipient_name_unavailable" };
      return { ok: true, name: h.name };
    },
    http: (accessToken) => fetchNolioV2Http({ fetch: (u, i) => fetch(u, i), accessToken, timeoutMs: TRIAL_POST_BUDGET_MS }),
  });
  console.log(JSON.stringify({ fn: "nolio-v2-trial-session", action: b.action, status: r.status, code: r.code, http: r.httpStatus, verify: r.verify?.verdict ?? null, receipts: r.receiptIds.length }));
  return json(200, r);
});
