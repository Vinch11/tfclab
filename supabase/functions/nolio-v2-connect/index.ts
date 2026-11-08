/**
 * Nolio V2 — connexion du coach et liens athlètes (production).
 *
 * Actions (POST JSON) :
 * - status { athleteId? }                 état de la connexion + lien de l'athlète
 * - start {}                              URL d'autorisation Nolio (OAuth PKCE)
 * - refresh_athletes {}                   relit les athlètes gérés par le compte Nolio
 * - link { athleteId, nolioAthleteRef, sportIds? }  relie un athlète TFCLab à un athlète Nolio
 * - unlink { athleteId }                  supprime ce lien
 * - disconnect {}                         supprime l'autorisation et tous les liens
 *
 * getClaims + propriété de l'athlète (RLS) AVANT tout accès service-role.
 * Aucun jeton ni secret n'est jamais renvoyé.
 */
import { corsHeaders } from "../_shared/nolioV2/cors.ts";
import { authenticate, json, nativeFetch, ownsAthlete } from "../_shared/nolioV2/edgeAuth.ts";
import { appOriginFrom, fetchManagedAthletes, loadConfig, NOLIO_BASE, startConnect, type OAuthStore } from "../_shared/nolioV2/oauth.ts";
import { autoSportIds, readGrant, readLink, readyGrant, validateSportIds } from "../_shared/nolioV2/prodConnection.ts";
import { fetchRemoteRefs } from "../_shared/nolioV2/refs.ts";

