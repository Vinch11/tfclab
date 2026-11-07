import { describe, it, expect, vi, beforeAll } from "vitest";
import { runDetLabScenario } from "@/qa/det-lab/detLab";
import {
  preparePlan, runPlanDryRunBatch, progressOf, opsDigest, manifestOf, type Prepared, type PlanDryRunStore, type OpReceipt, type JobRow, type PostDry,
} from "../../../../supabase/functions/_shared/nolioV2/planDryRun";
import { mapPlanToNolioV2, requiredExerciseLabels, type NolioV2Refs } from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";
import { sessionsFromPlanJson } from "../../../../supabase/functions/_shared/nolioV2/planSessions";
import { postDryRun, canonical, sha256Hex, DRY_RUN_PATHS } from "../../../../supabase/functions/_shared/nolioV2/dryRun";
import { confirmFullPlanDryRun, parsePlanDryResp, runPlanDrySequence, type PlanDryResp } from "@/qa/pilot-review/planDryRunView";

// Références SYNTHÉTIQUES uniquement (aucune vraie valeur Nolio).
const SPORTS = { run: "spt_SYNTHRUN", bike: "spt_SYNTHBIKE", swim: "spt_SYNTHSWIM", strength: "spt_SYNTHSTR" };
const baseRefs = (over: Partial<NolioV2Refs> = {}): NolioV2Refs => ({
  synthetic: true, athleteId: "usr_SYNTH1", sportIds: SPORTS, exerciseIds: {}, competition: null, calendarTimeZone: null, ...over,
});
// Correspondances EXPLICITEMENT confirmées dans le test (libellés exacts des feuilles principales V3).
const SQUAT = "Squat technique contrôlée ; créneau avec micro-pauses et répétitions plafonnées, stop dès perte de qualité";
const RDL = "Charnière hanche soulevé roumain ; créneau avec micro-pauses et répétitions plafonnées, stop dès perte de qualité";
const LUNGE = "Fente arrière assistée ; créneau avec micro-pauses et répétitions plafonnées, stop dès perte de qualité";
const EXERCISES = { [SQUAT]: "exf_SYNTHSQUAT", [RDL]: "exf_SYNTHRDL", [LUNGE]: "exf_SYNTHLUNGE" };
const RACE = { date: "2027-02-14", name: "Marathon", sport: "run" };
const fullRefs = (over: Partial<NolioV2Refs> = {}) => baseRefs({ exerciseIds: EXERCISES, competition: { ...RACE }, ...over });

const PV_DRY = "22222222-2222-4222-8222-222222222222";
let plan: Record<string, unknown>;
beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); });
  const o = runDetLabScenario("marathon-16w-age_group-tte-source-preferred", { engineVersion: "a".repeat(64) });
  if (o.kind !== "accepted") throw new Error(o.kind);
  plan = o.plan as unknown as Record<string, unknown>;
}, 600000);

function memStore() {
  const rec: (OpReceipt & { session_key: string; session_date: string; http_status: number | null; job_id: string })[] = [];
  let job: JobRow | null = null; let lock: string | null = null; let failInsert = false;
  const s: PlanDryRunStore & { rec: typeof rec; failNext(): void } = {
    rec, failNext() { failInsert = true; },
    async freezeJob(p) { job ??= { id: "11111111-1111-4111-8111-111111111111", plan_sha256: p.planSha256, refs_sha256: p.refsSha256, ops_sha256: p.opsSha256, total_ops: p.totalOps }; return job; },
    async lease(_id, l) { if (lock) return false; lock = l; return true; },
    async release(_id, l) { if (lock === l) lock = null; },
    async receipts() { return rec.map((r) => ({ ...r })); },
    async insertReceipt(r) {
      if (failInsert) { failInsert = false; return false; }
      if (r.outcome === "DRY_RUN_VALID" && rec.some((x) => x.op_index === r.op_index && x.outcome === "DRY_RUN_VALID")) return false;
      rec.push(r); return true;
    },
  };
  return s;
}
const okPost: PostDry = async (_k, body) => { expect(body.dry_run).toBe(true); return { outcome: "DRY_RUN_VALID", code: "dry_run_valid", httpStatus: 201 }; };
const noSleep = async () => {};

