/**
 * Nolio V2 — pré-remplissage du snapshot depuis les records (`metrics:read`).
 * SÉPARÉ de l'export planifié (nolio-v2-send-plan) : lecture SEULE, jamais
 * d'écriture ici et jamais vers Nolio. Même philosophie que l'import CSV
 * existant (NolioImporter) : cette fonction ne fait que proposer des
 * candidats ; le coach les revoit puis le formulaire de snapshot existant
 * (SnapshotManager) fait l'écriture, par le même chemin que toute saisie
 * manuelle — aucun nouveau chemin d'écriture n'est créé.
 *
 * Ordre strict, même discipline que les autres fonctions V2 :
 * 1. Auth : getClaims sur le JWT appelant.
 * 2. Entrée fermée : athleteId, from, to. Aucun autre champ.
 * 3. Propriété : `athletes` lu PAR LE CLIENT DE L'APPELANT (RLS) avant tout
 *    accès service-role.
 * 4. Service-role créé SEULEMENT ensuite ; connexion V2 liée coach+athlète,
 *    scope `metrics:read` vérifié explicitement (absent de
 *    NOLIO_V2_REQUIRED_SCOPES, qui ne couvre que l'export planifié).
 * 5. Au plus 4 requêtes Nolio (RECORDS_QUERY_PLAN), mapping pur. Un record
 *    Nolio n'est pas un test validé : chaque candidat garde sa date, son
 *    entraînement d'origine et sa source Nolio — jamais de confiance implicite.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/nolioV2/cors.ts";
import { loadAuthorizedV2Connection, type ConnectionStoreClient } from "../_shared/nolioV2/connectionStore.ts";
import { fetchNolioV2Records, RECORDS_QUERY_PLAN, type RawMetricsRecord } from "../_shared/nolioV2/recordsClient.ts";
import { mapRecordsToSnapshotCandidates } from "../_shared/nolioV2/recordsMapper.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED = new Set(["athleteId", "from", "to"]);
const MAX_RANGE_DAYS = 400;

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
  const extra = Object.keys(b).filter((k) => !ALLOWED.has(k));
  if (extra.length) return json(400, { status: "REFUSED", reason: `unknown_fields:${extra.join(",")}` });
  if (typeof b.athleteId !== "string" || !UUID.test(b.athleteId)) return json(400, { status: "REFUSED", reason: "athlete_id_invalid" });
  if (typeof b.from !== "string" || typeof b.to !== "string" || !DATE.test(b.from) || !DATE.test(b.to) || b.from > b.to) {
    return json(400, { status: "REFUSED", reason: "date_range_invalid" });
  }
  const spanDays = (Date.parse(b.to) - Date.parse(b.from)) / 86_400_000;
  if (spanDays > MAX_RANGE_DAYS) return json(400, { status: "REFUSED", reason: "date_range_too_wide" });

  const { data: ath, error: athErr } = await userClient.from("athletes").select("id, coach_id").eq("id", b.athleteId).eq("coach_id", sub).maybeSingle();
  if (athErr) return json(502, { status: "REFUSED", reason: "athlete_read_failed" });
  if (!ath) return json(403, { status: "REFUSED", reason: "athlete_not_owned" });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return json(500, { status: "REFUSED", reason: "server_misconfigured" });
  const admin = createClient(url, serviceKey);

  const loaded = await loadAuthorizedV2Connection(admin as unknown as ConnectionStoreClient, { coachId: sub, athleteId: b.athleteId });
  if (!loaded.ok) return json(200, { status: "BLOCKED", reason: loaded.reason });
  if (!loaded.value.connection.grantedScopes.includes("metrics:read")) {
    return json(200, { status: "BLOCKED", reason: "metrics_scope_missing" });
  }

  const client = fetchNolioV2Records({ fetch, accessToken: loaded.value.accessToken });
  const sports = Object.values(loaded.value.refs.sportIds);
  const all: RawMetricsRecord[] = [];
  const queryErrors: string[] = [];
  for (const q of RECORDS_QUERY_PLAN) {
    const r = await client.list({ athlete: loaded.value.refs.athleteId, cat: q.cat, recordType: q.recordType, from: b.from, to: b.to, sports: sports.length ? sports : undefined });
    if (!r.ok) { queryErrors.push(`${q.cat}/${q.recordType}:${r.detail}`); continue; }
    all.push(...r.page.data);
  }
  if (!all.length && queryErrors.length === RECORDS_QUERY_PLAN.length) {
    return json(200, { status: "BLOCKED", reason: "all_queries_failed", detail: queryErrors });
  }

  const { data: snap } = await admin.from("snapshots").select("ftp").eq("athlete_id", b.athleteId).order("date", { ascending: false }).limit(1).maybeSingle();
  const knownFtp = Number((snap as { ftp?: number } | null)?.ftp);
  const { candidates, warnings } = mapRecordsToSnapshotCandidates(all, { knownFtp: Number.isFinite(knownFtp) && knownFtp > 0 ? knownFtp : null });

  return json(200, { status: "PREVIEW", candidates, warnings, queryErrors, recordsFetched: all.length });
});
