import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { refreshGrantToken, type RefreshStore } from "../../../../supabase/functions/_shared/nolioV2/tokenRefresh";
import { fetchRemoteRefs, validateActivationRefs, type RemoteRefs } from "../../../../supabase/functions/_shared/nolioV2/refs";
import { activateConnectionAction, connectionStatus, loadRemoteRefsAction, type GrantRow, type OAuthStore, type Fetch } from "../../../../supabase/functions/_shared/nolioV2/oauth";
import { loadV2ConnectionWithRefresh, type ConnectionStoreClient } from "../../../../supabase/functions/_shared/nolioV2/connectionStore";
import type { FetchLike } from "../../../../supabase/functions/_shared/nolioV2/httpFetch";

const A = "573e045a-bbea-4e37-a30f-33183b9fbe13", B = "6b4c1722-2105-4889-ab14-41bab798cdf7";
const ATH = "c155204f-43e2-4367-9b66-6d068ef89212";
const GID = "11111111-1111-4111-8111-111111111111";
const CFG = { ok: true as const, value: { clientId: "cid", clientSecret: "SECRET_xyz", callbackUrl: "https://x/cb" } };
const T0 = Date.parse("2026-11-03T12:00:00Z");
const SCOPES = ["planned:read", "planned:write", "library:read"];

/** Émulation fidèle des RPC durables (FOR UPDATE ⇒ sections synchrones). */
function rpcDb(init?: Partial<{ refresh: string | null; gen: number; sameAccount: number }>) {
  const g = { refresh: init?.refresh === undefined ? "RT_old_0000" : init.refresh, access: "AT_old_0000", gen: init?.gen ?? 1, state: "idle", lock: null as string | null, until: 0, expires: T0 + 5 * 60_000, scopes: [...SCOPES] };
  const conns = [{ grant_id: GID, access: g.access, gen: g.gen, status: "active" }];
  let now = T0;
  const store: RefreshStore = {
    async begin(_id, gen, lockId, lease) {
      if ((init?.sameAccount ?? 1) !== 1) return { ok: false, reason: "account_ambiguous" };
      if (g.state === "refreshing") { if (g.until <= now) { g.state = "unknown"; g.until = 0; return { ok: false, reason: "refresh_unknown" }; } return { ok: false, reason: "refresh_in_progress" }; }
      if (g.state === "needs_reconnect") return { ok: false, reason: "needs_reconnect" };
      if (g.state === "unknown") return { ok: false, reason: "refresh_unknown" };
      if (g.gen !== gen) return { ok: false, reason: "stale_generation" };
      if (!g.refresh) return { ok: false, reason: "needs_reconnect" };
      Object.assign(g, { state: "refreshing", lock: lockId, until: now + lease * 1000 });
      return { ok: true, refreshToken: g.refresh, generation: g.gen };
    },
    async commit(_id, lockId, gen, access, refresh, exp, scopes) {
      if (g.lock !== lockId || g.gen !== gen || !["refreshing", "unknown"].includes(g.state)) return { ok: false, reason: "fenced" };
      Object.assign(g, { access, refresh, expires: Date.parse(exp), scopes, gen: g.gen + 1, state: "idle", lock: null, until: 0 });
      for (const c of conns) if (c.grant_id === GID && c.status === "active") Object.assign(c, { access, gen: g.gen });
      return { ok: true, generation: g.gen };
    },
    async fail(_id, lockId, outcome) {
      if (g.lock !== lockId || g.state !== "refreshing") return false;
      g.state = outcome === "released_not_sent" ? "idle" : outcome; if (outcome !== "unknown") g.lock = null; g.until = 0; return true;
    },
  };
  const reconnect = () => Object.assign(g, { gen: g.gen + 1, state: "idle", lock: null, refresh: "RT_reconnected", access: "AT_reconnected" });
  return { g, conns, store, reconnect, advance: (ms: number) => { now += ms; }, now: () => now };
}
function tokenFetch(resp: () => Promise<{ status: number; json(): Promise<unknown> }>) {
  const calls: string[] = [];
  const f: Fetch = async (url, init) => { calls.push(`${init.method} ${url} ${init.body ?? ""}`); return resp(); };
  return { f, calls };
}
const ok200 = (rt = "RT_new_1111") => async () => ({ status: 200, json: async () => ({ access_token: "AT_new_1111", refresh_token: rt, token_type: "Bearer", expires_in: 86400 }) });