describe("précontrôle plan complet marathon 16 sem. — vraies structures du scénario", () => {
  it("sans correspondances : 128 = 58 opérations + 53 repos + 17 refus ; seuls 3 exercices principaux manquent", async () => {
    const p = await preparePlan(plan, baseRefs(), PV_DRY);
    expect(p.precheck.weeks).toBe(16);
    expect(p.precheck.totalSessions).toBe(128);
    expect([p.precheck.operations, p.precheck.excludedRest, p.precheck.refused]).toEqual([58, 53, 17]);
    expect(p.precheck.missingExercises.sort()).toEqual([LUNGE, RDL, SQUAT].sort());
    expect(p.precheck.competition).toBe("refused");
    expect(p.precheck.rows.find((r) => r.title.startsWith("COURSE : "))!.reason).toBe("competition_identity_unconfirmed");
    expect(p.precheck.raceSource).toEqual({ ...RACE, goalType: null });
    expect(p.precheck.complete).toBe(false);
  });
  it("correspondances synthétiques confirmées : 128 = 75 opérations (58 course + 16 renfo + 1 compétition) + 53 repos, ZÉRO refus", async () => {
    const p = await preparePlan(plan, fullRefs(), PV_DRY);
    expect(p.precheck.refused).toBe(0);
    expect([p.precheck.totalSessions, p.precheck.operations, p.precheck.excludedRest]).toEqual([128, 75, 53]);
    expect(p.precheck.opsByKind).toEqual({ training: 74, competition: 1 });
    const bySport = (sport: string) => p.ops.filter((o) => o.kind === "training" && o.body.sport === (SPORTS as Record<string, string>)[sport]).length;
    expect([bySport("run"), bySport("strength")]).toEqual([58, 16]);
    expect(p.precheck.complete).toBe(true);
    expect(p.ops.map((o) => o.opIndex)).toEqual([...Array(75).keys()]);
  });
  it("renforcement : échauffement/retour au calme temporisés = steps sans exerciseId ; série principale répétée = exercice officiel, contenu V3 conservé", async () => {
    const p = await preparePlan(plan, fullRefs(), PV_DRY);
    const st = p.ops.find((o) => o.body.sport === SPORTS.strength)!;
    const w = st.body.workout as Record<string, unknown>[];
    expect(w[0]).toEqual({ kind: "step", duration: { value: 600, unit: "s" }, intensity: "warmup", comment: "Échauffement progressif, contrôle de disponibilité", targets: [{ type: "no_target" }] });
    expect(w[1]).toMatchObject({ kind: "repeat", times: 3, skip_last: true });
    const inner = w[1].steps as Record<string, unknown>[];
    expect(inner[0]).toEqual({ kind: "exercise", exercise: "exf_SYNTHSQUAT", comment: SQUAT, sets: [{ duration: { value: 60, unit: "s" }, comment: "objectif 8 répétitions dans la fenêtre", targets: [{ type: "rpe", rpe: 6, rpe_max: 8 }] }] });
    expect(inner[1]).toEqual({ kind: "step", duration: { value: 120, unit: "s" }, intensity: "rest", targets: [{ type: "no_target" }] });
    expect(w[2]).toMatchObject({ kind: "step", intensity: "cooldown", duration: { value: 300, unit: "s" } });
    expect(JSON.stringify(w)).not.toMatch(/"(load|kg|reps)"/); // aucune charge ni répétition inventée
  });
  it("requiredExerciseLabels = prédicat exact du mapper (retirer un libellé refuse ses séances, rien d'autre)", async () => {
    const sessions = sessionsFromPlanJson(plan).sessions;
    const labels = requiredExerciseLabels(sessions);
    expect(labels.sort()).toEqual(Object.keys(EXERCISES).sort());
    for (const l of labels) {
      const ex = { ...EXERCISES } as Record<string, string>; delete ex[l];
      const m = mapPlanToNolioV2(sessions, fullRefs({ exerciseIds: ex }));
      expect(m.refusals.length).toBeGreaterThan(0);
      expect(m.refusals.every((r) => r.reason === `exercise_reference_missing:${l}`)).toBe(true);
    }
  });
  it("endurance sans régression : les 58 corps course sont identiques avec ou sans correspondances renfo/compétition", async () => {
    const a = await preparePlan(plan, baseRefs(), PV_DRY), b = await preparePlan(plan, fullRefs(), PV_DRY);
    const run = (p: Prepared) => p.ops.filter((o) => o.body.sport === SPORTS.run && o.kind === "training").map((o) => `${o.sessionKey}|${o.bodySha256}`);
    expect(run(b)).toEqual(run(a));
  });
  it("compétition : identité manquante ou différente (nom, date, sport, priorité) continue de bloquer", async () => {
    const reason = async (c: NolioV2Refs["competition"]) => (await preparePlan(plan, fullRefs({ competition: c }), PV_DRY)).precheck.rows.find((r) => r.title.startsWith("COURSE : "))!.reason;
    expect(await reason(null)).toBe("competition_identity_unconfirmed");
    expect(await reason({ ...RACE, name: "Marathon de Paris" })).toBe("competition_name_mismatch");
    expect(await reason({ ...RACE, date: "2027-02-13" })).toBe("competition_date_mismatch");
    expect(await reason({ ...RACE, sport: "bike" })).toBe("competition_sport_mismatch");
    expect(await reason({ ...RACE, goalType: "a" })).toBe("competition_priority_mismatch");
    const ok = await preparePlan(plan, fullRefs(), PV_DRY);
    const c = ok.ops.find((o) => o.kind === "competition")!;
    expect(c.path).toBe(DRY_RUN_PATHS.competition);
    expect(c.body.description).toMatch(/^\[TFCLab-QA [0-9a-f]{24}\]$/); // corps MARQUÉ simulé = corps créé
    expect(c.source.body).toEqual({ name: "Marathon", date_start: RACE.date, sport: SPORTS.run, athletes: ["usr_SYNTH1"] });
  });
  it("empreintes : plan, refs et kind/path/date des opérations entrent dans les hashes", async () => {
    const a = await preparePlan(plan, fullRefs(), PV_DRY);
    expect((await preparePlan(plan, fullRefs({ sportIds: { ...SPORTS, run: "spt_OTHER" } }), PV_DRY)).refsSha256).not.toBe(a.refsSha256);
    expect((await preparePlan({ ...plan, _planStartDate: "2026-11-02" }, fullRefs(), PV_DRY)).planSha256).not.toBe(a.planSha256);
    const m = manifestOf(a.ops);
    expect(await opsDigest(m)).toBe(a.opsSha256);
    const last = m.length - 1;
    expect(await opsDigest(m.map((e, i) => (i === last ? { ...e, kind: "training" as const, path: DRY_RUN_PATHS.training } : e)))).not.toBe(a.opsSha256);
    expect(await opsDigest(m.map((e, i) => (i === 0 ? { ...e, date: "2030-01-01" } : e)))).not.toBe(a.opsSha256);
  });
});

