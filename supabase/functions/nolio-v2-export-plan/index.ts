/**
 * Nolio V2 — export d'un plan sauvegardé (IA ou DET) vers le calendrier Nolio.
 *
 * Actions (POST JSON) :
 * - prepare { planVersionId }  couverture séance par séance, aucun appel Nolio
 * - send    { planVersionId }  un lot : simulation Nolio puis création ; le
 *                              navigateur rappelle tant que status = PROGRESS
 * - verify  { planVersionId, fromIndex }  relit dans Nolio les activités déjà
 *                              créées (404 = supprimée, autre échec = inconnu)
 * - recreate_missing { planVersionId, opKey, remoteId } restaure une seule
 *   opération après une nouvelle lecture 404 et une simulation réussie.
 *
 * Ordre : getClaims → plan_versions lu avec le client de l'appelant (RLS, coach
 * propriétaire) → lien athlète + autorisation Nolio (service-role) → envoi.
 * Une opération déjà confirmée n'est jamais recréée ; une opération incertaine
 * n'est jamais renvoyée automatiquement (journal `nolio_v2_operations`).
 */
import { corsHeaders } from "../_shared/nolioV2/cors.ts";
import { authenticate, json, nativeFetch, UUID } from "../_shared/nolioV2/edgeAuth.ts";
import { loadConfig } from "../_shared/nolioV2/oauth.ts";
import { confirmedOpKeys, connectionFromGrant, readLink, readyGrant, refsFromLink } from "../_shared/nolioV2/prodConnection.ts";
import { confirmedRowsForPlan, recreateMissingOperation, prepareExport, sendExportBatch, verifyConfirmedBatch, type LedgerRow } from "../_shared/nolioV2/exportPlan.ts";
import { fetchNolioV2Http } from "../_shared/nolioV2/httpFetch.ts";
import { supabaseNolioV2Ledger } from "../_shared/nolioV2/ledgerSupabase.ts";