describe("rafraîchissement sérialisé durable", () => {
  it("deux appels concurrents ⇒ UNE seule requête sortante, l'autre IN_PROGRESS ; connexions liées mises à jour", async () => {
    const db = rpcDb();
    let release!: () => void; const gate = new Promise<void>((r) => { release = r; });
    const { f, calls } = tokenFetch(async () => { await gate; return ok200()(); });
    const p1 = refreshGrantToken({ grantId: GID, generation: 1, currentScopes: SCOPES, config: CFG, store: db.store, fetch: f, now: db.now });
    const p2 = refreshGrantToken({ grantId: GID, generation: 1, currentScopes: SCOPES, config: CFG, store: db.store, fetch: f, now: db.now });
    await new Promise((r) => setTimeout(r, 0)); release();
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(calls.length).toBe(1);
    expect(calls[0]).toContain("grant_type=refresh_token");
    expect([r1.status, r2.status].sort()).toEqual(["IN_PROGRESS", "REFRESHED"]);
    expect(db.g.gen).toBe(2); expect(db.g.refresh).toBe("RT_new_1111");
    expect(db.conns[0]).toMatchObject({ access: "AT_new_1111", gen: 2 });
  });
  it("réponse perdue après commit fournisseur ⇒ UNKNOWN, aucun nouvel essai, même après bail expiré", async () => {
    const db = rpcDb();
    const { f, calls } = tokenFetch(async () => { throw new Error("socket closed"); });
    expect((await refreshGrantToken({ grantId: GID, generation: 1, currentScopes: SCOPES, config: CFG, store: db.store, fetch: f, now: db.now })).status).toBe("UNKNOWN");
    db.advance(5 * 60_000);
    expect((await refreshGrantToken({ grantId: GID, generation: 1, currentScopes: SCOPES, config: CFG, store: db.store, fetch: f, now: db.now })).status).toBe("UNKNOWN");
    expect(calls.length).toBe(1); expect(db.g.refresh).toBe("RT_old_0000");
  });
  it("processus mort en cours (état refreshing) : bail expiré ⇒ unknown, jamais une 2e requête", async () => {
    const db = rpcDb();
    await db.store.begin(GID, 1, "dead-lock", 30); // instance crashée après begin
    db.advance(31_000);
    const { f, calls } = tokenFetch(ok200());
    const r = await refreshGrantToken({ grantId: GID, generation: 1, currentScopes: SCOPES, config: CFG, store: db.store, fetch: f, now: db.now });
    expect(r.status).toBe("UNKNOWN"); expect(calls.length).toBe(0); expect(db.g.state).toBe("unknown");
  });
  it("invalid_grant ⇒ NEEDS_RECONNECT ; 5xx / 429 / sans refresh_token ⇒ UNKNOWN", async () => {
    for (const [resp, want] of [
      [async () => ({ status: 400, json: async () => ({ error: "invalid_grant" }) }), "NEEDS_RECONNECT"],
      [async () => ({ status: 503, json: async () => ({}) }), "UNKNOWN"],
      [async () => ({ status: 429, json: async () => ({}) }), "UNKNOWN"],
      [async () => ({ status: 200, json: async () => ({ access_token: "AT_new_1111", expires_in: 86400 }) }), "UNKNOWN"],
    ] as const) {
      const db = rpcDb(); const { f } = tokenFetch(resp);
      expect((await refreshGrantToken({ grantId: GID, generation: 1, currentScopes: SCOPES, config: CFG, store: db.store, fetch: f, now: db.now })).status).toBe(want);
    }
  });
  it("reconnexion pendant le refresh ⇒ commit fencé (SUPERSEDED), jetons de reconnexion conservés", async () => {
    const db = rpcDb();
    const { f } = tokenFetch(async () => { db.reconnect(); return ok200()(); });
    const r = await refreshGrantToken({ grantId: GID, generation: 1, currentScopes: SCOPES, config: CFG, store: db.store, fetch: f, now: db.now });
    expect(r.status).toBe("SUPERSEDED"); expect(db.g.refresh).toBe("RT_reconnected"); expect(db.g.gen).toBe(2);
  });
  it("génération périmée ⇒ SUPERSEDED sans réseau ; comptes ambigus ⇒ AMBIGUOUS sans réseau ; config absente ⇒ BLOCKED", async () => {
    const { f, calls } = tokenFetch(ok200());
    expect((await refreshGrantToken({ grantId: GID, generation: 0, currentScopes: SCOPES, config: CFG, store: rpcDb().store, fetch: f, now: () => T0 })).status).toBe("SUPERSEDED");
    expect((await refreshGrantToken({ grantId: GID, generation: 1, currentScopes: SCOPES, config: CFG, store: rpcDb({ sameAccount: 2 }).store, fetch: f, now: () => T0 })).status).toBe("AMBIGUOUS");
    expect((await refreshGrantToken({ grantId: GID, generation: 1, currentScopes: SCOPES, config: { ok: false, reason: "missing_config" }, store: rpcDb().store, fetch: f, now: () => T0 })).status).toBe("BLOCKED");
    expect(calls.length).toBe(0);
  });
  it("scopes réduits par le refresh ⇒ NEEDS_RECONNECT ; aucune valeur de jeton dans le résultat", async () => {
    const db = rpcDb();
    const { f } = tokenFetch(async () => ({ status: 200, json: async () => ({ access_token: "AT_new_1111", refresh_token: "RT_new_1111", scope: "planned:read", expires_in: 86400 }) }));
    const r = await refreshGrantToken({ grantId: GID, generation: 1, currentScopes: SCOPES, config: CFG, store: db.store, fetch: f, now: db.now });
    expect(r.status).toBe("NEEDS_RECONNECT");
    expect(JSON.stringify(r)).not.toMatch(/AT_|RT_|SECRET/);
  });
});