describe("transport simulation : routes fermées, dry_run forcé", () => {
  const mk = () => vi.fn(async (_u: string, _i: { body: string }) => ({ status: 201, text: async () => JSON.stringify({ dry_run: true, is_valid: true, summary: "x" }), headers: { get: () => "1500" } }));
  it("compétition → planned/competitions/, entraînement → planned/trainings/, dry_run:true en dernier", async () => {
    const f = mk();
    const r = await postDryRun({ kind: "competition", fetch: f as never, accessToken: "T", body: { name: "x", dry_run: true } });
    expect(r).toMatchObject({ outcome: "DRY_RUN_VALID", httpStatus: 201, quotaRemainingHour: 1500 });
    expect(f.mock.calls[0][0]).toBe("https://www.nolio.io/api/v2/planned/competitions/");
    expect(JSON.parse(f.mock.calls[0][1].body).dry_run).toBe(true);
    await postDryRun({ kind: "training", fetch: f as never, accessToken: "T", body: { dry_run: true } });
    expect(f.mock.calls[1][0]).toBe("https://www.nolio.io/api/v2/planned/trainings/");
  });
  it("kind arbitraire (batch, __proto__) ou corps sans dry_run ⇒ refus local, zéro fetch", async () => {
    const f = mk();
    for (const kind of ["batch", "__proto__", "constructor"]) expect((await postDryRun({ kind: kind as never, fetch: f as never, accessToken: "T", body: { dry_run: true } })).code).toBe("local_guard_refused");
    expect((await postDryRun({ kind: "competition", fetch: f as never, accessToken: "T", body: { dry_run: false } })).code).toBe("local_guard_refused");
    expect(f).not.toHaveBeenCalled();
  });
  it("réponse portant un id (création) ⇒ UNKNOWN, jamais validée", async () => {
    const f = vi.fn(async () => ({ status: 201, text: async () => JSON.stringify({ id: "pcmp_X", name: "x" }) }));
    expect((await postDryRun({ kind: "competition", fetch: f as never, accessToken: "T", body: { dry_run: true } })).outcome).toBe("UNKNOWN");
  });
});

