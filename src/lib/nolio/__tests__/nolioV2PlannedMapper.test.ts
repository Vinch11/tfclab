/**
 * Nolio V2 — mapping et expéditeur hors réseau sur les 4 marathons DET réels.
 * Références Nolio SYNTHÉTIQUES (usr_SYNTH…/spt_SYNTH…), jamais réelles.
 * Validation locale ≠ dry_run serveur : aucun appel Nolio n'est fait ici.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { DET_LAB_SCENARIOS, DET_LAB_PLAN_START, runDetLabScenario } from "@/qa/det-lab/detLab";
import {
  mapPlanToNolioV2, mapTarget, semanticViolations, type NolioV2Refs, type PlanSessionInput, type V2Node, type DetWorkout,
} from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";
import {
  sendPlannedV2, checkV2OAuthConfig, operationKey, bodyToSend, type LedgerEntry, type NolioV2Http, type NolioV2Ledger,
} from "../../../../supabase/functions/_shared/nolioV2/plannedClient";

const REFS: NolioV2Refs = {
  synthetic: true, athleteId: "usr_SYNTH1",
  sportIds: { run: "spt_SYNTHRUN", bike: "spt_SYNTHBIKE" }, exerciseIds: {},
  competition: null,
};
const plans = new Map<string, PlanSessionInput[]>();
const accepted = DET_LAB_SCENARIOS.filter((s) => s.expectation === "accepted");
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); });
  for (const sc of accepted) {
    const o = runDetLabScenario(sc.id, { engineVersion: "a".repeat(64) });
    if (o.kind !== "accepted") throw new Error(`${sc.id}:${o.kind}`);
    plans.set(sc.id, o.plan.weeks.flatMap((w) => (w.sessions as unknown as Array<Record<string, unknown>>).map((s, i) => ({
      ...(s as object), sessionKey: `S${w.weekNumber}-J${s.dayIndex}-${i}`,
      date: addDays(DET_LAB_PLAN_START, (w.weekNumber - 1) * 7 + (s.dayIndex as number)),
    }) as unknown as PlanSessionInput)));
  }
}, 600000);

const leaves = (ns: V2Node[]): V2Node[] => ns.flatMap((n) => (n.kind === "repeat" ? leaves(n.steps) : [n]));
const secondsV2 = (ns: V2Node[]): number => ns.reduce((t, n) => {
  if (n.kind === "repeat") { const inner = secondsV2(n.steps); const last = n.skip_last ? (n.steps.at(-1) as { duration?: { value: number } }).duration!.value : 0; return t + n.times * inner - last; }
  if (n.kind === "step") return t + (n.duration ? n.duration.value : NaN);
  return NaN;
}, 0);
const secondsDet = (w: DetWorkout["nodes"]): number => w.reduce((t, n) => t + (n.kind === "repeat" ? n.count * secondsDet(n.steps) + (n.count - 1) * n.betweenSec : "seconds" in n.dose ? n.dose.seconds : NaN), 0);

describe("4 marathons DET → opérations planned V2 (même module que l'expéditeur)", () => {
  it("4 scénarios", () => expect(accepted).toHaveLength(4));
  for (const sc of accepted) {
    it(`${sc.id} : séances fidèles, refus explicites, course non inventée`, () => {
      const ss = plans.get(sc.id)!;
      const r = mapPlanToNolioV2(ss, REFS);
      const nonRest = ss.filter((s) => !s.isRest);
      expect(r.operations.length + r.refusals.length).toBe(nonRest.length);
      for (const op of r.operations) {
        expect(op.kind).toBe("training");
        const s = ss.find((x) => x.sessionKey === op.sessionKey)!;
        const w = s.detStructuredWorkout!;
        expect(op.sourceId).toBe(s.catalogId);
        expect(op.body).toMatchObject({ name: s.title, date_start: s.date, athletes: ["usr_SYNTH1"], duration: { value: w.chosenDurationMin, unit: "min" } });
        expect("id_partner" in op.body).toBe(false);
        const nodes = op.body.workout as V2Node[];
        expect(semanticViolations(nodes)).toEqual([]);
        if (w.exactSeconds !== null) expect(secondsV2(nodes)).toBeCloseTo(secondsDet(w.nodes), 9);
        // Pas de repos après la dernière répétition.
        for (const n of nodes) if (n.kind === "repeat" && n.steps.at(-1)!.kind === "step" && (n.steps.at(-1) as { intensity?: string }).intensity === "rest") expect(n.skip_last).toBe(true);
      }
      const reasons = r.refusals.map((x) => x.reason.split(":")[0]);
      // Course : identité d'événement non confirmée ⇒ refus, jamais une séance inventée.
      expect(r.refusals.some((x) => x.reason === "competition_identity_unconfirmed")).toBe(true);
      // Force : aucun id d'exercice confirmé ⇒ refus explicite.
      for (const x of reasons) expect(["competition_identity_unconfirmed", "exercise_reference_missing", "det_structure_absent", "sport_reference_missing", "main_step_without_domain", "open_fast_bound_unrepresentable"]).toContain(x);
      console.info("NV2", sc.id, JSON.stringify({ ops: r.operations.length, refusals: Object.fromEntries([...new Set(reasons)].map((k) => [k, reasons.filter((y) => y === k).length])) }));
    });
  }

  it("course confirmée ⇒ planned/competitions sans workout ni recette", () => {
    const ss = plans.get(accepted[0].id)!;
    const race = ss.find((s) => !s.catalogId && !s.isRest)!;
    const name = race.title.slice("COURSE : ".length);
    const r = mapPlanToNolioV2([race], { ...REFS, competition: { date: race.date, name, sport: race.sport } });
    expect(r.operations).toHaveLength(1);
    expect(r.operations[0]).toMatchObject({ kind: "competition", path: "/api/v2/planned/competitions/", body: { name, date_start: race.date } });
    expect("goal_type" in r.operations[0].body).toBe(false);
    // Identité différente de la source (nom libre, priorité absente de la source) ⇒ refus.
    expect(mapPlanToNolioV2([race], { ...REFS, competition: { date: race.date, name: "Marathon QA", sport: race.sport } }).refusals[0].reason).toBe("competition_name_mismatch");
    expect(mapPlanToNolioV2([race], { ...REFS, competition: { date: race.date, name, sport: race.sport, goalType: "a" } }).refusals[0].reason).toBe("competition_priority_mismatch");
    expect("workout" in r.operations[0].body).toBe(false);
    expect(mapPlanToNolioV2([race], { ...REFS, competition: { date: "2099-01-01", name: "X", sport: "run" } }).refusals[0].reason).toBe("competition_date_mismatch");
  });
});

describe("sabotages", () => {
  const base = (): PlanSessionInput => {
    const s = plans.get(accepted[0].id)!.find((x) => x.catalogId === "V3P_RUN_136")!;
    return JSON.parse(JSON.stringify(s));
  };
  const reason = (s: PlanSessionInput, refs = REFS) => mapPlanToNolioV2([s], refs).refusals[0]?.reason ?? "OK";
  it("nominal V3P_RUN_136 : 4×6 min, 3 pauses de 180 s, skip_last", () => {
    const op = mapPlanToNolioV2([base()], REFS).operations[0];
    const rep = (op.body.workout as V2Node[]).find((n) => n.kind === "repeat")!;
    expect(rep).toMatchObject({ kind: "repeat", times: 4, skip_last: true });
    expect((rep as { steps: V2Node[] }).steps.at(-1)).toMatchObject({ intensity: "rest", duration: { value: 180, unit: "s" } });
  });
  it("structure absente / source différente / durée différente / sport différent", () => {
    const a = base(); delete a.detStructuredWorkout; expect(reason(a)).toMatch(/^det_structure_absent/);
    const b = base(); b.catalogId = "V3P_RUN_001"; expect(reason(b)).toBe("det_structure_source_mismatch");
    const c = base(); c.durationMin = (c.durationMin ?? 0) + 1; expect(reason(c)).toBe("det_structure_duration_mismatch");
    const d = base(); d.sport = "bike"; expect(reason(d)).toBe("det_structure_sport_mismatch");
  });
  it("aucun id inventé : sport absent, athlète non opaque", () => {
    expect(reason(base(), { ...REFS, sportIds: {} })).toBe("sport_reference_missing:run");
    expect(mapPlanToNolioV2([base()], { ...REFS, athleteId: "12345" }).refusals[0].reason).toBe("athlete_reference_not_opaque");
  });
  it("doublon de séance refusé", () => expect(mapPlanToNolioV2([base(), base()], REFS).refusals[0].reason).toBe("duplicate_session_key"));
  it("cibles : plafond zéro documenté, bornes inversées, allure exacte en m/s sans arrondi", () => {
    const n: string[] = [];
    expect(mapTarget({ metric: "watts", min: null, max: 180 }, n)).toEqual({ type: "raw", value: 0, value_max: 180, unit: "W" });
    expect(mapTarget({ metric: "watts", min: 200, max: 180 }, n)).toBe("target_bounds_inverted");
    expect(mapTarget({ metric: "sec_per_km", min: 233, max: 247.4 }, n)).toEqual({ type: "raw", value: 1000 / 247.4, value_max: 1000 / 233, unit: "m/s" });
    expect(n[0]).toMatch(/exactement en m\/s/);
    expect(mapTarget({ metric: "coach_rpe_load", min: 6, max: 7 }, n)).toEqual({ type: "rpe", rpe: 6, rpe_max: 7 });
    expect(mapTarget({ metric: "coach_rpe_load", min: 6.5, max: 7 }, n)).toBe("rpe_not_integer");
    expect(mapTarget({ metric: "sec_per_km", min: null, max: 300 }, n)).toBe("open_fast_bound_unrepresentable");
  });
  it("force : fenêtre de temps conservée, un seul axe, id exercice requis et opaque", () => {
    const w: DetWorkout = { schema: "det-structured-workout-v1", sourceId: "V3P_STRENGTH_X", sport: "strength", chosenDurationMin: 1, exactSeconds: 60,
      nodes: [{ kind: "step", role: "main", label: "Squat", domain: null, dose: { seconds: 60 }, repsTarget: 8, rpe: { min: 6, max: 7 }, target: null }] };
    const s: PlanSessionInput = { sessionKey: "K", date: "2026-11-02", title: "Force", sport: "strength", catalogId: "V3P_STRENGTH_X", durationMin: 1, detStructuredWorkout: w };
    expect(reason(s)).toBe("sport_reference_missing:strength");
    const refs = { ...REFS, sportIds: { ...REFS.sportIds, strength: "spt_SYNTHSTR" } };
    expect(reason(s, refs)).toBe("exercise_reference_missing:Squat");
    expect(reason(s, { ...refs, exerciseIds: { Squat: "squat" } })).toBe("exercise_reference_not_opaque:Squat");
    const op = mapPlanToNolioV2([s], { ...refs, exerciseIds: { Squat: "exf_SYNTHSQ" } }).operations[0];
    expect(op.body.workout).toEqual([{ kind: "exercise", exercise: "exf_SYNTHSQ", comment: "Squat", sets: [{ duration: { value: 60, unit: "s" }, comment: "objectif 8 répétitions dans la fenêtre", targets: [{ type: "rpe", rpe: 6, rpe_max: 7 }] }] }]);
  });
  it("règles sémantiques hors JSON Schema", () => {
    expect(semanticViolations([{ kind: "step", duration: { value: 1, unit: "s" }, distance: { value: 1, unit: "m" }, targets: [{ type: "no_target" }] }])).toContain("0:step_duration_and_distance");
    expect(semanticViolations([{ kind: "exercise", exercise: "exf_A", sets: [{ reps: 5, duration: { value: 3, unit: "s" } }] }])).toContain("0:set_axis_count");
    expect(semanticViolations([{ kind: "step", duration: { value: 1, unit: "s" }, targets: [{ type: "raw", value: 5, value_max: 4, unit: "W" }] }])).toContain("0:raw_bounds_inverted");
  });
});
describe("expéditeur V2 : même opérations, journal durable, réponses perdues", () => {
  const PV = "30909fcd-c421-4e35-b6ed-cbf1436fe77e";
  const memLedger = () => {
    const m = new Map<string, LedgerEntry>();
    const l: NolioV2Ledger = {
      claim: async (e) => { const ex = m.get(e.opKey); if (ex) return { claimed: false, existing: ex }; m.set(e.opKey, { ...e }); return { claimed: true }; },
      transition: async (k, from, to, patch) => { const ex = m.get(k); if (!ex || ex.state !== from) return false; m.set(k, { ...ex, state: to, remoteId: patch.remoteId ?? ex.remoteId, detail: patch.detail ?? ex.detail }); return true; },
    };
    return { m, l };
  };
  const emptyList = { listPage: async () => ({ ok: true as const, items: [], hasMore: false }), getDetail: async () => ({ ok: false as const, detail: "none" }) };
  const conn = { apiVersion: "v2" as const, mode: "test-mock" as const, grantedScopes: ["planned:read", "planned:write"] };
  const ops = () => mapPlanToNolioV2(plans.get(accepted[0].id)!, REFS).operations.slice(0, 3);

  it("sans connexion V2 autorisée (état QA actuel) ⇒ BLOCKED, zéro appel", async () => {
    const http = { post: vi.fn(), listPage: vi.fn(), getDetail: vi.fn() };
    const r = await sendPlannedV2({ connection: null, refs: REFS, planVersionId: PV, operations: ops(), ledger: memLedger().l, http });
    expect(r.status).toBe("BLOCKED"); expect(http.post).not.toHaveBeenCalled();
  });
  it("mode réel + références synthétiques ⇒ BLOCKED ; scopes manquants ⇒ BLOCKED", async () => {
    const http = { post: vi.fn(), listPage: vi.fn(), getDetail: vi.fn() };
    expect((await sendPlannedV2({ connection: { ...conn, mode: "real" }, refs: REFS, planVersionId: PV, operations: ops(), ledger: memLedger().l, http })).reason).toBe("synthetic_references_refused_for_real_send");
    expect((await sendPlannedV2({ connection: { ...conn, grantedScopes: ["planned:read"] }, refs: REFS, planVersionId: PV, operations: ops(), ledger: memLedger().l, http })).reason).toBe("scopes_missing:planned:write");
    expect(http.post).not.toHaveBeenCalled();
  });
  it("corps envoyés = corps du mapper + marqueur ; succès confirmé ; relance ⇒ aucun doublon", async () => {
    const { l } = memLedger(); const sent: unknown[] = []; let n = 0;
    const http: NolioV2Http = { post: async (_p, b) => { sent.push(b); return { kind: "response", status: 201, json: { id: `ptrn_SYNTH${n++}` } }; }, ...emptyList };
    const o = ops();
    expect((await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger: l, http })).status).toBe("DONE");
    expect(sent).toEqual(await Promise.all(o.map((x) => bodyToSend(PV, x))));
    const again = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger: l, http });
    expect(again.results.every((x) => x.state === "skipped_confirmed")).toBe(true);
    expect(sent).toHaveLength(o.length);
  });
  it("deux envois concurrents ⇒ un seul POST (réservation atomique)", async () => {
    const { l } = memLedger(); const o = ops().slice(0, 1); let posts = 0;
    const http: NolioV2Http = { post: async () => { posts++; await new Promise((r) => setTimeout(r, 20)); return { kind: "response", status: 201, json: { id: "ptrn_SYNTHC" } }; }, ...emptyList };
    const [a, b] = await Promise.all([1, 2].map(() => sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger: l, http })));
    expect(posts).toBe(1);
    expect([a.status, b.status].sort()).toEqual(["DONE", "STOPPED_IN_FLIGHT"]);
  });
  it("réponse perdue ⇒ non confirmé ; relance réconcilie AVANT tout POST (détail exact)", async () => {
    const { l, m } = memLedger(); const o = ops().slice(0, 1); const posts: unknown[] = [];
    const lost: NolioV2Http = { post: async (_p, b) => { posts.push(b); return { kind: "lost", detail: "timeout" }; }, ...emptyList };
    expect((await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger: l, http: lost })).status).toBe("STOPPED_UNCONFIRMED");
    expect([...m.values()][0].state).toBe("sent_unconfirmed");
    const sentBody = posts[0] as Record<string, unknown>;
    const found: NolioV2Http = { post: async () => { throw new Error("NO_POST_EXPECTED"); },
      listPage: async () => ({ ok: true as const, items: [{ id: "ptrn_SYNTHX", name: sentBody.name, date_start: sentBody.date_start, sport: sentBody.sport, description: sentBody.description }], hasMore: false }),
      getDetail: async () => ({ ok: true as const, item: { ...sentBody, id: "ptrn_SYNTHX" } }) };
    const r = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger: l, http: found });
    expect(r.results[0]).toEqual({ sessionKey: o[0].sessionKey, state: "confirmed", remoteId: "ptrn_SYNTHX" });
    expect(posts).toHaveLength(1);
  });
  it("lecture impossible / absent ⇒ arrêt sans POST ; correspondances multiples ⇒ ambiguous", async () => {
    const { l, m } = memLedger(); const o = ops().slice(0, 1); const sb = await bodyToSend(PV, o[0]);
    const { opKey, payloadSha256 } = await operationKey(PV, o[0]);
    m.set(opKey, { opKey, planVersionId: PV, sessionKey: o[0].sessionKey, path: o[0].path, athleteRef: "usr_SYNTH1", payloadSha256, apiVersion: "v2", state: "sent_unconfirmed", remoteId: null, detail: null });
    const post = vi.fn();
    expect((await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger: l, http: { post, listPage: async () => ({ ok: false as const, detail: "503" }), getDetail: emptyList.getDetail } })).status).toBe("STOPPED_UNCONFIRMED");
    expect((await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger: l, http: { post, ...emptyList } })).status).toBe("STOPPED_UNCONFIRMED");
    const two = ["ptrn_A", "ptrn_B"].map((id) => ({ id, name: sb.name, date_start: sb.date_start, sport: sb.sport }));
    expect((await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger: l, http: { post, listPage: async () => ({ ok: true as const, items: two, hasMore: false }), getDetail: async (_p, id) => ({ ok: true as const, item: { ...sb, id } }) } })).status).toBe("STOPPED_AMBIGUOUS");
    expect(post).not.toHaveBeenCalled();
  });
  it("rejet explicite 400 ⇒ rejected ; 5xx ⇒ non confirmé (peut avoir été créé)", async () => {
    const o = ops().slice(0, 1);
    const r400 = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger: memLedger().l, http: { post: async () => ({ kind: "response", status: 400, json: {} }), ...emptyList } });
    expect(r400.results[0].state).toBe("rejected");
    const r502 = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger: memLedger().l, http: { post: async () => ({ kind: "response", status: 502, json: null }), ...emptyList } });
    expect(r502.status).toBe("STOPPED_UNCONFIRMED");
  });
  it("dry_run : ajoute dry_run:true au même corps, n'écrit pas de confirmation", async () => {
    const { m, l } = memLedger(); const o = ops().slice(0, 1); let seen: Record<string, unknown> | null = null;
    const r = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: o, ledger: l, dryRun: true, http: { post: async (_p, b) => { seen = b as Record<string, unknown>; return { kind: "response", status: 201, json: {} }; }, ...emptyList } });
    expect(seen).toEqual({ ...(await bodyToSend(PV, o[0])), dry_run: true }); expect(r.results[0].state).toBe("dry_run_ok"); expect(m.size).toBe(0);
  });
});

describe("OAuth V2 QA séparé de V1", () => {
  it("refuse le callback V1 de production et exige https + hôte QA + app partenaire/équipe", () => {
    expect(checkV2OAuthConfig({ clientId: "x", appType: "partner", expectedQaHost: "lkjesdacgpolrwfxulbo.supabase.co", redirectUri: "https://wtwjkmawntybyehatkjo.supabase.co/functions/v1/nolio-oauth/callback" }))
      .toEqual(expect.arrayContaining(["redirect_uri_is_v1_production_callback", "redirect_uri_not_qa_host", "redirect_uri_reuses_v1_callback_path"]));
    expect(checkV2OAuthConfig({ clientId: "x", appType: "personal", expectedQaHost: "q.example", redirectUri: "http://q.example/cb" })).toEqual(expect.arrayContaining(["app_type_must_be_partner_or_team", "redirect_uri_not_https"]));
    expect(checkV2OAuthConfig({ clientId: "x", appType: "partner", expectedQaHost: "q.example", redirectUri: "https://q.example/functions/v1/nolio-v2-oauth/callback" })).toEqual([]);
  });
  it("le module V2 ne référence aucune route V1 ni id_partner", () => {
    for (const f of ["plannedMapper.ts", "plannedClient.ts"]) {
      const src = readFileSync(`supabase/functions/_shared/nolioV2/${f}`, "utf8").split("\n").filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//")).join("\n");
      expect(src).not.toMatch(/\/api\/create\/|id_partner\s*:/);
    }
  });
});