// ---------------- Références ----------------
const sportPage = (data: unknown[], has_more = false) => ({ data, has_more });
const S1 = { id: "spu_1", sport: "spt_RUN", name: "Course", is_active: true, is_structured_workout_enabled: true, color: null };
const S2 = { id: "spu_2", sport: "spt_OFF", name: "Off", is_active: false, is_structured_workout_enabled: true };
function refsFetch(routes: Record<string, unknown[]>) {
  const calls: string[] = []; const idx: Record<string, number> = {};
  const f: FetchLike = async (url) => {
    calls.push(url); const path = new URL(url).pathname; const i = idx[path] = (idx[path] ?? 0);
    idx[path]++; const r = routes[path]?.[i];
    if (r === undefined) return { status: 404, text: async () => "{}" };
    if (r === "403") return { status: 403, text: async () => "{}" };
    return { status: 200, text: async () => JSON.stringify(r) };
  };
  return { f, calls };
}

describe("lecture des sports / exercices", () => {
  it("pagination complète par starting_after ; sport inactif lu mais non associable", async () => {
    const { f, calls } = refsFetch({ "/api/v2/settings/sports/": [sportPage([S1], true), sportPage([S2])], "/api/v2/library/exercises/": [{ data: [{ id: "exf_SQ", name: "Squat", type: "rep", scope: "nolio", names: {} }], has_more: false }] });
    const r = await fetchRemoteRefs({ fetch: f, accessToken: "AT", athleteRef: "usr_T1", scopes: SCOPES });
    expect(r.ok).toBe(true);
    expect(calls[0]).toContain("athlete=usr_T1"); expect(calls[1]).toContain("starting_after=spu_1");
    if (r.ok) { expect(r.refs.sports.length).toBe(2); expect(r.refs.exercises.status).toBe("loaded"); }
  });
  it("page partielle / 403 / schéma hors contrat ⇒ inconnu, jamais une liste vide", async () => {
    expect((await fetchRemoteRefs({ fetch: refsFetch({ "/api/v2/settings/sports/": [sportPage([S1], true), "403"] }).f, accessToken: "AT", athleteRef: "usr_T1", scopes: SCOPES })).ok).toBe(false);
    expect((await fetchRemoteRefs({ fetch: refsFetch({ "/api/v2/settings/sports/": [sportPage([], true)] }).f, accessToken: "AT", athleteRef: "usr_T1", scopes: SCOPES })).ok).toBe(false);
    expect((await fetchRemoteRefs({ fetch: refsFetch({ "/api/v2/settings/sports/": [sportPage([{ ...S1, sport: 42 }])] }).f, accessToken: "AT", athleteRef: "usr_T1", scopes: SCOPES })).ok).toBe(false);
  });
  it("sans library:read ⇒ exercices scope_missing (force bloquée), aucun appel bibliothèque", async () => {
    const { f, calls } = refsFetch({ "/api/v2/settings/sports/": [sportPage([S1])] });
    const r = await fetchRemoteRefs({ fetch: f, accessToken: "AT", athleteRef: "usr_T1", scopes: ["planned:read", "planned:write"] });
    expect(r.ok && r.refs.exercises.status).toBe("scope_missing"); expect(calls.some((c) => c.includes("library"))).toBe(false);
  });
});