describe("lots dry_run", () => {
  it("précontrôle incomplet ⇒ aucun appel", async () => {
    const post = vi.fn(okPost);
    const r = await runPlanDryRunBatch({ prepared: await preparePlan(plan, baseRefs(), PV_DRY), store: memStore(), post, lockId: "l", now: Date.now, sleep: noSleep });
    expect(r.status).toBe("BLOCKED"); expect(post).not.toHaveBeenCalled();
  });
  it("couverture 75/75 : lots bornés, chaque opération une seule fois avec son kind, compétition incluse", async () => {
    const p = await preparePlan(plan, fullRefs(), PV_DRY);
    const st = memStore(); const post = vi.fn(okPost);
    let r = await runPlanDryRunBatch({ prepared: p, store: st, post, lockId: "a", now: Date.now, sleep: noSleep });
    expect(r.progress!.valid).toBe(8); expect(r.progress!.fullyValidated).toBe(false); expect(r.code).toBe("batch_limit");
    for (let i = 0; i < 20 && !r.progress!.fullyValidated; i++) r = await runPlanDryRunBatch({ prepared: p, store: st, post, lockId: `b${i}`, now: Date.now, sleep: noSleep });
    expect(r.progress!.valid).toBe(75);
    expect(post).toHaveBeenCalledTimes(75);
    expect(post.mock.calls.filter((c) => c[0] === "competition")).toHaveLength(1);
    expect(new Set(st.rec.map((x) => x.op_index)).size).toBe(75);
  });
  it("429 / inconnu (réponse perdue après envoi) arrêtent ; inconnu jamais relancé", async () => {
    const p = await preparePlan(plan, fullRefs(), PV_DRY);
    const st = memStore();
    const r = await runPlanDryRunBatch({ prepared: p, store: st, lockId: "a", now: Date.now, sleep: noSleep, post: async () => ({ outcome: "REFUSED", code: "rate_limited_429", httpStatus: 429 }) });
    expect(r.code).toBe("rate_limited_429"); expect(st.rec).toHaveLength(1);
    await runPlanDryRunBatch({ prepared: p, store: st, lockId: "b", now: Date.now, sleep: noSleep, post: async () => ({ outcome: "UNKNOWN", code: "timeout_or_lost", httpStatus: null }) });
    const again = vi.fn(okPost);
    const r3 = await runPlanDryRunBatch({ prepared: p, store: st, lockId: "c", now: Date.now, sleep: noSleep, post: again });
    expect(again).not.toHaveBeenCalled(); expect(r3.code).toBe("unknown_present_no_retry");
  });
  it("quota horaire bas annoncé ⇒ arrêt prudent du lot", async () => {
    const p = await preparePlan(plan, fullRefs(), PV_DRY);
    const post = vi.fn<PostDry>(async () => ({ outcome: "DRY_RUN_VALID", code: "dry_run_valid", httpStatus: 201, quotaRemainingHour: 10 }));
    const r = await runPlanDryRunBatch({ prepared: p, store: memStore(), post, lockId: "a", now: Date.now, sleep: noSleep });
    expect(r.code).toBe("quota_low_stop"); expect(post).toHaveBeenCalledTimes(1);
  });
  it("écriture du reçu échouée ⇒ arrêt, aucun appel suivant", async () => {
    const p = await preparePlan(plan, fullRefs(), PV_DRY); const st = memStore(); st.failNext();
    const post = vi.fn(okPost);
    expect((await runPlanDryRunBatch({ prepared: p, store: st, post, lockId: "a", now: Date.now, sleep: noSleep })).code).toBe("receipt_write_failed");
    expect(post).toHaveBeenCalledTimes(1);
  });
  it("concurrence : bail occupé ⇒ BUSY sans appel ; job figé divergent ⇒ obsolète", async () => {
    const p = await preparePlan(plan, fullRefs(), PV_DRY);
    const st = memStore(); await st.lease("j", "other", 60);
    const post = vi.fn(okPost);
    expect((await runPlanDryRunBatch({ prepared: p, store: st, post, lockId: "me", now: Date.now, sleep: noSleep })).status).toBe("BUSY");
    const st2 = memStore(); await st2.freezeJob({ planSha256: "0".repeat(64), refsSha256: p.refsSha256, opsSha256: p.opsSha256, totalSessions: 1, totalOps: p.ops.length });
    expect((await runPlanDryRunBatch({ prepared: p, store: st2, post, lockId: "x", now: Date.now, sleep: noSleep })).code).toBe("job_stale");
    expect(post).not.toHaveBeenCalled();
  });
  it("reçu valide d'une autre empreinte de corps ne compte pas", () => {
    const job: JobRow = { id: "j", plan_sha256: "", refs_sha256: "", ops_sha256: "", total_ops: 1 };
    const ops = [{ opIndex: 0, sessionKey: "S1-J0-0", date: "2026-10-26", kind: "training" as const, path: DRY_RUN_PATHS.training, bodySha256: "a".repeat(64), body: {}, source: { kind: "training" as const, path: DRY_RUN_PATHS.training, sessionKey: "S1-J0-0", body: {} } as never }];
    expect(progressOf(job, ops, [{ op_index: 0, body_sha256: "b".repeat(64), outcome: "DRY_RUN_VALID", code: "dry_run_valid" }]).fullyValidated).toBe(false);
  });
});

