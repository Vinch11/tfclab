/**
 * Nolio V2 — journal durable (adaptateur RPC), transport fetch injecté,
 * réconciliation conservatrice (contre-exemples), validation runtime, créneaux
 * coach/DST, et garde de la fonction Edge V2. AUCUN réseau : `fetch` global
 * interdit ; les transports sont explicitement synthétiques.
 * Le fake RPC reproduit la sémantique SQL des fonctions de la migration
 * 0004 (INSERT … ON CONFLICT DO NOTHING ; UPDATE … WHERE state = from) ; ce
 * n'est PAS une exécution Postgres réelle.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { mapPlanToNolioV2, detWorkoutProblems, type DetWorkout, type NolioV2Refs, type PlanSessionInput } from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";
import { sendPlannedV2, bodyToSend, type NolioV2Http, type LedgerState } from "../../../../supabase/functions/_shared/nolioV2/plannedClient";
import { supabaseNolioV2Ledger, type RpcClient } from "../../../../supabase/functions/_shared/nolioV2/ledgerSupabase";
import { fetchNolioV2Http, type FetchLike } from "../../../../supabase/functions/_shared/nolioV2/httpFetch";
import { sessionsFromPlanJson } from "../../../../supabase/functions/_shared/nolioV2/planSessions";
import { resolveLocalInstant } from "../../../../supabase/functions/_shared/nolioV2/localTime";

beforeAll(() => { vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); }); });

const PV = "30909fcd-c421-4e35-b6ed-cbf1436fe77e";
const COACH = "6b4c1722-2105-4889-ab14-41bab798cdf7";
const REFS: NolioV2Refs = { synthetic: true, athleteId: "usr_SYNTH1", sportIds: { run: "spt_SYNTHRUN" }, exerciseIds: {}, competition: null, calendarTimeZone: "Europe/Brussels" };
const conn = { apiVersion: "v2" as const, mode: "test-mock" as const, grantedScopes: ["planned:read", "planned:write"] };

const workout = (): DetWorkout => ({
  schema: "det-structured-workout-v1", sourceId: "V3P_RUN_T", sport: "run", chosenDurationMin: 40, exactSeconds: 2400,
  nodes: [
    { kind: "step", role: "warmup", label: "Échauffement", domain: "LT1", dose: { seconds: 600 }, target: null, rpe: { min: 2, max: 3 } },
    { kind: "repeat", label: "4×6'", count: 4, betweenSec: 120, restAfterLast: false, steps: [
      { kind: "step", role: "main", label: "Seuil", domain: "MLSS", dose: { seconds: 360 }, target: { metric: "sec_per_km", min: 233, max: 247 } },
    ] },
    { kind: "step", role: "cooldown", label: "Retour au calme", domain: "LT1", dose: { seconds: 0 + 360 }, target: null },
  ],
});
// 600 + 4*360 + 3*120 + 360 = 2760 ⇒ ajuster durée exacte
const W = () => { const w = workout(); w.exactSeconds = 2760; w.chosenDurationMin = 46; return w; };
const session = (patch: Partial<PlanSessionInput> = {}): PlanSessionInput => ({
  sessionKey: "S1-J2-0", date: "2026-11-04", title: "Seuil 4×6'", sport: "run", catalogId: "V3P_RUN_T", durationMin: 46,
  details: "4×6' seuil", detStructuredWorkout: W(), ...patch,
});

/** Fake fidèle à la sémantique SQL des RPC (atomique par appel). */
function fakeRpc() {
  type Row = { op_key: string; coach_id: string; plan_version_id: string; session_key: string; path: string; athlete_ref: string; payload_sha256: string; state: LedgerState; remote_id: string | null; detail: string | null };
  const rows = new Map<string, Row>(); const calls: string[] = [];
  let failNext: "claim" | "transition" | null = null;
  const client: RpcClient = {
    async rpc(fn, a) {
      calls.push(fn);
      await Promise.resolve();
      if (failNext && fn.includes(failNext)) { failNext = null; return { data: null, error: { message: "connection reset" } }; }
      if (fn === "nolio_v2_claim_operation") {
        const clash = [...rows.values()].find((r) => r.op_key === a.p_op_key || (r.plan_version_id === a.p_plan_version_id && r.session_key === a.p_session_key && r.path === a.p_path));
        if (!clash) { rows.set(a.p_op_key as string, { op_key: a.p_op_key as string, coach_id: a.p_coach_id as string, plan_version_id: a.p_plan_version_id as string, session_key: a.p_session_key as string, path: a.p_path as string, athlete_ref: a.p_athlete_ref as string, payload_sha256: a.p_payload_sha256 as string, state: "sending", remote_id: null, detail: null }); return { data: { claimed: true }, error: null }; }
        if (clash.coach_id !== a.p_coach_id) return { data: null, error: { message: "nolio_v2_ledger_coach_mismatch" } };
        return { data: { claimed: false, existing: { opKey: clash.op_key, planVersionId: clash.plan_version_id, sessionKey: clash.session_key, path: clash.path, athleteRef: clash.athlete_ref, payloadSha256: clash.payload_sha256, apiVersion: "v2", state: clash.state, remoteId: clash.remote_id, detail: clash.detail } }, error: null };
      }
      if (fn === "nolio_v2_transition_operation") {
        const r = rows.get(a.p_op_key as string);
        if (!r || r.coach_id !== a.p_coach_id || r.state !== a.p_from) return { data: false, error: null };
        if (a.p_to === "confirmed" && !(a.p_remote_id ?? r.remote_id)) return { data: null, error: { message: "nv2_confirmed_has_remote" } };
        r.state = a.p_to as LedgerState; r.remote_id = (a.p_remote_id as string | null) ?? r.remote_id; r.detail = a.p_detail as string | null;
        return { data: true, error: null };
      }
      return { data: null, error: { message: "unknown_fn" } };
    },
  };
  return { rows, calls, client, failOnce: (k: "claim" | "transition") => { failNext = k; } };
}
const ops = () => mapPlanToNolioV2([session()], REFS).operations;