const REMOTE: RemoteRefs = { athleteRef: "usr_T1", digest: "d1", sports: [
  { id: "spu_1", sport: "spt_RUN", name: "Course", isActive: true, structuredEnabled: true },
  { id: "spu_2", sport: "spt_OFF", name: "Off", isActive: false, structuredEnabled: true },
], exercises: { status: "loaded", items: [{ id: "exf_SQ", name: "Squat", type: "rep" }] } };

describe("validation de l'association", () => {
  const v = (o: Partial<Parameters<typeof validateActivationRefs>[0]>) => validateActivationRefs({ remote: REMOTE, selectedRef: "usr_T1", sportIds: { run: "spt_RUN" }, exerciseIds: {}, calendarTimeZone: null, ...o });
  it("accepte uniquement des sports lus et utilisables", () => {
    expect(v({}).ok).toBe(true);
    expect(v({ sportIds: { run: "spt_FORGED" } })).toEqual({ ok: false, reason: "sport_ref_not_allowed_for_athlete:run" });
    expect(v({ sportIds: { run: "spt_OFF" } }).ok).toBe(false);
    expect(v({ sportIds: {} }).ok).toBe(false);
    expect(v({ selectedRef: "usr_OTHER" })).toEqual({ ok: false, reason: "refs_for_other_athlete" });
  });
  it("exercice forgé refusé ; bibliothèque non chargée ⇒ force bloquée ; fuseau IANA validé", () => {
    expect(v({ exerciseIds: { Squat: "exf_FORGED" } }).ok).toBe(false);
    expect(v({ exerciseIds: { Squat: "exf_SQ" } }).ok).toBe(true);
    expect(validateActivationRefs({ remote: { ...REMOTE, exercises: { status: "partial", items: [] } }, selectedRef: "usr_T1", sportIds: { run: "spt_RUN" }, exerciseIds: { Squat: "exf_SQ" }, calendarTimeZone: null })).toEqual({ ok: false, reason: "exercise_refs_unavailable:partial" });
    expect(v({ calendarTimeZone: "Europe/Paris" }).ok).toBe(true);
    expect(v({ calendarTimeZone: "Mars/Olympus" }).ok).toBe(false);
  });
});

// ---------------- Actions (store grant) ----------------
function grantStore(over: Partial<GrantRow> = {}) {
  const g: GrantRow = { id: GID, token_generation: 1, refresh_state: "idle", coach_id: A, athlete_id: ATH, status: "pending_refs", api_version: "v2", app_type: "team",
    granted_scopes: SCOPES, nolio_user_ref: "usr_C", allowed_athletes: [{ id: "usr_T1", name: "Test", has_api_access: true }], selected_athlete_ref: "usr_T1",
    consent_confirmed_at: new Date(T0).toISOString(), access_token: "AT_x_0000", refresh_token: "RT_x_0000", token_expires_at: new Date(T0 + 20 * 3600_000).toISOString(),
    remote_refs: null, remote_refs_loaded_at: null, ...over };
  const activated: unknown[] = []; let active = 0;
  const store: OAuthStore = {
    insertState: async () => true, consumeState: async () => null, upsertGrant: async () => true,
    getGrant: async (c, a) => (c === g.coach_id && a === g.athlete_id ? g : null), selectAthlete: async () => false,
    countActiveConnections: async () => active,
    storeRemoteRefs: async (id, gen, refs) => { if (id !== g.id || gen !== g.token_generation) return false; g.remote_refs = refs; g.remote_refs_loaded_at = new Date(T0).toISOString(); return true; },
    activate: async (id, c, a, gen, digest, refs) => { if (gen !== g.token_generation) return { ok: false, reason: "stale_generation" }; activated.push({ id, c, a, digest, refs }); g.status = "active"; active = 1; return { ok: true }; },
  };
  return { g, store, activated };
}
const noRefresh = async () => { throw new Error("refresh must not run"); };

