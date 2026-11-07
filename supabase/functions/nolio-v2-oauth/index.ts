/**
 * Nolio V2 OAuth QA — start / status / select. getClaims + coach QA A/B +
 * athlète possédé (client de l'appelant, RLS) AVANT tout client service-role.
 * Ne renvoie jamais de jeton ni de secret. nolio_v2_connections n'est écrite que par les RPC
 * service-role d'activation / de mise à jour des seules correspondances (update_refs).
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { activateConnectionAction, updateActiveRefsAction, connectionStatus, loadConfig, loadRemoteRefsAction, qaBackendOk, QA_COACHES, selectAthlete, startConnect } from "../_shared/nolioV2/oauth.ts";
import { refreshGrantToken, supabaseRefreshStore } from "../_shared/nolioV2/tokenRefresh.ts";
import { fetchRemoteRefs } from "../_shared/nolioV2/refs.ts";
import { supabaseOAuthStore } from "../_shared/nolioV2/oauthStoreSupabase.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELDS: Record<string, string[]> = { start: ["action", "athleteId"], status: ["action", "athleteId"], select: ["action", "athleteId", "nolioAthleteRef", "consent"],
  load_refs: ["action", "athleteId"],
  activate: ["action", "athleteId", "consent", "refsDigest", "sportIds", "exerciseIds", "calendarTimeZone"],
  update_refs: ["action", "athleteId", "consent", "refsDigest", "currentRefsSha", "sportIds", "exerciseIds", "calendarTimeZone", "competition"] };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { status: "REFUSED", reason: "method_not_allowed" });
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return json(500, { status: "REFUSED", reason: "server_misconfigured" });
  if (!qaBackendOk(url)) return json(403, { status: "REFUSED", reason: "backend_not_qa" });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json(401, { status: "REFUSED", reason: "unauthorized" });
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.slice(7));
  const sub = claims?.claims?.sub;
  if (cErr || typeof sub !== "string" || !UUID.test(sub)) return json(401, { status: "REFUSED", reason: "unauthorized" });
  if (!QA_COACHES.has(sub)) return json(403, { status: "REFUSED", reason: "coach_not_qa" });

  let b: Record<string, unknown>;
  try { b = (await req.json()) ?? {}; } catch { return json(400, { status: "REFUSED", reason: "body_not_json" }); }
  const allowed = FIELDS[String(b.action)];
  if (!allowed) return json(400, { status: "REFUSED", reason: "action_invalid" });
  const extra = Object.keys(b).filter((k) => !allowed.includes(k));
  if (extra.length) return json(400, { status: "REFUSED", reason: `unknown_fields:${extra.join(",")}` });
  if (typeof b.athleteId !== "string" || !UUID.test(b.athleteId)) return json(400, { status: "REFUSED", reason: "athlete_id_invalid" });
  const { data: ath, error: aErr } = await userClient.from("athletes").select("id").eq("id", b.athleteId).eq("coach_id", sub).maybeSingle();
  if (aErr) return json(502, { status: "REFUSED", reason: "athlete_read_failed" });
  if (!ath) return json(403, { status: "REFUSED", reason: "athlete_not_owned" });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return json(500, { status: "REFUSED", reason: "server_misconfigured" });
  const admin = createClient(url, serviceKey);
  const store = supabaseOAuthStore(admin);
  const env = { clientId: Deno.env.get("NOLIO_V2_CLIENT_ID"), clientSecret: Deno.env.get("NOLIO_V2_CLIENT_SECRET"), supabaseUrl: url };
  const now = Date.now();
  if (b.action === "start") return json(200, await startConnect({ coachId: sub, athleteId: b.athleteId, env, store, now }));
  if (b.action === "status") return json(200, await connectionStatus({ coachId: sub, athleteId: b.athleteId, env, store, now }));
  if (b.action === "load_refs") {
    const t0 = Date.now();
    const cfg = loadConfig(env);
    const f = async (u: string, i: { method: string; headers: Record<string, string>; body?: string; redirect: "error" }) => { const res = await fetch(u, i); return { status: res.status, json: () => res.json() }; };
    const r = await loadRemoteRefsAction({ coachId: sub, athleteId: b.athleteId, store, now: Date.now,
      refresh: (grantId, generation, scopes) => refreshGrantToken({ grantId, generation, currentScopes: scopes, config: cfg, store: supabaseRefreshStore(admin), fetch: f, now: Date.now }),
      fetchRefs: (accessToken, athleteRef, scopes) => fetchRemoteRefs({ fetch: (u, i) => fetch(u, i), accessToken, athleteRef, scopes }) });
    console.log(JSON.stringify({ fn: "nolio-v2-oauth", action: "load_refs", status: r.status, reason: "reason" in r ? r.reason : null, exercises: "exercises" in r ? r.exercises : null, ms: Date.now() - t0 }));
    return json(200, r);
  }
  if (b.action === "activate") return json(200, await activateConnectionAction({ coachId: sub, athleteId: b.athleteId, store, now,
    consent: b.consent, refsDigest: b.refsDigest, sportIds: b.sportIds, exerciseIds: b.exerciseIds, calendarTimeZone: b.calendarTimeZone }));
  if (b.action === "update_refs") {
    const r = await updateActiveRefsAction({ coachId: sub, athleteId: b.athleteId, store, now, consent: b.consent, refsDigest: b.refsDigest, currentRefsSha: b.currentRefsSha,
      sportIds: b.sportIds, exerciseIds: b.exerciseIds, calendarTimeZone: b.calendarTimeZone, competition: b.competition });
    console.log(JSON.stringify({ fn: "nolio-v2-oauth", action: "update_refs", status: r.status, reason: "reason" in r ? r.reason : null }));
    return json(200, r);
  }
  return json(200, await selectAthlete({ coachId: sub, athleteId: b.athleteId, nolioAthleteRef: b.nolioAthleteRef, consent: b.consent, store, now }));
});