describe("journal durable via RPC atomiques (adaptateur réellement utilisé par l'Edge V2)", () => {
  it("deux exécutions concurrentes sur un journal initialement VIDE ⇒ un seul POST, l'autre STOPPED_IN_FLIGHT sans renvoi", async () => {
    const db = fakeRpc(); let posts = 0; let release!: () => void; const gate = new Promise<void>((r) => { release = r; });
    const http: NolioV2Http = { post: async () => { posts++; await gate; return { kind: "response", status: 201, json: { id: "ptrn_SYNTHA" } }; },
      listPage: async () => ({ ok: true, items: [], hasMore: false }), getDetail: async () => ({ ok: false, detail: "none" }) };
    const run = () => sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: ops(), ledger: supabaseNolioV2Ledger(db.client, COACH), http });
    const a = run(), b = run();
    // Le perdant voit "sending" (requête du gagnant encore en vol) et un calendrier vide.
    const first = await Promise.race([a, b]);
    expect(first.status).toBe("STOPPED_IN_FLIGHT");
    release(); const both = await Promise.all([a, b]);
    expect(both.map((x) => x.status).sort()).toEqual(["DONE", "STOPPED_IN_FLIGHT"]); expect(posts).toBe(1);
    expect([...db.rows.values()][0]).toMatchObject({ state: "confirmed", remote_id: "ptrn_SYNTHA" });
  });
  it("panne AVANT claim ⇒ STOPPED_LEDGER_UNAVAILABLE, zéro POST", async () => {
    const db = fakeRpc(); db.failOnce("claim"); const post = vi.fn();
    const r = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: ops(), ledger: supabaseNolioV2Ledger(db.client, COACH), http: { post, listPage: vi.fn(), getDetail: vi.fn() } });
    expect(r.status).toBe("STOPPED_LEDGER_UNAVAILABLE"); expect(post).not.toHaveBeenCalled(); expect(db.rows.size).toBe(0);
  });
  it("panne APRÈS claim (transition perdue après 201) ⇒ non confirmé ; relance ⇒ réconciliation, jamais 2e POST", async () => {
    const db = fakeRpc(); const posts: unknown[] = [];
    const http: NolioV2Http = { post: async (_p, b) => { posts.push(b); db.failOnce("transition"); return { kind: "response", status: 201, json: { id: "ptrn_SYNTHB" } }; },
      listPage: async () => ({ ok: false, detail: "read_unavailable" }), getDetail: async () => ({ ok: false, detail: "read_unavailable" }) };
    const ledger = supabaseNolioV2Ledger(db.client, COACH);
    const r1 = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: ops(), ledger, http });
    expect(r1.status).toBe("STOPPED_UNCONFIRMED");
    expect([...db.rows.values()][0].state).toBe("sending"); // la réservation durable subsiste
    const r2 = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: ops(), ledger, http });
    expect(r2.status).toBe("STOPPED_UNCONFIRMED"); expect(r2.reason).toMatch(/reconcile_read_failed/);
    expect(posts).toHaveLength(1);
  });
  it("journal d'un autre coach ou état déprécié ⇒ exception ⇒ arrêt sans POST", async () => {
    const db = fakeRpc(); const post = vi.fn();
    await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: ops(), ledger: supabaseNolioV2Ledger(db.client, COACH), http: { post: async () => ({ kind: "lost", detail: "x" }), listPage: vi.fn(), getDetail: vi.fn() } });
    const other = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: ops(), ledger: supabaseNolioV2Ledger(db.client, "00000000-0000-4000-8000-000000000000"), http: { post, listPage: vi.fn(), getDetail: vi.fn() } });
    expect(other.status).toBe("STOPPED_LEDGER_UNAVAILABLE"); expect(post).not.toHaveBeenCalled();
    const bad: RpcClient = { rpc: async () => ({ data: { claimed: false, existing: { opKey: "k", planVersionId: PV, sessionKey: "s", path: "p", athleteRef: "usr_A", payloadSha256: "x", apiVersion: "v2", state: "prepared" } }, error: null }) };
    await expect(supabaseNolioV2Ledger(bad, COACH).claim({ opKey: "k", planVersionId: PV, sessionKey: "s", path: "p", athleteRef: "usr_A", payloadSha256: "x", apiVersion: "v2", state: "sending", remoteId: null, detail: null })).rejects.toThrow(/ledger_state_unknown:prepared/);
  });
  it("contenu divergent pour la même séance/version ⇒ BLOCKED ledger_divergence", async () => {
    const db = fakeRpc(); const ledger = supabaseNolioV2Ledger(db.client, COACH);
    await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: ops(), ledger, http: { post: async () => ({ kind: "lost", detail: "x" }), listPage: vi.fn(), getDetail: vi.fn() } });
    const changed = mapPlanToNolioV2([session({ title: "Autre titre" })], REFS).operations;
    const post = vi.fn();
    const r = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: changed, ledger, http: { post, listPage: vi.fn(), getDetail: vi.fn() } });
    expect(r.status).toBe("BLOCKED"); expect(r.reason).toMatch(/ledger_divergence/); expect(post).not.toHaveBeenCalled();
  });
});

