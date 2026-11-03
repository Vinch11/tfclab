/**
 * Nolio V2 — dry_run QA d'UNE séance technique fixe. DRY-RUN ONLY : n'importe ni
 * sendPlannedV2 ni le ledger de création ; corps construit serveur, `dry_run:true` forcé.
 * Ordre : backend QA → getClaims → coach QA A/B → entrée {athleteId, fixtureCode} →
 * athlète possédé (client appelant, RLS) → service-role → connexion active V2 validée
 * (consentement, scopes, liaison, refresh sérialisé fail-closed) → POST dry_run → reçu.
 * Journaux : codes enum seulement (aucun jeton, id Nolio, URL ou corps fournisseur).
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { loadConfig, qaBackendOk, QA_COACHES } from "../_shared/nolioV2/oauth.ts";
import { loadV2ConnectionWithRefresh, type ConnectionStoreClient } from "../_shared/nolioV2/connectionStore.ts";
import { refreshGrantToken, supabaseRefreshStore } from "../_shared/nolioV2/tokenRefresh.ts";
import { runDryRunAction } from "../_shared/nolioV2/dryRunAction.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { status: "REFUSED", code: "method_not_allowed" });
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return json(500, { status: "REFUSED", code: "server_misconfigured" });
  if (!qaBackendOk(url)) return json(403, { status: "REFUSED", code: "backend_not_qa" });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json(401, { status: "REFUSED", code: "unauthorized" });
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.slice(7));
  const sub = claims?.claims?.sub;
  if (cErr || typeof sub !== "string" || !UUID.test(sub)) return json(401, { status: "REFUSED", code: "unauthorized" });
  if (!QA_COACHES.has(sub)) return json(403, { status: "REFUSED", code: "coach_not_qa" });

  let b: Record<string, unknown>;
  try { b = (await req.json()) ?? {}; } catch { return json(400, { status: "REFUSED", code: "body_not_json" }); }
  const extra = Object.keys(b).filter((k) => k !== "athleteId" && k !== "fixtureCode");
  if (extra.length) return json(400, { status: "REFUSED", code: `unknown_fields:${extra.join(",")}` });
  if (typeof b.athleteId !== "string" || !UUID.test(b.athleteId)) return json(400, { status: "REFUSED", code: "athlete_id_invalid" });
  const { data: ath, error: aErr } = await userClient.from("athletes").select("id").eq("id", b.athleteId).eq("coach_id", sub).maybeSingle();
  if (aErr) return json(502, { status: "REFUSED", code: "athlete_read_failed" });
  if (!ath) return json(403, { status: "REFUSED", code: "athlete_not_owned" });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return json(500, { status: "REFUSED", code: "server_misconfigured" });
  const admin = createClient(url, serviceKey); // seulement après getClaims + propriété
  const cfg = loadConfig({ clientId: Deno.env.get("NOLIO_V2_CLIENT_ID"), clientSecret: Deno.env.get("NOLIO_V2_CLIENT_SECRET"), supabaseUrl: url });
  const athleteId = b.athleteId;
  const r = await runDryRunAction({
    coachId: sub, athleteId, fixtureCode: b.fixtureCode, now: Date.now,
    loadConnection: () => loadV2ConnectionWithRefresh(admin as unknown as ConnectionStoreClient, { coachId: sub, athleteId },
      (grantId, generation, scopes) => refreshGrantToken({ grantId, generation, currentScopes: scopes, config: cfg, store: supabaseRefreshStore(admin), now: Date.now,
        fetch: async (u, i) => { const res = await fetch(u, i); return { status: res.status, json: () => res.json() }; } })),
    fetch: (u, i) => fetch(u, i),
    insertReceipt: async (row) => {
      const { data, error } = await admin.from("qa_nolio_v2_dry_run_receipts").insert(row).select("id").single();
      return error || !data ? null : (data as { id: string }).id;
    },
  });
  console.log(JSON.stringify({ fn: "nolio-v2-dry-run", status: r.status, code: r.code, http: r.httpStatus, receipt: r.receiptId ? "stored" : "none" }));
  return json(200, r);
});