describe("confirmation client (relecture RLS job + chaque reçu)", () => {
  const COACH = "573e045a-bbea-4e37-a30f-33183b9fbe13", PV = "22222222-2222-4222-8222-222222222222";
  let p: Prepared; let resp: PlanDryResp; let job: Record<string, unknown>; let rec: Record<string, unknown>[]; let local: string;
  beforeAll(async () => {
    p = await preparePlan(plan, fullRefs(), PV_DRY);
    const st = memStore();
    const r = await runPlanDryRunBatch({ prepared: p, store: st, post: okPost, lockId: "a", now: Date.now, sleep: noSleep, batch: 100, batchBudgetMs: 1e9 });
    expect(r.progress!.fullyValidated).toBe(true);
    resp = parsePlanDryResp(JSON.parse(JSON.stringify({ ...r, precheck: p.precheck, planSha256: p.planSha256, refsSha256: p.refsSha256, opsSha256: p.opsSha256, manifest: manifestOf(p.ops) })))!;
    job = { id: r.progress!.jobId, coach_id: COACH, plan_version_id: PV, plan_sha256: p.planSha256, refs_sha256: p.refsSha256, ops_sha256: p.opsSha256, total_ops: 75, total_sessions: 128 };
    rec = st.rec.map((x) => ({ ...x, coach_id: COACH }));
    local = await sha256Hex(canonical(plan));
  });
  const check = (o: Partial<{ resp: PlanDryResp; job: unknown; receipts: unknown[] | null; local: string }> = {}) =>
    confirmFullPlanDryRun({ planVersionId: PV, coachId: COACH, resp: o.resp ?? resp, job: o.job ?? job, receipts: o.receipts === undefined ? rec : o.receipts, localPlanSha256: o.local ?? local });
  it("75 reçus concordants ⇒ confirmé", async () => expect(await check()).toEqual({ confirmed: true, validRead: 75, reason: "ok" }));
  it("mauvais hash de corps / mauvaise date / mauvaise séance ⇒ refusé", async () => {
    expect((await check({ receipts: rec.map((r, i) => (i === 3 ? { ...r, body_sha256: "f".repeat(64) } : r)) })).reason).toBe("receipt_body_or_session_mismatch");
    expect((await check({ receipts: rec.map((r, i) => (i === 3 ? { ...r, session_date: "2030-01-01" } : r)) })).confirmed).toBe(false);
    expect((await check({ receipts: rec.map((r, i) => (i === 3 ? { ...r, session_key: "S1-J0-9" } : r)) })).confirmed).toBe(false);
  });
  it("indices permutés ⇒ refusé", async () => {
    const sw = rec.map((r) => (r.op_index === 0 ? { ...r, op_index: 1 } : r.op_index === 1 ? { ...r, op_index: 0 } : r));
    expect((await check({ receipts: sw })).confirmed).toBe(false);
  });
  it("doublon valide / http NULL / code absent ⇒ refusé", async () => {
    expect((await check({ receipts: [...rec, rec[5]] })).reason).toBe("duplicate_valid_receipt");
    expect((await check({ receipts: rec.map((r, i) => (i === 7 ? { ...r, http_status: null } : r)) })).reason).toBe("receipt_positive_fact_missing");
    expect((await check({ receipts: rec.map((r, i) => (i === 7 ? { ...r, code: null } : r)) })).confirmed).toBe(false);
    expect((await check({ receipts: rec.slice(1) })).reason).toBe("not_all_ops_valid");
    expect((await check({ receipts: null })).reason).toBe("receipts_unreadable");
  });
  it("refus masqué, reçu inconnu, reçu d'un autre job ⇒ refusé", async () => {
    const hidden = { ...resp, precheck: { ...resp.precheck!, rows: resp.precheck!.rows.map((r) => (r.status === "excluded_rest" && r.sessionKey === resp.precheck!.rows.find((x) => x.status === "excluded_rest")!.sessionKey ? { ...r, status: "refused" as const } : r)) } };
    expect((await check({ resp: hidden })).reason).toBe("refusal_present");
    expect((await check({ receipts: [...rec, { ...rec[2], outcome: "UNKNOWN", code: "timeout_or_lost", http_status: null }] })).reason).toBe("unknown_receipt_present");
    expect((await check({ receipts: rec.map((r, i) => (i === 0 ? { ...r, job_id: "33333333-3333-4333-8333-333333333333" } : r)) })).reason).toBe("receipt_foreign_or_malformed");
  });
  it("job relu divergent (ops/plan/refs/coach) ou manifeste altéré ⇒ refusé", async () => {
    expect((await check({ job: { ...job, ops_sha256: "0".repeat(64) } })).reason).toBe("job_readback_mismatch");
    expect((await check({ job: { ...job, coach_id: "6b4c1722-2105-4889-ab14-41bab798cdf7" } })).reason).toBe("job_readback_mismatch");
    expect((await check({ local: "e".repeat(64) })).reason).toBe("plan_digest_differs_from_local_plan");
    const tampered = { ...resp, manifest: resp.manifest!.map((e, i) => (i === 0 ? { ...e, bodySha256: "c".repeat(64) } : e)) };
    expect((await check({ resp: tampered })).reason).toBe("manifest_digest_mismatch");
    expect(parsePlanDryResp({ ...resp, manifest: [{ ...resp.manifest![0], path: "/api/v2/batch/" }] })).toBeNull();
  });
});