describe("réconciliation conservatrice : contre-exemples (même nom/date/sport, contenu différent)", () => {
  const prime = async () => {
    const db = fakeRpc(); const ledger = supabaseNolioV2Ledger(db.client, COACH); const o = ops();
    await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger, http: { post: async () => ({ kind: "lost", detail: "timeout" }), listPage: vi.fn(), getDetail: vi.fn() } });
    return { ledger, o, sent: await bodyToSend(PV, o[0]) as Record<string, unknown> };
  };
  const remoteWith = (sent: Record<string, unknown>, mutate: (x: Record<string, unknown>) => void, pages = 1) => {
    const item = JSON.parse(JSON.stringify({ ...sent, id: "ptrn_SYNTHR" })); mutate(item);
    const post = vi.fn();
    const http: NolioV2Http = {
      post,
      listPage: async (_p, _a, _d, after) => {
        if (pages === 2 && after === null) return { ok: true, items: [{ id: "ptrn_OTHER0", name: "x", date_start: "2026-01-01", sport: "spt_X" }], hasMore: true };
        return { ok: true, items: [{ id: "ptrn_SYNTHR", name: item.name, date_start: item.date_start, sport: item.sport, description: item.description }], hasMore: false };
      },
      getDetail: async (_p, id) => ({ ok: true, item: id === "ptrn_SYNTHR" ? item : { id } }),
    };
    return { http, post };
  };
  const cases: Array<[string, (x: Record<string, unknown>) => void]> = [
    ["durée 9999 s au lieu de 46 min", (x) => { x.duration = { value: 9999, unit: "s" }; }],
    ["dose d'un bloc modifiée", (x) => { ((x.workout as Array<Record<string, unknown>>)[0].duration as { value: number }).value = 601; }],
    ["répétitions modifiées", (x) => { (x.workout as Array<Record<string, unknown>>)[1].times = 5; }],
    ["récupération modifiée", (x) => { const st = ((x.workout as Array<Record<string, unknown>>)[1].steps as Array<Record<string, unknown>>); (st.at(-1)!.duration as { value: number }).value = 90; }],
    ["cible modifiée", (x) => { const st = ((x.workout as Array<Record<string, unknown>>)[1].steps as Array<Record<string, unknown>>); ((st[0].targets as Array<Record<string, unknown>>)[0]).value = 4; }],
    ["RPE modifié", (x) => { ((x.workout as Array<Record<string, unknown>>)[0].targets as Array<Record<string, unknown>>).splice(0, 1, { type: "rpe", rpe: 5 }); }],
    ["heure ajoutée", (x) => { x.time = "07:00"; }],
    ["audience différente", (x) => { x.athletes = ["usr_SYNTH1", "usr_SYNTH2"]; }],
    ["provenance/description éditée", (x) => { x.description = String(x.description).replace("[TFCLab-QA", "[edited"); }],
    ["structure partielle (bloc retiré)", (x) => { (x.workout as unknown[]).pop(); }],
  ];
  it.each(cases)("%s ⇒ ambiguous, aucun faux succès, aucun POST", async (_n, mutate) => {
    const { ledger, o, sent } = await prime(); const { http, post } = remoteWith(sent, mutate, 2);
    const r = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger, http });
    expect(r.status).toBe("STOPPED_AMBIGUOUS"); expect(post).not.toHaveBeenCalled();
  });
  it("contenu identique sur 2e page ⇒ confirmé (pagination complète + détail)", async () => {
    const { ledger, o, sent } = await prime(); const { http, post } = remoteWith(sent, () => {}, 2);
    const r = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger, http });
    expect(r.results[0]).toMatchObject({ state: "confirmed", remoteId: "ptrn_SYNTHR" }); expect(post).not.toHaveBeenCalled();
  });
  it("lecture vide (visibilité différée) ⇒ arrêt, aucun 2e POST", async () => {
    const { ledger, o } = await prime(); const post = vi.fn();
    const r = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger, http: { post, listPage: async () => ({ ok: true, items: [], hasMore: false }), getDetail: vi.fn() } });
    expect(r.status).toBe("STOPPED_UNCONFIRMED"); expect(post).not.toHaveBeenCalled();
  });
});