describe("actions charger / activer", () => {
  it("charger : refs stockées par CAS ; refresh seulement si expiration proche", async () => {
    const s = grantStore();
    const r = await loadRemoteRefsAction({ coachId: A, athleteId: ATH, store: s.store, now: () => T0, refresh: noRefresh, fetchRefs: async () => ({ ok: true, refs: REMOTE }) });
    expect(r.status).toBe("REFS_LOADED");
    const s2 = grantStore({ token_expires_at: new Date(T0 + 60_000).toISOString() });
    let refreshed = 0;
    const r2 = await loadRemoteRefsAction({ coachId: A, athleteId: ATH, store: s2.store, now: () => T0, fetchRefs: async () => ({ ok: true, refs: REMOTE }),
      refresh: async () => { refreshed++; return { status: "UNKNOWN", reason: "refresh_response_lost" }; } });
    expect(refreshed).toBe(1); expect(r2.status).toBe("UNKNOWN");
  });
  it("lecture inconnue ⇒ rien stocké ; coach non QA / athlète non choisi / état refresh non idle ⇒ refus", async () => {
    const s = grantStore();
    expect((await loadRemoteRefsAction({ coachId: A, athleteId: ATH, store: s.store, now: () => T0, refresh: noRefresh, fetchRefs: async () => ({ ok: false, reason: "sports_read_partial" }) })).status).toBe("UNKNOWN");
    expect(s.g.remote_refs).toBeNull();
    expect((await loadRemoteRefsAction({ coachId: "00000000-0000-4000-8000-000000000000", athleteId: ATH, store: s.store, now: () => T0, refresh: noRefresh, fetchRefs: async () => ({ ok: true, refs: REMOTE }) })).status).toBe("REFUSED");
    expect((await loadRemoteRefsAction({ coachId: A, athleteId: ATH, store: grantStore({ selected_athlete_ref: null }).store, now: () => T0, refresh: noRefresh, fetchRefs: async () => ({ ok: true, refs: REMOTE }) })).status).toBe("REFUSED");
    expect((await loadRemoteRefsAction({ coachId: A, athleteId: ATH, store: grantStore({ refresh_state: "unknown" }).store, now: () => T0, refresh: noRefresh, fetchRefs: async () => ({ ok: true, refs: REMOTE }) })).status).toBe("REFUSED");
    expect((await loadRemoteRefsAction({ coachId: B, athleteId: ATH, store: s.store, now: () => T0, refresh: noRefresh, fetchRefs: async () => ({ ok: true, refs: REMOTE }) })).status).toBe("REFUSED");
  });
  it("activer : consentement, digest, sport forgé, athlète révoqué, déjà actif", async () => {
    const base = { coachId: A, athleteId: ATH, now: T0 + 1000, consent: true, refsDigest: "d1", sportIds: { run: "spt_RUN" }, exerciseIds: {}, calendarTimeZone: null };
    const loaded = () => grantStore({ remote_refs: REMOTE, remote_refs_loaded_at: new Date(T0).toISOString() });
    expect((await activateConnectionAction({ ...base, store: loaded().store, consent: false })).status).toBe("REFUSED");
    expect(await activateConnectionAction({ ...base, store: loaded().store, refsDigest: "forged" })).toEqual({ status: "REFUSED", reason: "refs_digest_mismatch" });
    expect((await activateConnectionAction({ ...base, store: loaded().store, sportIds: { run: "spt_FORGED" } })).status).toBe("REFUSED");
    expect(await activateConnectionAction({ ...base, store: grantStore({ remote_refs: REMOTE, remote_refs_loaded_at: new Date(T0).toISOString(), allowed_athletes: [{ id: "usr_T1", name: "T", has_api_access: false }] }).store })).toEqual({ status: "REFUSED", reason: "athlete_no_longer_authorized" });
    expect(await activateConnectionAction({ ...base, store: loaded().store, now: T0 + 2 * 3600_000 })).toEqual({ status: "REFUSED", reason: "refs_too_old_reload" });
    const s = loaded();
    expect(await activateConnectionAction({ ...base, store: s.store })).toEqual({ status: "ACTIVE_NO_SEND" });
    expect(JSON.stringify(s.activated)).not.toMatch(/AT_|RT_/); // jeton copié par la RPC, jamais transmis
    expect(await activateConnectionAction({ ...base, store: s.store })).toEqual({ status: "REFUSED", reason: "already_active" });
  });
  it("statut : étapes vraies, preuve d'envoi toujours ABSENTE, aucun jeton exposé", async () => {
    const s = grantStore({ remote_refs: REMOTE, remote_refs_loaded_at: new Date(T0).toISOString() });
    const env = { clientId: "cid", clientSecret: "SECRET_xyz", supabaseUrl: "https://lkjesdacgpolrwfxulbo.supabase.co" };
    const st1 = await connectionStatus({ coachId: A, athleteId: ATH, env, store: s.store, now: T0 });
    if (!("stages" in st1)) throw new Error("x");
    expect(st1.stages).toMatchObject({ configured: true, authorized: true, testAthleteSelected: true, refsLoaded: true, refsConfirmed: false, readyForTrial: false, realDryRunOrSendProof: "ABSENT", automaticRemoteWrites: false });
    await activateConnectionAction({ coachId: A, athleteId: ATH, store: s.store, now: T0, consent: true, refsDigest: "d1", sportIds: { run: "spt_RUN" }, exerciseIds: {}, calendarTimeZone: null });
    const st2 = await connectionStatus({ coachId: A, athleteId: ATH, env, store: s.store, now: T0 });
    if (!("stages" in st2)) throw new Error("x");
    expect(st2.stages.readyForTrial).toBe(true); expect(st2.stages.realDryRunOrSendProof).toBe("ABSENT");
    expect(JSON.stringify(st2)).not.toMatch(/AT_x|RT_x|SECRET/);
  });
});

