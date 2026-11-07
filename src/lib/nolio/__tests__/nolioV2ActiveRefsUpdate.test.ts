/**
 * Mise à jour explicite des correspondances d'une connexion V2 ACTIVE (QA) : clic + consentement,
 * refs officielles déjà chargées (< 1 h, même empreinte), CAS sur les correspondances lues.
 * Jetons, consentement et association jamais modifiés. Données SYNTHÉTIQUES, aucun réseau.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { updateActiveRefsAction, connectionStatus, type GrantRow, type OAuthStore } from "../../../../supabase/functions/_shared/nolioV2/oauth";
import { validateCompetitionRef, type RemoteRefs } from "../../../../supabase/functions/_shared/nolioV2/refs";
import { canonicalJson } from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";

const A = "573e045a-bbea-4e37-a30f-33183b9fbe13", ATH = "c155204f-43e2-4367-9b66-6d068ef89212", GID = "11111111-1111-4111-8111-111111111111";
const T0 = Date.parse("2026-11-03T12:00:00Z");
const REMOTE: RemoteRefs = { athleteRef: "usr_T1", digest: "d1", sports: [{ id: "spu_1", sport: "spt_RUN", name: "Course", isActive: true, structuredEnabled: true }, { id: "spu_3", sport: "spt_STR", name: "Renfo", isActive: true, structuredEnabled: true }],
  exercises: { status: "loaded", items: [{ id: "exf_SQ", name: "Squat", type: "rep" }] } };
const sha = async (x: unknown) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalJson(x))))].map((b) => b.toString(16).padStart(2, "0")).join("");

function store(over: Partial<GrantRow> = {}, activeRefs: unknown = { sportIds: { run: "spt_RUN" }, exerciseIds: {}, competition: null, calendarTimeZone: null }) {
  const g: GrantRow = { id: GID, token_generation: 1, refresh_state: "idle", coach_id: A, athlete_id: ATH, status: "active", api_version: "v2", app_type: "team",
    granted_scopes: ["planned:read", "planned:write", "library:read"], nolio_user_ref: "usr_C", allowed_athletes: [{ id: "usr_T1", name: "Test", has_api_access: true }], selected_athlete_ref: "usr_T1",
    consent_confirmed_at: new Date(T0).toISOString(), access_token: "AT_x_0000", refresh_token: "RT_x_0000", token_expires_at: new Date(T0 + 20 * 3600_000).toISOString(),
    remote_refs: REMOTE, remote_refs_loaded_at: new Date(T0).toISOString(), ...over };
  const before = JSON.stringify(g);
  const calls: unknown[][] = []; let refs = activeRefs;
  const s: OAuthStore = {
    insertState: async () => true, consumeState: async () => null, upsertGrant: vi.fn(async () => true), selectAthlete: async () => false,
    getGrant: async () => g, countActiveConnections: async () => 1, getActiveConnectionRefs: async () => refs,
    updateActiveRefs: async (...a) => { calls.push(a); if (canonicalJson(a[5]) !== canonicalJson(refs)) return { ok: false, reason: "active_connection_cas_failed" }; refs = a[6]; return { ok: true }; },
    activate: vi.fn(async () => ({ ok: true as const })),
  };
  return { s, g, calls, grantUnchanged: () => JSON.stringify(g) === before, refs: () => refs };
}
const body = async (st: ReturnType<typeof store>, over: Record<string, unknown> = {}) => ({
  coachId: A, athleteId: ATH, store: st.s, now: T0 + 1000, consent: true, refsDigest: "d1", currentRefsSha: await sha(st.refs()),
  sportIds: { run: "spt_RUN", strength: "spt_STR" }, exerciseIds: { Squat: "exf_SQ" }, calendarTimeZone: null,
  competition: { date: "2027-02-14", name: "Marathon", sport: "run" }, ...over,
});

beforeAll(() => { vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); }); });

describe("update_refs sur connexion active", () => {
  it("clic + consentement ⇒ seules les refs changent ; jetons, consentement, association, statut intacts ; aucun réseau", async () => {
    const st = store();
    expect(await updateActiveRefsAction(await body(st))).toEqual({ status: "REFS_UPDATED_NO_SEND" });
    expect(st.refs()).toEqual({ sportIds: { run: "spt_RUN", strength: "spt_STR" }, exerciseIds: { Squat: "exf_SQ" }, competition: { date: "2027-02-14", name: "Marathon", sport: "run" }, calendarTimeZone: null });
    expect(st.grantUnchanged()).toBe(true);
    expect(JSON.stringify(st.calls)).not.toMatch(/AT_|RT_/);
    expect(st.s.upsertGrant).not.toHaveBeenCalled(); expect(st.s.activate).not.toHaveBeenCalled();
  });
  it("refus : sans consentement, grant non actif, refs trop anciennes/empreinte différente, CAS périmé", async () => {
    const st = store();
    expect((await updateActiveRefsAction(await body(st, { consent: false }))).status).toBe("REFUSED");
    expect(await updateActiveRefsAction(await body(store({ status: "pending_refs" })))).toEqual({ status: "REFUSED", reason: "grant_not_active" });
    expect(await updateActiveRefsAction(await body(st, { now: T0 + 2 * 3600_000 }))).toEqual({ status: "REFUSED", reason: "refs_too_old_reload" });
    expect(await updateActiveRefsAction(await body(st, { refsDigest: "forged" }))).toEqual({ status: "REFUSED", reason: "refs_digest_mismatch" });
    expect(await updateActiveRefsAction(await body(st, { currentRefsSha: "0".repeat(64) }))).toEqual({ status: "REFUSED", reason: "active_refs_changed_reload_status" });
    expect(await updateActiveRefsAction(await body(store({ refresh_state: "refreshing" })))).toMatchObject({ status: "REFUSED" });
    expect(st.calls).toHaveLength(0);
  });
  it("exercice hors bibliothèque officielle chargée, sport non utilisable, compétition non conforme ⇒ refus", async () => {
    const st = store();
    expect((await updateActiveRefsAction(await body(st, { exerciseIds: { Squat: "exf_INVENTED" } }))).status).toBe("REFUSED");
    expect((await updateActiveRefsAction(await body(st, { sportIds: { run: "spt_FORGED" } }))).status).toBe("REFUSED");
    expect(await updateActiveRefsAction(await body(st, { competition: { date: "2027-02-14", name: "Marathon", sport: "bike" } }))).toEqual({ status: "REFUSED", reason: "competition_sport_not_associated" });
    expect(st.calls).toHaveLength(0);
  });
  it("statut : expose les correspondances actives et leur empreinte, jamais de jeton", async () => {
    const st = store();
    const out = await connectionStatus({ coachId: A, athleteId: ATH, env: { clientId: "cid", clientSecret: "SECRET_xyz", supabaseUrl: "https://lkjesdacgpolrwfxulbo.supabase.co" }, store: st.s, now: T0 });
    if (!("stages" in out)) throw new Error("x");
    expect(out.activeRefs).toMatchObject({ sha256: await sha(st.refs()), sportIds: { run: "spt_RUN" } });
    expect(JSON.stringify(out)).not.toMatch(/AT_x|RT_x|SECRET/);
    expect(out.remaining.some((r) => /dry_run/.test(r))).toBe(false);
  });
});

describe("validation de l'identité de compétition", () => {
  const S = { run: "spt_RUN" };
  it("date réelle, nom exact borné sans caractères de contrôle/bidi, sport associé, priorité a|b", () => {
    expect(validateCompetitionRef({ date: "2027-02-14", name: "Marathon", sport: "run" }, S)).toEqual({ ok: true, value: { date: "2027-02-14", name: "Marathon", sport: "run" } });
    expect(validateCompetitionRef(null, S)).toEqual({ ok: true, value: null });
    for (const bad of [{ date: "2027-02-30", name: "M", sport: "run" }, { date: "2027-02-14", name: " Marathon", sport: "run" }, { date: "2027-02-14", name: "Mara\u202ethon", sport: "run" },
      { date: "2027-02-14", name: "M\u0000", sport: "run" }, { date: "2027-02-14", name: "x".repeat(121), sport: "run" }, { date: "2027-02-14", name: "M", sport: "run", goalType: "c" },
      { date: "2027-02-14", name: "M", sport: "run", id: "pcmp_X" }, "Marathon"])
      expect(validateCompetitionRef(bad, S).ok).toBe(false);
  });
});

describe("migration 0019", () => {
  const sql = readFileSync("drizzle/migrations/0019_qa_nolio_v2_plan_dry_run_acl_and_active_refs.sql", "utf8");
  it("droits des preuves : révocation totale puis SELECT/INSERT + UPDATE des seules colonnes de verrou ; reçus append-only", () => {
    expect(sql).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.qa_nolio_v2_plan_dry_run_jobs, public\.qa_nolio_v2_plan_dry_run_receipts FROM PUBLIC, anon, authenticated, service_role/);
    expect(sql).toMatch(/GRANT UPDATE \(lock_id, lock_until\) ON public\.qa_nolio_v2_plan_dry_run_jobs TO service_role/);
    expect(sql).not.toMatch(/GRANT (ALL|UPDATE|DELETE)[^;(]*ON public\.qa_nolio_v2_plan_dry_run_receipts/);
    expect(sql).toMatch(/BEFORE UPDATE OR DELETE ON public\.qa_nolio_v2_plan_dry_run_receipts/);
    expect(sql).toMatch(/BEFORE TRUNCATE ON public\.qa_nolio_v2_plan_dry_run_receipts/);
  });
  it("RPC update_active_refs : ne modifie que refs, CAS génération + refs attendues, service_role seul", () => {
    const fn = sql.slice(sql.indexOf("nolio_v2_update_active_refs"));
    expect(fn).toMatch(/UPDATE public\.nolio_v2_connections SET refs = p_refs, updated_at = now\(\)/);
    expect(fn).toMatch(/token_generation = p_generation AND nolio_athlete_ref = g\.selected_athlete_ref AND refs = p_expected_refs/);
    expect(fn).not.toMatch(/access_token\s*=|refresh_token\s*=|consent_confirmed_at\s*=|status\s*=\s*'(revoked|pending)/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.nolio_v2_update_active_refs\([^)]*\) FROM PUBLIC, anon, authenticated/);
  });
});