describe("transport fetch injecté (aucun réseau réel)", () => {
  const mk = (impl: FetchLike) => fetchNolioV2Http({ fetch: impl, accessToken: "tok_SYNTH", timeoutMs: 20 });
  it("POST : hôte et route du contrat, slash final, en-têtes, pas de redirection", async () => {
    const f = vi.fn<FetchLike>(async () => ({ status: 201, text: async () => '{"id":"ptrn_SYNTH1"}' }));
    const r = await mk(f).post("/api/v2/planned/trainings/", { a: 1 });
    expect(r).toEqual({ kind: "response", status: 201, json: { id: "ptrn_SYNTH1" } });
    expect(f.mock.calls[0][0]).toBe("https://www.nolio.io/api/v2/planned/trainings/");
    expect(f.mock.calls[0][1]).toMatchObject({ method: "POST", redirect: "error", headers: { Authorization: "Bearer tok_SYNTH" } });
  });
  it("route non autorisée et dry_run refusés sans appel", async () => {
    const f = vi.fn<FetchLike>();
    expect((await mk(f).post("/api/v2/planned/trainings", {})).kind).toBe("response");
    expect(await mk(f).post("/api/v2/planned/trainings/", { dry_run: true })).toMatchObject({ status: 0 });
    expect(f).not.toHaveBeenCalled();
  });
  it("timeout / réseau / 2xx illisible ⇒ lost (peut avoir été créé)", async () => {
    const hang: FetchLike = (_u, i) => new Promise((_r, rej) => i.signal?.addEventListener("abort", () => rej(Object.assign(new Error("a"), { name: "AbortError" }))));
    expect(await mk(hang).post("/api/v2/planned/trainings/", {})).toEqual({ kind: "lost", detail: "timeout" });
    expect(await mk(async () => { throw new TypeError("x"); }).post("/api/v2/planned/trainings/", {})).toEqual({ kind: "lost", detail: "network_error" });
    expect(await mk(async () => ({ status: 201, text: async () => "<html>" })).post("/api/v2/planned/trainings/", {})).toEqual({ kind: "lost", detail: "2xx_body_not_json" });
  });
});

