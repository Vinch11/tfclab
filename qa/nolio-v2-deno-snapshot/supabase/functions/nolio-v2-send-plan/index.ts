/**
 * Nolio V2 — envoi planifié d'une version de plan (QA). SÉPARÉ de V1
 * (`nolio-send-plan`, `nolio_tokens`, OAuth V1 : jamais utilisés ici).
 *
 * Ordre strict :
 * 1. Auth : getClaims sur le JWT appelant (verify_jwt ne suffit pas).
 * 2. Entrée validée (planVersionId UUID).
 * 3. Propriété : lecture de plan_versions PAR LE CLIENT DE L'APPELANT (RLS) +
 *    coach_id = sub ; athlète du plan appartenant au coach.
 * 4. Extraction + mapper V2 pur (même code que les tests).
 * 5. Service-role créé SEULEMENT ici ; lecture du magasin V2
 *    (`nolio_v2_connections`, lié au coach ET à l'athlète vérifiés). Vide /
 *    invalide / expiré ⇒ BLOCKED AVANT tout réseau Nolio.
 * Aucun dry_run, aucune requête Nolio authentifiée, aucun secret lu.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { mapPlanToNolioV2 } from "../_shared/nolioV2/plannedMapper.ts";
import { sendPlannedV2 } from "../_shared/nolioV2/plannedClient.ts";
import { loadV2ConnectionWithRefresh, type ConnectionStoreClient } from "../_shared/nolioV2/connectionStore.ts";
import { refreshGrantToken, supabaseRefreshStore } from "../_shared/nolioV2/tokenRefresh.ts";
import { loadConfig } from "../_shared/nolioV2/oauth.ts";
import { sessionsFromPlanJson } from "../_shared/nolioV2/planSessions.ts";
import { supabaseNolioV2Ledger } from "../_shared/nolioV2/ledgerSupabase.ts";
import { fetchNolioV2Http } from "../_shared/nolioV2/httpFetch.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { status: "REFUSED", reason: "method_not_allowed" });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json(401, { status: "REFUSED", reason: "unauthorized" });
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return json(500, { status: "REFUSED", reason: "server_misconfigured" });
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(auth.slice(7));
  const sub = claims?.claims?.sub;
  if (claimsErr || typeof sub !== "string" || !UUID.test(sub)) return json(401, { status: "REFUSED", reason: "unauthorized" });

  let body: unknown;
  try { body = await req.json(); } catch { return json(400, { status: "REFUSED", reason: "body_not_json" }); }
  const b = (body ?? {}) as Record<string, unknown>;
  const extra = Object.keys(b).filter((k) => k !== "planVersionId");
  if (extra.length) return json(400, { status: "REFUSED", reason: `unknown_fields:${extra.join(",")}` });
  if (typeof b.planVersionId !== "string" || !UUID.test(b.planVersionId)) return json(400, { status: "REFUSED", reason: "plan_version_id_invalid" });

  const { data: pv, error: pvErr } = await userClient.from("plan_versions")
    .select("id, coach_id, athlete_id, plan_json").eq("id", b.planVersionId).eq("coach_id", sub).maybeSingle();
  if (pvErr) return json(502, { status: "REFUSED", reason: "plan_read_failed" });
  if (!pv) return json(404, { status: "REFUSED", reason: "plan_version_not_found_or_not_owned" });
  const { data: ath, error: athErr } = await userClient.from("athletes").select("id").eq("id", pv.athlete_id).eq("coach_id", sub).maybeSingle();
  if (athErr) return json(502, { status: "REFUSED", reason: "athlete_read_failed" });
  if (!ath) return json(403, { status: "REFUSED", reason: "athlete_not_owned" });

  const extraction = sessionsFromPlanJson(pv.plan_json);
  if (extraction.problems.length) return json(422, { status: "REFUSED", reason: "plan_extraction_failed", problems: extraction.problems });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return json(500, { status: "REFUSED", reason: "server_misconfigured" });
  // Service-role créé SEULEMENT après getClaims + propriété plan/athlète vérifiées.
  const admin = createClient(url, serviceKey);
  const cfg = loadConfig({ clientId: Deno.env.get("NOLIO_V2_CLIENT_ID"), clientSecret: Deno.env.get("NOLIO_V2_CLIENT_SECRET"), supabaseUrl: url });
  const loaded = await loadV2ConnectionWithRefresh(admin as unknown as ConnectionStoreClient, { coachId: sub, athleteId: pv.athlete_id },
    (grantId, generation, scopes) => refreshGrantToken({ grantId, generation, currentScopes: scopes, config: cfg, store: supabaseRefreshStore(admin), now: Date.now,
      fetch: async (u, i) => { const res = await fetch(u, i); return { status: res.status, json: () => res.json() }; } }));
  if (!loaded.ok) {
    return json(200, {
      status: "BLOCKED", reason: loaded.reason, network: "none",
      planVersionId: pv.id, sessionsInPlan: extraction.sessions.filter((s) => !s.isRest).length,
    });
  }
  const conn = loaded.value;
  const mapped = mapPlanToNolioV2(extraction.sessions, conn.refs);
  if (mapped.refusals.length) return json(422, { status: "REFUSED", reason: "mapping_refused", refusals: mapped.refusals });
  const report = await sendPlannedV2({
    connection: conn.connection, refs: conn.refs, planVersionId: pv.id, operations: mapped.operations,
    ledger: supabaseNolioV2Ledger(admin, sub),
    http: fetchNolioV2Http({ fetch: (u, i) => fetch(u, i), accessToken: conn.accessToken }),
  });
  return json(200, report);
});
