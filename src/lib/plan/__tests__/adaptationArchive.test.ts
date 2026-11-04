import { describe, it, expect, vi } from "vitest";
import { AppendOnlyPlanVersionSaver, type PlanVersionRow, type PlanVersionTransport } from "../appendOnlyPlanVersionSave";
import { archiveForAdaptation, persistAdaptation, detAdaptationRefusal, AdaptationWriteError, DET_ADAPTATION_REFUSAL } from "../adaptationArchive";
import { sendPlannedV2 } from "../../../../supabase/functions/_shared/nolioV2/plannedClient";
import { fetchNolioV2Http } from "../../../../supabase/functions/_shared/nolioV2/httpFetch";
import { mapPlanToNolioV2, type NolioV2Refs } from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";

const DETW = { schema: "det-structured-workout-v1", sourceId: "V3P_RUN_T", sport: "run", chosenDurationMin: 40, exactSeconds: 2400,
  nodes: [{ kind: "step", role: "main", label: "Footing", domain: "LT1", dose: { seconds: 2400 }, target: null }] };
const SESSION = { sessionKey: "S1-J1-0", date: "2026-11-04", title: "Footing", sport: "run", catalogId: "V3P_RUN_T", durationMin: 40, details: "footing", detStructuredWorkout: DETW } as never;
const A = "9758ace0-da71-4200-87bf-04e74bbb4ed9", C = "6b4c1722-2105-4889-ab14-41bab798cdf7";
const plan = (dur = 45, gen = "2026-11-02T10:00:00Z") => ({ totalWeeks: 1, _provenance: { engine: "ai", generatedAt: gen },
  weeks: [{ weekNumber: 1, sessions: [{ title: "Footing", durationMin: dur }, { title: "Seuil", durationMin: 50 }] }] });

function db(mode: { lostAckOnce?: boolean; readbackDown?: boolean } = {}) {
  const rows = new Map<string, PlanVersionRow>(); let lost = !!mode.lostAckOnce;
  const t: PlanVersionTransport = {
    insert: vi.fn(async (r: PlanVersionRow) => {
      if (rows.has(r.id)) return { error: { code: "23505" } };
      rows.set(r.id, JSON.parse(JSON.stringify(r)));
      if (lost) { lost = false; throw new TypeError("ack lost"); }
      return { error: null };
    }),
    readById: vi.fn(async (id: string) => mode.readbackDown ? { data: null, error: { code: "PGRST000", status: 503 } } : { data: rows.get(id) ?? null, error: null }),
  };
  return { rows, t, saver: () => new AppendOnlyPlanVersionSaver({ transport: t }) };
}

describe("archive d'adaptation append-only", () => {
  it("ACK perdu puis nouvel essai (nouvelle instance) ⇒ une seule ligne, même id", async () => {
    const d = db({ lostAckOnce: true });
    const r1 = await archiveForAdaptation(d.saver(), { athleteId: A, coachId: C, plan: plan(), reason: "Patch deload" });
    const r2 = await archiveForAdaptation(d.saver(), { athleteId: A, coachId: C, plan: plan(45, "2026-11-02T11:00:00Z"), reason: "Patch deload" });
    expect(r1.status).toBe("CONFIRMED"); expect(r2.attemptId).toBe(r1.attemptId); expect(d.rows.size).toBe(1);
    // horodatage stocké = le premier, jamais réécrit
    expect((d.rows.get(r1.attemptId!)!.plan_json as { _provenance: { generatedAt: string } })._provenance.generatedAt).toBe("2026-11-02T10:00:00Z");
  });
  it("dose / ordre / moteur / raison différents ⇒ nouvelles identités", async () => {
    const d = db(); const s = d.saver();
    const ids = new Set<string>();
    const swapped = plan(); swapped.weeks[0].sessions.reverse();
    const det = plan(); det._provenance = { engine: "det", generatedAt: "x" } as never;
    for (const [p, r] of [[plan(), "Patch deload"], [plan(46), "Patch deload"], [swapped, "Patch deload"], [det, "Patch deload"], [plan(), "Patch swap_modality"]] as const)
      ids.add((await archiveForAdaptation(s, { athleteId: A, coachId: C, plan: p, reason: r })).attemptId!);
    expect(ids.size).toBe(5); expect(d.rows.size).toBe(5);
  });
  it("archive non confirmée (relecture impossible) ⇒ courant JAMAIS écrit", async () => {
    const d = db({ readbackDown: true }); const writeCurrent = vi.fn();
    await expect(persistAdaptation({ saver: d.saver(), athleteId: A, coachId: C, currentPlan: plan(), nextPlan: plan(30), reason: "Patch deload", writeCurrent }))
      .rejects.toMatchObject({ stage: "archive_not_confirmed" });
    expect(writeCurrent).not.toHaveBeenCalled();
  });
  it("erreur courant après archive confirmée ⇒ état partiel explicite", async () => {
    const d = db();
    const e = await persistAdaptation({ saver: d.saver(), athleteId: A, coachId: C, currentPlan: plan(), nextPlan: plan(30), reason: "Patch deload",
      writeCurrent: async () => { throw new Error("current_refused"); } }).catch((x) => x);
    expect(e).toBeInstanceOf(AdaptationWriteError); expect(e.stage).toBe("current_not_confirmed"); expect(e.message).toMatch(/État partiel/);
    expect(d.rows.size).toBe(1);
  });
  it("aucun UPDATE : le transport n'expose qu'insert/readById", () => {
    expect(Object.keys(db().t).sort()).toEqual(["insert", "readById"]);
  });
});