describe("chargeur de connexion avec rafraîchissement", () => {
  const row = (o: Record<string, unknown> = {}) => ({ coach_id: A, athlete_id: ATH, status: "active", api_version: "v2", app_type: "team", nolio_athlete_ref: "usr_T1",
    granted_scopes: SCOPES, access_token: "AT_c", token_expires_at: new Date(T0 + 5 * 60_000).toISOString(), consent_confirmed_at: new Date(T0).toISOString(),
    refs: { sportIds: { run: "spt_RUN" }, exerciseIds: {}, competition: null, calendarTimeZone: null }, grant_id: GID, token_generation: 1, ...o });
  const client = (rows: unknown[][]) => { let i = 0; return { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ limit: async () => ({ data: rows[Math.min(i++, rows.length - 1)], error: null }) }) }) }) }) }) } as unknown as ConnectionStoreClient; };
  it("expiration proche ⇒ un refresh puis relecture ; tout échec ⇒ BLOCKED même si l'ancien jeton est encore valide", async () => {
    let n = 0;
    const r = await loadV2ConnectionWithRefresh(client([[row()], [row({ access_token: "AT_new", token_expires_at: new Date(T0 + 24 * 3600_000).toISOString(), token_generation: 2 })]]), { coachId: A, athleteId: ATH, now: () => T0 }, async () => { n++; return { status: "REFRESHED", reason: "ok" }; });
    expect(n).toBe(1); expect(r.ok && r.value.accessToken).toBe("AT_new");
    const r2 = await loadV2ConnectionWithRefresh(client([[row()]]), { coachId: A, athleteId: ATH, now: () => T0 }, async () => ({ status: "UNKNOWN", reason: "lost" }));
    expect(r2.ok).toBe(false);
    const r3 = await loadV2ConnectionWithRefresh(client([[row({ token_expires_at: new Date(T0 - 1).toISOString() })]]), { coachId: A, athleteId: ATH, now: () => T0 }, async () => ({ status: "NEEDS_RECONNECT", reason: "x" }));
    expect(r3).toMatchObject({ ok: false });
  });
});

