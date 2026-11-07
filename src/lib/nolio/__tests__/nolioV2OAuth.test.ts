import { describe, it, expect, vi } from "vitest";
import {
  handleCallback, startConnect, connectionStatus, selectAthlete, sha256Hex, returnLocation,
  QA_RETURN_ORIGIN, QA_RETURN_PATH, type OAuthStore, type StateRow, type GrantRow, type Fetch,
} from "../../../../supabase/functions/_shared/nolioV2/oauth";

const A = "573e045a-bbea-4e37-a30f-33183b9fbe13";
const ATH = "c155204f-43e2-4367-9b66-6d068ef89212";
const ENV = { clientId: "cid_test", clientSecret: "SECRET_VALUE_xyz", supabaseUrl: "https://lkjesdacgpolrwfxulbo.supabase.co" };
const T0 = Date.parse("2026-11-03T10:00:00Z");
const ACCESS = "ACCESS_TOKEN_abcdefgh", REFRESH = "REFRESH_TOKEN_zz", CODE = "AUTH_CODE_123";

function memStore() {
  const states = new Map<string, StateRow & { consumed_at: string | null }>();
  const grants = new Map<string, GrantRow>();
  const connections: unknown[] = [];
  const store: OAuthStore = {
    insertState: async (r) => { states.set(r.state_digest, { ...r, consumed_at: null }); return true; },
    consumeState: async (d, now) => { const s = states.get(d); if (!s || s.consumed_at || Date.parse(s.expires_at) <= Date.parse(now)) return null; s.consumed_at = now; return s; },
    upsertGrant: async (g) => { grants.set(`${g.coach_id}|${g.athlete_id}`, structuredClone(g)); return true; },
    getGrant: async (c, a) => grants.get(`${c}|${a}`) ?? null,
    selectAthlete: async (c, a, ref, now) => { const g = grants.get(`${c}|${a}`); if (!g || g.status !== "pending_athlete_selection") return false; Object.assign(g, { selected_athlete_ref: ref, consent_confirmed_at: now, status: "pending_refs" }); return true; },
    countActiveConnections: async () => connections.length,
  };
  return { store, states, grants, connections };
}
type Over = Partial<{ token: unknown; tokenStatus: number; app: unknown; me: unknown; pages: unknown[] }>;
function mockFetch(o: Over = {}) {
  const calls: { url: string; body?: string; headers: Record<string, string> }[] = [];
  const pages = o.pages ?? [{ data: [{ id: "usr_ATH1", name: "Synth Un", has_api_access: true }, { id: "usr_ATH2", name: "Synth Deux", has_api_access: false }], has_more: false }];
  let pi = 0;
  const f: Fetch = async (url, init) => {
    calls.push({ url, body: init.body, headers: init.headers });
    const r = (status: number, j: unknown) => ({ status, json: async () => j });
    if (url === "https://www.nolio.io/api/token/") return r(o.tokenStatus ?? 200, o.token ?? { access_token: ACCESS, token_type: "Bearer", expires_in: 86400, refresh_token: REFRESH });
    if (url === "https://www.nolio.io/api/v2/app/") return r(200, o.app ?? { type: "multi_user", scopes: ["planned:read", "planned:write"], name: "x" });
    if (url === "https://www.nolio.io/api/v2/me/") return r(200, o.me ?? { id: "usr_COACH1" });
    if (url.startsWith("https://www.nolio.io/api/v2/me/athletes/")) return r(200, pages[pi++]);
    return r(404, {});
  };
  return { f: vi.fn(f), calls };
}
async function started(store: OAuthStore) {
  const s = await startConnect({ coachId: A, athleteId: ATH, env: ENV, store, now: T0 });
  if (s.status !== "REDIRECT") throw new Error(s.reason);
  const u = new URL(s.authorizeUrl);
  return { u, state: u.searchParams.get("state")! };
}
const q = (o: Record<string, string>) => new URLSearchParams(o);