const BATCH = 6;
const REQUEST_BUDGET_MS = 55_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { status: "REFUSED", reason: "method_not_allowed" });
  const started = Date.now();
  const caller = await authenticate(req);
  if (caller instanceof Response) return caller;
  let b: Record<string, unknown>;
  try { b = (await req.json()) ?? {}; } catch { return json(400, { status: "REFUSED", reason: "body_not_json" }); }
  if (!["prepare", "send", "verify", "recreate_missing"].includes(String(b.action))) return json(400, { status: "REFUSED", reason: "action_invalid" });
  const extra = Object.keys(b).filter((k) => !["action", "planVersionId", ...(b.action === "verify" ? ["fromIndex"] : b.action === "recreate_missing" ? ["opKey", "remoteId"] : [])].includes(k));
  if (extra.length) return json(400, { status: "REFUSED", reason: `unknown_fields:${extra.join(",")}` });
  if (typeof b.planVersionId !== "string" || !UUID.test(b.planVersionId)) return json(400, { status: "REFUSED", reason: "plan_version_id_invalid" });
  const planVersionId = b.planVersionId;

  // Plan possédé (RLS + coach explicite).
  const { data: version, error: vErr } = await caller.user.from("plan_versions").select("id,athlete_id,coach_id,plan_json").eq("id", planVersionId).eq("coach_id", caller.coachId).maybeSingle();
  if (vErr) return json(502, { status: "REFUSED", reason: "plan_read_failed" });
  if (!version) return json(403, { status: "REFUSED", reason: "plan_not_owned" });

  const { admin, coachId } = caller;
  const link = await readLink(admin, coachId, version.athlete_id);
  if (link === "error") return json(502, { status: "REFUSED", reason: "link_read_failed" });
  if (!link) return json(200, { status: "REFUSED", reason: "athlete_not_linked" });
  const refs = refsFromLink(link);
  const prepared = await prepareExport(version.plan_json, refs, planVersionId);
  const rest = prepared.rows.filter((r) => r.status === "excluded_rest").length;
  const counts = {
    total: prepared.rows.length,
    /** Séances à faire figurer dans Nolio (hors repos), refusées comprises. */
    expected: prepared.rows.length - rest,
    operations: prepared.ops.length,
    rest,
    refused: prepared.rows.filter((r) => r.status === "refused").length,
  };
  const refusedRows = prepared.rows.filter((r) => r.status === "refused").slice(0, 60).map((r) => ({ sessionKey: r.sessionKey, date: r.date, title: r.title, sport: r.sport, reason: r.reason }));

  if (b.action === "prepare") {
    const confirmed = await confirmedOpKeys(admin, coachId, planVersionId);
    return json(200, {
      status: "PREPARED", engine: prepared.engine, nolioAthleteName: link.nolio_athlete_name, counts, problems: prepared.problems, refused: refusedRows,
      alreadySent: confirmed ? prepared.ops.filter((o) => confirmed.has(o.opKey)).length : null,
      firstDate: prepared.ops.map((o) => o.date).sort()[0] ?? null, lastDate: prepared.ops.map((o) => o.date).sort().at(-1) ?? null,
    });
  }

  if (b.action === "send" && !prepared.ops.length) return json(200, { status: "REFUSED", reason: "nothing_to_send", counts, refused: refusedRows });
  const config = loadConfig({ clientId: Deno.env.get("NOLIO_V2_CLIENT_ID"), clientSecret: Deno.env.get("NOLIO_V2_CLIENT_SECRET"), supabaseUrl: caller.supabaseUrl });
  const ready = await readyGrant({ admin, coachId, config, fetch: nativeFetch });
  if (ready.ok === false) return json(200, { status: "REFUSED", reason: ready.reason });
  if (ready.grant.id !== link.grant_id) return json(200, { status: "REFUSED", reason: "athlete_link_from_previous_connection_relink" });
  const deadline = started + REQUEST_BUDGET_MS;
  const accessToken = ready.grant.access_token;

  if (b.action === "verify" || b.action === "recreate_missing") {
    const { data: ledgerRows, error: lErr } = await admin.from("nolio_v2_operations").select("op_key,session_key,path,state,remote_id").eq("coach_id", coachId).eq("plan_version_id", planVersionId);
    if (lErr || !Array.isArray(ledgerRows)) return json(502, { status: "REFUSED", reason: "ledger_read_failed" });
    const confirmedRows = confirmedRowsForPlan(prepared, ledgerRows as LedgerRow[]);
    const http = fetchNolioV2Http({ fetch: (u, i) => fetch(u, i), accessToken, deadline });
    if (b.action === "verify") {
      const fromIndex = typeof b.fromIndex === "number" && Number.isInteger(b.fromIndex) && b.fromIndex >= 0 ? b.fromIndex : 0;
      const v = await verifyConfirmedBatch({ prepared, confirmed: confirmedRows, http, athleteRef: refs.athleteId, fromIndex, deadline });
      console.log(JSON.stringify({ fn: "nolio-v2-export-plan", action: "verify", checked: v.checked, present: v.present, missing: v.missing.length, unknown: v.unknown.length }));
      return json(200, { status: "VERIFIED", ...v, counts, refused: refusedRows });
    }
    if (typeof b.opKey !== "string" || typeof b.remoteId !== "string") {
      return json(400, { status: "REFUSED", reason: "recreation_target_required" });
    }
    const result = await recreateMissingOperation({
      prepared, planVersionId, refs, connection: connectionFromGrant(ready.grant), http,
      ledger: supabaseNolioV2Ledger(admin, coachId), dryFetch: (url, init) => fetch(url, init),
      accessToken, confirmedKeys: new Set(), batchSize: 1, deadline,
    }, { opKey: b.opKey, remoteId: b.remoteId }, confirmedRows, async row => {
      const { data, error } = await admin.rpc("nolio_v2_release_deleted_operation", {
        p_op_key: row.op_key, p_coach_id: coachId, p_remote_id: row.remote_id,
      });
      return !error && data === true;
    });
    return json(200, result);
  }

  const confirmed = await confirmedOpKeys(admin, coachId, planVersionId);
  if (!confirmed) return json(502, { status: "REFUSED", reason: "ledger_read_failed" });
  const result = await sendExportBatch({
    prepared, planVersionId, refs, connection: connectionFromGrant(ready.grant),
    http: fetchNolioV2Http({ fetch: (u, i) => fetch(u, i), accessToken, deadline }),
    ledger: supabaseNolioV2Ledger(admin, coachId),
    dryFetch: (u, i) => fetch(u, i), accessToken, confirmedKeys: confirmed, batchSize: BATCH, deadline,
  });
  console.log(JSON.stringify({ fn: "nolio-v2-export-plan", engine: prepared.engine, status: result.status, reason: result.reason, confirmed: result.confirmed, total: result.total, ms: Date.now() - started }));
  return json(200, { ...result, counts, refused: refusedRows });
});