describe("adaptation d'un plan DET : refus explicite", () => {
  it("séance detStructuredWorkout ⇒ refus ; plan IA ⇒ autorisé", () => {
    const p = plan(); (p.weeks[0].sessions[0] as Record<string, unknown>).detStructuredWorkout = { schema: "det-structured-workout-v1" };
    expect(detAdaptationRefusal(p)).toBe(DET_ADAPTATION_REFUSAL);
    expect(detAdaptationRefusal(plan())).toBeNull();
  });
});

describe("Nolio dry-run : jamais de validation sans réponse serveur", () => {
  it("vrai fetchNolioV2Http (blocage local status 0) ⇒ DRY_RUN_NOT_VALIDATED, zéro fetch", async () => {
    const f = vi.fn();
    const refs: NolioV2Refs = { synthetic: true, athleteId: "usr_SYNTH1", sportIds: { run: "spt_SYNTHRUN" }, exerciseIds: {}, competition: null, calendarTimeZone: null };
    const ops = mapPlanToNolioV2([SESSION], refs).operations;
    const r = await sendPlannedV2({ connection: { apiVersion: "v2", mode: "test-mock", grantedScopes: ["planned:read", "planned:write"] }, refs,
      planVersionId: "30909fcd-c421-4e35-b6ed-cbf1436fe77e", operations: ops, ledger: { claim: vi.fn(), transition: vi.fn() }, dryRun: true,
      http: fetchNolioV2Http({ fetch: f, accessToken: "tok_SYNTH" }) });
    expect(ops.length).toBeGreaterThan(0);
    expect(r.status).toBe("DRY_RUN_NOT_VALIDATED"); expect(r.results[0].state).toBe("dry_run_rejected"); expect(f).not.toHaveBeenCalled();
  });
  it("204 sans corps / 302 / perte ⇒ non validé ; 200 objet ⇒ validé", async () => {
    const run = async (post: () => Promise<unknown>) => (await sendPlannedV2({ connection: { apiVersion: "v2", mode: "test-mock", grantedScopes: ["planned:read", "planned:write"] },
      refs: { synthetic: true, athleteId: "usr_SYNTH1", sportIds: { run: "spt_SYNTHRUN" }, exerciseIds: {}, competition: null, calendarTimeZone: null },
      planVersionId: "30909fcd-c421-4e35-b6ed-cbf1436fe77e", dryRun: true, ledger: { claim: vi.fn(), transition: vi.fn() },
      operations: mapPlanToNolioV2([SESSION],
        { synthetic: true, athleteId: "usr_SYNTH1", sportIds: { run: "spt_SYNTHRUN" }, exerciseIds: {}, competition: null, calendarTimeZone: null }).operations,
      http: { post: post as never, listPage: vi.fn(), getDetail: vi.fn() } })).status;
    expect(await run(async () => ({ kind: "response", status: 204, json: null }))).toBe("DRY_RUN_NOT_VALIDATED");
    expect(await run(async () => ({ kind: "response", status: 302, json: {} }))).toBe("DRY_RUN_NOT_VALIDATED");
    expect(await run(async () => ({ kind: "lost", detail: "timeout" }))).toBe("DRY_RUN_NOT_VALIDATED");
    expect(await run(async () => ({ kind: "response", status: 200, json: { valid: true } }))).toBe("DONE");
  });
});