describe("chargeur fail-closed : zéro POST après refresh non confirmé", () => {
  const row = (o: Record<string, unknown> = {}) => ({ coach_id: A, athlete_id: ATH, status: "active", api_version: "v2", app_type: "team", nolio_athlete_ref: "usr_T1",
    granted_scopes: SCOPES, access_token: "AT_old", token_expires_at: new Date(T0 + 5 * 60_000).toISOString(), consent_confirmed_at: new Date(T0).toISOString(),
    refs: { sportIds: { run: "spt_RUN" }, exerciseIds: {}, competition: null, calendarTimeZone: null }, grant_id: GID, token_generation: 1, ...o });
  // 1re lecture : ancienne connexion active, jeton encore valide 5 min ; lectures suivantes : révoquée par la reconnexion.
  const client = () => { let i = 0; const rows = [[row()], []]; return { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ limit: async () => ({ data: rows[Math.min(i++, 1)], error: null }) }) }) }) }) }) } as unknown as ConnectionStoreClient; };
  for (const status of ["UNKNOWN", "SUPERSEDED", "NEEDS_RECONNECT", "AMBIGUOUS", "IN_PROGRESS"]) {
    it(`${status} ⇒ BLOCKED, ancien jeton jamais renvoyé, http.post jamais appelé`, async () => {
      let posts = 0; let refreshes = 0;
      const http = { post: async () => { posts++; return { status: 201, body: {} }; } };
      const loaded = await loadV2ConnectionWithRefresh(client(), { coachId: A, athleteId: ATH, now: () => T0 }, async () => { refreshes++; return { status, reason: "r" }; });
      // Même garde que l'Edge nolio-v2-send-plan : l'expéditeur n'est atteint que si loaded.ok.
      if (loaded.ok) await http.post();
      expect(loaded.ok).toBe(false);
      expect(JSON.stringify(loaded)).not.toContain("AT_old");
      if (status === "IN_PROGRESS") expect(loaded.ok === false && loaded.reason).toMatch(/retry_later/);
      expect(refreshes).toBe(1); expect(posts).toBe(0);
    });
  }
});

describe("migration 0012 : commit fencé sur compte dupliqué", () => {
  const sql = readFileSync("drizzle/migrations/0012_nolio_v2_refresh_commit_account_fence.sql", "utf8");
  it("recompte les grants du compte au commit, révoque et exige une reconnexion ; privilèges service_role seuls", () => {
    expect(sql).toMatch(/count\(\*\) INTO v_same FROM public\.nolio_v2_oauth_grants WHERE nolio_user_ref = g\.nolio_user_ref/);
    expect(sql).toMatch(/'account_ambiguous'/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.nolio_v2_refresh_commit\(uuid, uuid, bigint, text, text, timestamptz, text\[\]\) FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.nolio_v2_refresh_commit\(uuid, uuid, bigint, text, text, timestamptz, text\[\]\) TO service_role/);
  });
});

describe("migration 0011 : privilèges", () => {
  const sql = readFileSync("drizzle/migrations/0011_nolio_v2_refs_refresh_qa.sql", "utf8");
  it("toutes les RPC révoquées pour PUBLIC/anon/authenticated, service_role seul", () => {
    for (const fn of ["nolio_v2_grant_reconnect", "nolio_v2_refresh_begin", "nolio_v2_refresh_commit", "nolio_v2_refresh_fail", "nolio_v2_store_remote_refs", "nolio_v2_activate_connection"]) {
      expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon, authenticated`));
      expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\) TO service_role`));
    }
    expect(sql).not.toMatch(/TO (anon|authenticated)/);
  });
});
