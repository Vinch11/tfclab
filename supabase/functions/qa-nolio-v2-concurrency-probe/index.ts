/**
 * QA UNIQUEMENT (projet lkjesdacgpolrwfxulbo) — preuve de concurrence RÉELLE
 * de la RPC `nolio_v2_claim_operation`. Aucun appel Nolio.
 * Gardes : projet QA, getClaims, UID Coach A/B QA, propriété du plan via le
 * client de l'appelant (RLS) AVANT création du client service-role.
 * Deux requêtes PostgREST indépendantes (Promise.all) appellent l'enveloppe
 * `qa_nolio_v2_concurrent_claim_probe` qui lit l'état, attend, appelle la
 * vraie RPC puis tient sa transaction ; pid/horodatages renvoyés. La ligne
 * réservée est fermée sending→rejected via la vraie RPC de transition.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const QA_REF = "lkjesdacgpolrwfxulbo";
const QA_COACHES = new Set(["573e045a-bbea-4e37-a30f-33183b9fbe13", "6b4c1722-2105-4889-ab14-41bab798cdf7"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon || !url.includes(QA_REF)) return json(403, { error: "qa_project_only" });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: claims, error } = await userClient.auth.getClaims(auth.slice(7));
  const sub = claims?.claims?.sub;
  if (error || typeof sub !== "string" || !QA_COACHES.has(sub)) return json(403, { error: "qa_coach_only" });
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json(400, { error: "body_not_json" }); }
  if (typeof b.planVersionId !== "string" || !UUID.test(b.planVersionId)) return json(400, { error: "plan_version_id_invalid" });
  const holdMs = typeof b.holdMs === "number" ? Math.round(b.holdMs) : 2000;
  if (holdMs < 100 || holdMs > 5000) return json(400, { error: "hold_out_of_range" });
  const { data: pv, error: pvErr } = await userClient.from("plan_versions").select("id").eq("id", b.planVersionId).eq("coach_id", sub).maybeSingle();
  if (pvErr || !pv) return json(403, { error: "plan_not_owned" });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return json(500, { error: "server_misconfigured" });
  const mk = () => createClient(url, serviceKey, { auth: { persistSession: false } });
  const nonce = crypto.randomUUID();
  const sessionKey = `__qa_concurrency_probe_${nonce}`;
  const path = "/api/v2/planned/trainings/";
  const payloadSha256 = await sha256Hex(`qa-probe-payload|${nonce}`);
  const opKey = await sha256Hex(`qa-probe-op|${nonce}`);
  const args = { p_op_key: opKey, p_coach_id: sub, p_plan_version_id: pv.id, p_session_key: sessionKey, p_path: path,
    p_athlete_ref: "usr_QAPROBE", p_payload_sha256: payloadSha256, p_hold_ms: holdMs };
  const call = async (label: string) => {
    const t = Date.now();
    const { data, error } = await mk().rpc("qa_nolio_v2_concurrent_claim_probe", args);
    return { label, httpStartMs: t, httpEndMs: Date.now(), error: error?.message ?? null, result: data };
  };
  const calls = await Promise.all([call("A"), call("B")]);
  const admin = mk();
  const { data: closed, error: closeErr } = await admin.rpc("nolio_v2_transition_operation", {
    p_op_key: opKey, p_coach_id: sub, p_from: "sending", p_to: "rejected", p_remote_id: null, p_detail: "QA_CONCURRENCY_PROBE_NO_NOLIO",
  });
  const { data: rows } = await admin.from("nolio_v2_operations").select("op_key, session_key, state, remote_id, detail").eq("session_key", sessionKey);
  return json(200, { sessionKey, opKeyPrefix: opKey.slice(0, 12), holdMs, calls, closedToRejected: closed ?? null, closeError: closeErr?.message ?? null, rowsForProbe: rows, nolioNetwork: "none" });
});