describe("séquence bornée côté client", () => {
  const R = (g: Partial<NonNullable<PlanDryResp["progress"]>>, status = "PROGRESS", code = "partial"): PlanDryResp => ({
    status, code, precheck: null, planSha256: null, refsSha256: null, opsSha256: null, manifest: null,
    progress: { jobId: "11111111-1111-4111-8111-111111111111", totalOps: 75, valid: 0, refused: 0, unknown: 0, pending: 75, stoppedOn: "batch_limit", processedThisBatch: 8, fullyValidated: false, ...g },
  });
  const base = { isCurrent: () => true, stopRequested: () => false, now: Date.now, sleep: async () => {}, onProgress: () => {} };
  it("enchaîne jusqu'à complet", async () => {
    let n = 0;
    const out = await runPlanDrySequence({ ...base, runBatch: async () => (++n < 10 ? R({ valid: n * 8 }) : R({ valid: 75, fullyValidated: true, stoppedOn: null }, "PROGRESS", "complete")) });
    expect(out.stop).toBe("complete"); expect(out.calls).toBe(10);
  });
  it("429 / inconnu / BUSY / aucun progrès arrêtent sans relance", async () => {
    for (const [r, stop] of [[R({ stoppedOn: "rate_limited_429" }), "rate_limited_429"], [R({ unknown: 1, stoppedOn: "timeout_or_lost" }), "unknown_present_no_retry"],
      [{ ...R({}), status: "BUSY", code: "batch_in_progress", progress: null }, "batch_in_progress"], [R({ processedThisBatch: 0 }), "no_progress"]] as const) {
      const fn = vi.fn(async () => r as PlanDryResp);
      expect((await runPlanDrySequence({ ...base, runBatch: fn })).stop).toBe(stop);
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });
  it("arrêt coach, budget total, identité changée (réponse tardive non publiée)", async () => {
    let stop = false; const fn = vi.fn(async () => { stop = true; return R({}); });
    expect((await runPlanDrySequence({ ...base, stopRequested: () => stop, runBatch: fn })).stop).toBe("stopped_by_coach");
    let t = 0;
    expect((await runPlanDrySequence({ ...base, now: () => t, sleep: async () => { t += 100_000; }, runBatch: async () => R({}) })).stop).toBe("total_budget");
    let cur = true; const pub = vi.fn();
    const out = await runPlanDrySequence({ ...base, isCurrent: () => cur, onProgress: pub, runBatch: async () => { cur = false; return R({ valid: 75, fullyValidated: true }); } });
    expect(out.stop).toBe("stale"); expect(pub).not.toHaveBeenCalled();
  });
});
