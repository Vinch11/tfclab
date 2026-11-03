/**
 * Nolio V2 OAuth QA — start / status / select. getClaims + coach QA A/B +
 * athlète possédé (client de l'appelant, RLS) AVANT tout client service-role.
 * Ne renvoie jamais de jeton ni de secret ; n'écrit jamais nolio_v2_connections.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { connectionStatus, qaBackendOk, QA_COACHES, selectAthlete, startConnect } from "../_shared/nolioV2/oauth.ts";
import { supabaseOAuthStore } from "../_shared/nolioV2/oauthStoreSupabase.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELDS: Record<string, string[]> = { start: ["action", "athleteId"], status: ["action", "athleteId"], select: ["action", "athleteId", "nolioAthleteRef", "consent"] };

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
  const store = supabaseOAuthStore(createClient(url, serviceKey));
  const env = { clientId: Deno.env.get("NOLIO_V2_CLIENT_ID"), clientSecret: Deno.env.get("NOLIO_V2_CLIENT_SECRET"), supabaseUrl: url };
  const now = Date.now();
  if (b.action === "start") return json(200, await startConnect({ coachId: sub, athleteId: b.athleteId, env, store, now }));
  if (b.action === "status") return json(200, await connectionStatus({ coachId: sub, athleteId: b.athleteId, env, store, now }));
  return json(200, await selectAthlete({ coachId: sub, athleteId: b.athleteId, nolioAthleteRef: b.nolioAthleteRef, consent: b.consent, store, now }));
});