const FIELDS: Record<string, string[]> = {
  status: ["action", "athleteId"], start: ["action"], refresh_athletes: ["action"],
  link: ["action", "athleteId", "nolioAthleteRef", "sportIds"], unlink: ["action", "athleteId"], disconnect: ["action"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { status: "REFUSED", reason: "method_not_allowed" });
  const caller = await authenticate(req);
  if (caller instanceof Response) return caller;
  let b: Record<string, unknown>;
  try { b = (await req.json()) ?? {}; } catch { return json(400, { status: "REFUSED", reason: "body_not_json" }); }
  const allowed = FIELDS[String(b.action)];
  if (!allowed) return json(400, { status: "REFUSED", reason: "action_invalid" });
  const extra = Object.keys(b).filter((k) => !allowed.includes(k));
  if (extra.length) return json(400, { status: "REFUSED", reason: `unknown_fields:${extra.join(",")}` });
  if (b.athleteId !== undefined || ["link", "unlink"].includes(String(b.action))) {
    const owns = await ownsAthlete(caller, b.athleteId);
    if (owns === "error") return json(502, { status: "REFUSED", reason: "athlete_read_failed" });
    if (!owns) return json(403, { status: "REFUSED", reason: "athlete_not_owned" });
  }
  const { admin, coachId } = caller;
  const env = {
    clientId: Deno.env.get("NOLIO_V2_CLIENT_ID"), clientSecret: Deno.env.get("NOLIO_V2_CLIENT_SECRET"),
    supabaseUrl: caller.supabaseUrl, appOrigin: Deno.env.get("NOLIO_V2_APP_ORIGIN"),
  };
  const config = loadConfig(env);

  if (b.action === "start") {
    const store: OAuthStore = {
      insertState: async (row) => !(await admin.from("nolio_v2_oauth_states").insert(row)).error,
      consumeState: async () => null, upsertGrant: async () => false,
    };
    return json(200, await startConnect({ coachId, env, store, now: Date.now() }));
  }

  if (b.action === "status") {
    const g = await readGrant(admin, coachId);
    if (g === "error") return json(502, { status: "REFUSED", reason: "grant_read_failed" });
    let link: Record<string, unknown> | null = null;
    if (typeof b.athleteId === "string") {
      const l = await readLink(admin, coachId, b.athleteId);
      if (l === "error") return json(502, { status: "REFUSED", reason: "link_read_failed" });
      if (l) link = {
        nolioAthleteRef: l.nolio_athlete_ref, nolioAthleteName: l.nolio_athlete_name, sportIds: l.sport_ids,
        sports: (l.remote_sports ?? []).map((s) => ({ sport: s.sport, name: s.name, usable: s.isActive && s.structuredEnabled, active: s.isActive })),
        refsLoadedAt: l.refs_loaded_at,
      };
    }
    return json(200, {
      status: "OK", configured: config.ok, appOrigin: appOriginFrom(env.appOrigin),
      connected: !!g, reconnectRequired: !!g && (g.refresh_state === "needs_reconnect" || g.refresh_state === "unknown"),
      nolioUserRef: g ? g.nolio_user_ref : null,
      athletes: g ? g.allowed_athletes : [],
      link,
    });
  }

  if (b.action === "disconnect") {
    const { error: e1 } = await admin.from("nolio_v2_athlete_links").delete().eq("coach_id", coachId);
    const { error: e2 } = await admin.from("nolio_v2_grants").delete().eq("coach_id", coachId);
    return json(200, e1 || e2 ? { status: "REFUSED", reason: "delete_failed" } : { status: "DISCONNECTED" });
  }

  if (b.action === "unlink") {
    const { error } = await admin.from("nolio_v2_athlete_links").delete().eq("coach_id", coachId).eq("athlete_id", b.athleteId);
    return json(200, error ? { status: "REFUSED", reason: "delete_failed" } : { status: "UNLINKED" });
  }

  // refresh_athletes / link : jeton requis.
  const ready = await readyGrant({ admin, coachId, config, fetch: nativeFetch });
  if (ready.ok === false) return json(200, { status: "REFUSED", reason: ready.reason });
  const grant = ready.grant;

  if (b.action === "refresh_athletes") {
    const get = async (path: string) => {
      const r = await fetch(`${NOLIO_BASE}${path}`, { method: "GET", redirect: "error", headers: { Authorization: `Bearer ${grant.access_token}`, Accept: "application/json" } });
      return r.status === 200 ? await r.json().catch(() => undefined) : undefined;
    };
    const athletes = await fetchManagedAthletes(get);
    if (!athletes) return json(200, { status: "UNKNOWN", reason: "athletes_unreadable" });
    const { error } = await admin.from("nolio_v2_grants").update({ allowed_athletes: athletes, updated_at: new Date().toISOString() }).eq("id", grant.id);
    return json(200, error ? { status: "REFUSED", reason: "store_failed" } : { status: "OK", athletes });
  }

  // link
  const ref = b.nolioAthleteRef;
  if (typeof ref !== "string" || !/^usr_[A-Za-z0-9]+$/.test(ref)) return json(400, { status: "REFUSED", reason: "nolio_athlete_ref_invalid" });
  const hit = grant.allowed_athletes.find((x) => x.id === ref);
  if (!hit) return json(200, { status: "REFUSED", reason: "athlete_not_managed_by_account" });
  if (!hit.has_api_access) return json(200, { status: "REFUSED", reason: "athlete_api_access_denied" });
  const got = await fetchRemoteRefs({ fetch: (u, i) => fetch(u, i), accessToken: grant.access_token, athleteRef: ref, scopes: grant.granted_scopes });
  if (got.ok === false) return json(200, { status: "UNKNOWN", reason: `sports_unreadable:${got.reason}` });
  let sportIds: Record<string, string>;
  if (b.sportIds === undefined || b.sportIds === null) sportIds = autoSportIds(got.refs.sports);
  else {
    const v = validateSportIds(got.refs.sports, b.sportIds);
    if (v.ok === false) return json(200, { status: "REFUSED", reason: v.reason });
    sportIds = v.sportIds;
  }
  const { error } = await admin.from("nolio_v2_athlete_links").upsert({
    coach_id: coachId, athlete_id: b.athleteId, grant_id: grant.id, nolio_athlete_ref: ref, nolio_athlete_name: hit.name,
    sport_ids: sportIds, remote_sports: got.refs.sports, refs_loaded_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: "coach_id,athlete_id" });
  if (error) return json(200, { status: "REFUSED", reason: "store_failed" });
  console.log(JSON.stringify({ fn: "nolio-v2-connect", action: "link", sports: Object.keys(sportIds) }));
  return json(200, {
    status: "LINKED", sportIds,
    sports: got.refs.sports.map((s) => ({ sport: s.sport, name: s.name, usable: s.isActive && s.structuredEnabled, active: s.isActive })),
  });
});