describe("Nolio V2 OAuth QA", () => {
  it("missing config => BLOCKED, no state stored; non-QA backend/coach refused", async () => {
    const m = memStore();
    expect(await startConnect({ coachId: A, athleteId: ATH, env: { supabaseUrl: ENV.supabaseUrl }, store: m.store, now: T0 })).toEqual({ status: "BLOCKED", reason: "missing_config:NOLIO_V2_CLIENT_ID/NOLIO_V2_CLIENT_SECRET" });
    expect(await startConnect({ coachId: A, athleteId: ATH, env: { ...ENV, supabaseUrl: "https://other.supabase.co" }, store: m.store, now: T0 })).toMatchObject({ status: "BLOCKED", reason: "backend_not_qa" });
    expect(await startConnect({ coachId: "00000000-0000-4000-8000-000000000000", athleteId: ATH, env: ENV, store: m.store, now: T0 })).toMatchObject({ status: "BLOCKED" });
    expect(m.states.size).toBe(0);
  });
  it("start: 256-bit state, only digest stored, PKCE S256, fixed callback, no secret in URL", async () => {
    const m = memStore(); const { u, state } = await started(m.store);
    expect(u.origin + u.pathname).toBe("https://www.nolio.io/api/authorize/");
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect([...m.states.keys()]).toEqual([await sha256Hex(state)]);
    expect(u.searchParams.get("redirect_uri")).toBe("https://lkjesdacgpolrwfxulbo.supabase.co/functions/v1/nolio-v2-oauth-callback");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.toString()).not.toContain(ENV.clientSecret);
    const row = [...m.states.values()][0];
    expect(u.toString()).not.toContain(row.pkce_verifier);
    expect(row).toMatchObject({ coach_id: A, athlete_id: ATH, return_path: QA_RETURN_PATH });
  });
  it("callback success => pending grant only (never active), exact verifier/secret sent server-side, no leak in redirect", async () => {
    const m = memStore(); const { state } = await started(m.store); const mf = mockFetch();
    const r = await handleCallback({ query: q({ code: CODE, state }), env: ENV, store: m.store, fetch: mf.f, now: T0 + 1000 });
    expect(r.outcome).toBe("grant_pending_selection");
    expect(r.location).toBe(`${QA_RETURN_ORIGIN}${QA_RETURN_PATH}?nolio_v2=grant_pending_selection`);
    for (const s of [CODE, ACCESS, REFRESH, ENV.clientSecret]) expect(r.location).not.toContain(s);
    const body = new URLSearchParams(mf.calls[0].body);
    expect(body.get("code_verifier")).toBe([...m.states.values()][0].pkce_verifier);
    expect(body.get("client_secret")).toBe(ENV.clientSecret);
    expect(mf.calls.slice(1).every((c) => c.headers.Authorization === `Bearer ${ACCESS}`)).toBe(true);
    const g = [...m.grants.values()][0];
    expect(g).toMatchObject({ status: "pending_athlete_selection", app_type: "partner", nolio_user_ref: "usr_COACH1", selected_athlete_ref: null, consent_confirmed_at: null });
    expect(m.connections).toHaveLength(0);
  });
  it("replay of a consumed state refused, no second exchange", async () => {
    const m = memStore(); const { state } = await started(m.store); const mf = mockFetch();
    await handleCallback({ query: q({ code: CODE, state }), env: ENV, store: m.store, fetch: mf.f, now: T0 + 1 });
    const n = mf.f.mock.calls.length;
    expect((await handleCallback({ query: q({ code: CODE, state }), env: ENV, store: m.store, fetch: mf.f, now: T0 + 2 })).outcome).toBe("state_invalid_or_replayed");
    expect(mf.f.mock.calls.length).toBe(n);
  });
  it("expired / unknown / malformed state refused before any fetch", async () => {
    const m = memStore(); const { state } = await started(m.store); const mf = mockFetch();
    expect((await handleCallback({ query: q({ code: CODE, state }), env: ENV, store: m.store, fetch: mf.f, now: T0 + 11 * 60_000 })).outcome).toBe("state_invalid_or_replayed");
    expect((await handleCallback({ query: q({ code: CODE, state: "A".repeat(43) }), env: ENV, store: m.store, fetch: mf.f, now: T0 })).outcome).toBe("state_invalid_or_replayed");
    expect((await handleCallback({ query: q({ code: CODE, state: "../x" }), env: ENV, store: m.store, fetch: mf.f, now: T0 })).outcome).toBe("invalid_request");
    expect(mf.f).not.toHaveBeenCalled();
  });
  it("open redirect impossible: redirect_uri/next params ignored, location fixed", async () => {
    const m = memStore(); const { state } = await started(m.store); const mf = mockFetch();
    const r = await handleCallback({ query: q({ code: CODE, state, redirect_uri: "https://evil.example", next: "//evil.example" }), env: ENV, store: m.store, fetch: mf.f, now: T0 });
    expect(r.location.startsWith(`${QA_RETURN_ORIGIN}${QA_RETURN_PATH}?nolio_v2=`)).toBe(true);
    expect(r.location).not.toContain("evil");
    expect(returnLocation("nope" as never)).toBe(`${QA_RETURN_ORIGIN}${QA_RETURN_PATH}?nolio_v2=invalid_request`);
  });
  it("consent denied, missing config at callback, token failures => no grant", async () => {
    for (const [env, query, over, out] of [
      [ENV, { error: "access_denied" }, {}, "consent_denied"],
      [{ supabaseUrl: ENV.supabaseUrl }, { code: CODE }, {}, "blocked_missing_config"],
      [ENV, { code: CODE }, { tokenStatus: 400 }, "token_exchange_failed"],
      [ENV, { code: CODE }, { token: { token_type: "Bearer" } }, "token_response_invalid"],
      [ENV, { code: CODE }, { token: { access_token: ACCESS, token_type: "mac" } }, "token_response_invalid"],
      [ENV, { code: CODE }, { token: { access_token: ACCESS, expires_in: "86400" } }, "token_response_invalid"],
    ] as const) {
      const m = memStore(); const { state } = await started(m.store);
      const r = await handleCallback({ query: q({ ...query, state }), env, store: m.store, fetch: mockFetch(over as Over).f, now: T0 });
      expect(r.outcome).toBe(out); expect(m.grants.size).toBe(0);
    }
  });
  it("wrong app type (personal / unknown), scopes missing, invalid me / athletes / refs => no grant", async () => {
    for (const [over, out] of [
      [{ app: { type: "personal", scopes: ["planned:read", "planned:write"] } }, "wrong_app_type"],
      [{ app: { type: "partner", scopes: ["planned:read", "planned:write"] } }, "wrong_app_type"],
      [{ app: { type: "multi_user", scopes: ["planned:read"] } }, "scopes_missing"],
      [{ token: { access_token: ACCESS, scope: "planned:read" } }, "scopes_missing"],
      [{ me: { id: "42" } }, "me_invalid"],
      [{ pages: [{ data: [{ id: "123", name: "x", has_api_access: true }], has_more: false }] }, "athletes_invalid"],
      [{ pages: [{ data: [], has_more: true }] }, "athletes_invalid"],
    ] as const) {
      const m = memStore(); const { state } = await started(m.store);
      const r = await handleCallback({ query: q({ code: CODE, state }), env: ENV, store: m.store, fetch: mockFetch(over as Over).f, now: T0 });
      expect(r.outcome).toBe(out); expect(m.grants.size).toBe(0);
    }
  });
  it("network exception => remote_unreadable, no grant, no detail leaked", async () => {
    const m = memStore(); const { state } = await started(m.store);
    const r = await handleCallback({ query: q({ code: CODE, state }), env: ENV, store: m.store, fetch: async () => { throw new Error(`boom ${ACCESS}`); }, now: T0 });
    expect(r.outcome).toBe("remote_unreadable"); expect(r.location).not.toContain(ACCESS); expect(m.grants.size).toBe(0);
  });
  it("paginates athletes with starting_after", async () => {
    const m = memStore(); const { state } = await started(m.store);
    const mf = mockFetch({ pages: [{ data: [{ id: "usr_P1", name: "a", has_api_access: true }], has_more: true }, { data: [{ id: "usr_P2", name: "b", has_api_access: true }], has_more: false }] });
    await handleCallback({ query: q({ code: CODE, state }), env: ENV, store: m.store, fetch: mf.f, now: T0 });
    expect(mf.calls.some((c) => c.url.includes("starting_after=usr_P1"))).toBe(true);
    expect([...m.grants.values()][0].allowed_athletes.map((x) => x.id)).toEqual(["usr_P1", "usr_P2"]);
  });
  it("status never returns tokens/secret; operational always false", async () => {
    const m = memStore(); const { state } = await started(m.store);
    await handleCallback({ query: q({ code: CODE, state }), env: ENV, store: m.store, fetch: mockFetch().f, now: T0 });
    const s = await connectionStatus({ coachId: A, athleteId: ATH, env: ENV, store: m.store, now: T0 });
    const txt = JSON.stringify(s);
    for (const x of [ACCESS, REFRESH, ENV.clientSecret]) expect(txt).not.toContain(x);
    expect(s).toMatchObject({ configured: true, stages: { readyForTrial: false, realDryRunOrSendProof: "ABSENT" }, activeConnections: 0, grant: { status: "pending_athlete_selection", refreshTokenStored: true } });
  });
  it("selection: requires consent, verified managed ref with API access, CAS one-time, never creates active connection", async () => {
    const m = memStore(); const { state } = await started(m.store);
    await handleCallback({ query: q({ code: CODE, state }), env: ENV, store: m.store, fetch: mockFetch().f, now: T0 });
    const base = { coachId: A, athleteId: ATH, store: m.store, now: T0 + 1 };
    expect(await selectAthlete({ ...base, nolioAthleteRef: "usr_ATH1", consent: false })).toMatchObject({ reason: "consent_not_confirmed" });
    expect(await selectAthlete({ ...base, nolioAthleteRef: "usr_GUESS", consent: true })).toMatchObject({ reason: "athlete_not_managed_by_grant" });
    expect(await selectAthlete({ ...base, nolioAthleteRef: "usr_ATH2", consent: true })).toMatchObject({ reason: "athlete_api_access_denied" });
    expect(await selectAthlete({ ...base, nolioAthleteRef: ATH, consent: true })).toMatchObject({ reason: "athlete_ref_invalid" });
    expect(await selectAthlete({ ...base, nolioAthleteRef: "usr_ATH1", consent: true, now: T0 + 25 * 3600_000 })).toMatchObject({ reason: "token_expired_reconnect" });
    expect(await selectAthlete({ ...base, nolioAthleteRef: "usr_ATH1", consent: true })).toEqual({ status: "PENDING_REFS" });
    expect(await selectAthlete({ ...base, nolioAthleteRef: "usr_ATH1", consent: true })).toMatchObject({ reason: "grant_not_pending_selection" });
    expect(m.connections).toHaveLength(0);
    expect(await selectAthlete({ ...base, coachId: "6b4c1722-2105-4889-ab14-41bab798cdf7", nolioAthleteRef: "usr_ATH1", consent: true })).toMatchObject({ reason: "no_grant" });
  });
  it("migration: OAuth tables revoked from anon/authenticated, service_role only, no policies", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync("drizzle/migrations/0010_nolio_v2_oauth_qa.sql", "utf8");
    expect(sql).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.nolio_v2_oauth_states, public\.nolio_v2_oauth_grants FROM PUBLIC, anon, authenticated;/);
    expect(sql).not.toMatch(/TO (anon|authenticated)/);
    expect(sql).not.toMatch(/CREATE POLICY/);
    expect(sql).not.toMatch(/(INSERT INTO|UPDATE|ALTER TABLE) public\.nolio_v2_connections/);
  });
});