describe("validation runtime entrée V400 / sortie V2", () => {
  const reason = (s: PlanSessionInput, refs = REFS) => mapPlanToNolioV2([s], refs).refusals[0]?.reason ?? "OK";
  it("nominal accepté", () => expect(reason(session())).toBe("OK"));
  it.each([
    ["date impossible", session({ date: "2026-02-30" }), /^date_invalid$/],
    ["dose à deux axes", (() => { const w = W(); (w.nodes[0] as { dose: object }).dose = { seconds: 600, meters: 100 }; return session({ detStructuredWorkout: w }); })(), /dose_must_have_exactly_one_axis/],
    ["dose NaN", (() => { const w = W(); (w.nodes[0] as { dose: object }).dose = { seconds: NaN }; return session({ detStructuredWorkout: w }); })(), /not_finite_positive/],
    ["dose négative", (() => { const w = W(); (w.nodes[0] as { dose: object }).dose = { seconds: -5 }; return session({ detStructuredWorkout: w }); })(), /not_finite_positive/],
    ["métrique inconnue", (() => { const w = W(); (w.nodes[0] as { target: object }).target = { metric: "kcal", min: 1, max: 2 }; return session({ detStructuredWorkout: w }); })(), /target_metric_unknown/],
    ["répétition vide", (() => { const w = W(); (w.nodes[1] as { steps: unknown[] }).steps = []; return session({ detStructuredWorkout: w }); })(), /nodes_empty/],
    ["durée incohérente avec les blocs", (() => { const w = W(); w.exactSeconds = 2700; return session({ detStructuredWorkout: w }); })(), /exact_seconds_differs_from_blocks/],
    ["clé inconnue", (() => { const w = W() as unknown as Record<string, unknown>; w.extra = 1; return session({ detStructuredWorkout: w as unknown as DetWorkout }); })(), /workout_unknown_keys/],
  ])("%s ⇒ refus", (_n, s, re) => expect(reason(s)).toMatch(re));
  it("aucun arrondi silencieux : allure non entière conservée exactement en m/s", () => {
    const w = W(); ((w.nodes[1] as { steps: Array<{ target: object }> }).steps[0]).target = { metric: "sec_per_km", min: 233.4, max: 247.6 };
    const b = mapPlanToNolioV2([session({ detStructuredWorkout: w })], REFS).operations[0].body;
    const t = ((b.workout as Array<{ steps?: Array<{ targets: Array<{ value: number; value_max: number }> }> }>)[1].steps![0].targets[0]);
    expect(t.value).toBe(1000 / 247.6); expect(t.value_max).toBe(1000 / 233.4);
    expect(detWorkoutProblems(w)).toEqual([]);
  });
});

describe("créneaux coach : conservés du plan sauvegardé jusqu'au payload, DST V401", () => {
  const start = (localDate: string, minuteOfDay: number, utcOffsetMinutes: number) => ({ provenance: "coach_confirmed" as const, localDate, minuteOfDay, timeZone: "Europe/Brussels", utcOffsetMinutes });
  const plan = (coachStart?: object) => ({ _planStartDate: "2026-11-02", weeks: [{ weekNumber: 1, sessions: [
    { weekNumber: 1, dayIndex: 0, isRest: true, title: "Repos", sport: "rest" },
    { weekNumber: 1, dayIndex: 2, title: "Seuil 4×6'", sport: "run", catalogId: "V3P_RUN_T", durationMin: 46, details: "4×6' seuil", detStructuredWorkout: W(), ...(coachStart ? { coachStart } : {}) },
  ] }] });
  it("extraction : clé/date dérivées, créneau conservé à l'identique", () => {
    const st = start("2026-11-04", 1080, 60);
    const ex = sessionsFromPlanJson(plan(st));
    expect(ex.problems).toEqual([]);
    expect(ex.sessions[1]).toMatchObject({ sessionKey: "S1-J2-1", date: "2026-11-04", coachStart: st });
  });
  it("HH:MM transmis seulement si fuseau calendrier Nolio confirmé et identique", () => {
    const s = sessionsFromPlanJson(plan(start("2026-11-04", 1080, 60))).sessions;
    expect(mapPlanToNolioV2(s, REFS).operations[0].body.time).toBe("18:00");
    expect(mapPlanToNolioV2(s, { ...REFS, calendarTimeZone: null }).refusals[0].reason).toBe("athlete_calendar_timezone_unconfirmed");
    expect(mapPlanToNolioV2(s, { ...REFS, calendarTimeZone: "Europe/London" }).refusals[0].reason).toBe("athlete_calendar_timezone_differs");
    const noStart = sessionsFromPlanJson(plan()).sessions;
    expect("time" in mapPlanToNolioV2(noStart, { ...REFS, calendarTimeZone: null }).operations[0].body).toBe(false);
  });
  it("DST : 01:00 conservé, 02:30 printemps inexistant refusé, 02:30 automne ambigu sans choix refusé", () => {
    expect(resolveLocalInstant("Europe/Brussels", "2027-03-28", 60)).toEqual({ status: "ok", utcOffsetMinutes: 60 });
    const mk = (d: string, m: number, off: number) => [{ ...session({ date: d, sessionKey: "K" }), coachStart: start(d, m, off) }];
    expect(mapPlanToNolioV2(mk("2027-03-28", 60, 60), REFS).operations[0].body.time).toBe("01:00");
    expect(mapPlanToNolioV2(mk("2027-03-28", 150, 60), REFS).refusals[0].reason).toBe("start_time_nonexistent_dst");
    expect(mapPlanToNolioV2(mk("2026-10-25", 150, 60), REFS).refusals.length).toBe(0); // offset = 2e occurrence choisie explicitement
    expect(mapPlanToNolioV2(mk("2026-10-25", 150, 30), REFS).refusals[0].reason).toBe("start_time_ambiguous_without_choice");
    expect(mapPlanToNolioV2(mk("2026-11-04", 1080, 120), REFS).refusals[0].reason).toBe("start_offset_mismatch");
  });
});

describe("fonction Edge V2 (contrôle statique de l'ordre des gardes)", () => {
  const src = readFileSync("supabase/functions/nolio-v2-send-plan/index.ts", "utf8");
  const code = src.split("\n").filter((l) => !/^\s*(\*|\/\/|\/\*\*)/.test(l)).join("\n");
  it("getClaims avant lecture du plan, propriété avant service-role, BLOCKED avant tout réseau", () => {
    const i = (s: string) => code.indexOf(s);
    expect(i("getClaims")).toBeGreaterThan(0);
    expect(i("getClaims")).toBeLessThan(i('from("plan_versions")'));
    expect(i('from("plan_versions")')).toBeLessThan(i('from("athletes")'));
    expect(i('from("athletes")')).toBeLessThan(i("SUPABASE_SERVICE_ROLE_KEY"));
    expect(i("SUPABASE_SERVICE_ROLE_KEY")).toBeLessThan(i("loadV2ConnectionWithRefresh(admin"));
    expect(i("loadV2ConnectionWithRefresh(admin")).toBeLessThan(i('status: "BLOCKED"'));
    expect(i('status: "BLOCKED"')).toBeLessThan(i("fetchNolioV2Http("));
    expect(code).not.toMatch(/function loadV2ConnectionWithRefresh/); // plus de stub local codé en dur
    expect(code).toMatch(/preparePlan\(/); expect(i("realSendGate(")).toBeLessThan(i("sendPlannedV2({")); expect(code).toMatch(/sendPlannedV2\(/); expect(code).toMatch(/fetchNolioV2Http\(/);
  });
  it("aucune ressource V1 (jetons, routes, id_partner) ni drapeau dry_run (tables de preuve de simulation relues seulement)", () => {
    expect(code).not.toMatch(/nolio_tokens|\/api\/get\/|\/api\/create|id_partner|NOLIO_CLIENT|dry_run\s*:|"dry_run"|dryRun\s*:|forceDryRun|postDryRun/);
    expect(code.replace(/qa_nolio_v2_plan_dry_run_(jobs|receipts)/g, "")).not.toMatch(/dry_run/);
  });
});
