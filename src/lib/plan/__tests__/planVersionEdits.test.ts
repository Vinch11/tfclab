import { describe, it, expect } from "vitest";
import { AppendOnlyPlanVersionSaver, derivePlanVersionId, type PlanVersionRow } from "../appendOnlyPlanVersionSave";
import { renamedVersionPayload, restoreVersionAsCurrent, type CurrentPlanPorts, type CurrentRow } from "../planVersionEdits";
import { refreshPlanAbsoluteValues } from "../refreshPlanValues";
import type { ParsedPlan } from "@/lib/aiPlanParser";

const A = "9758ace0-da71-4200-87bf-04e74bbb4ed9", C = "6b4c1722-2105-4889-ab14-41bab798cdf7";
const plan = (title: string, extra: Record<string, unknown> = {}) => ({ title, weeks: [{ weekNumber: 1, sessions: [{ title: "Seuil", durationMin: 46 }] }],
  _provenance: { engine: "det", engineVersion: "e1", generatedAt: "2026-11-02T10:00:00.000Z", limiterOrder: { applied: ["TTE"] } }, ...extra });
const row = (pj: unknown, id = "00000000-0000-8000-8000-000000000001"): PlanVersionRow => ({ id, athlete_id: A, coach_id: C, plan_json: pj, objective: "Marathon", weeks_count: 1, sessions_count: 1, validator_score: null, validator_grade: null, validator_summary: null });
const memDb = () => {
  const db = new Map<string, PlanVersionRow>();
  return { db, saver: new AppendOnlyPlanVersionSaver({ transport: {
    insert: async (r) => { if (db.has(r.id)) return { error: { code: "23505" } }; db.set(r.id, JSON.parse(JSON.stringify(r))); return { error: null }; },
    readById: async (id) => ({ data: db.get(id) ?? null, error: null }) } }) };
};
const idOf = async (pj: unknown) => { const { id: _i, ...p } = row(pj); return derivePlanVersionId(p); };

describe("identité d'une version éditée", () => {
  it("titre, dose, ordre ou engineVersion ⇒ nouvelle identité ; seul generatedAt ⇒ même identité", async () => {
    const base = await idOf(plan("T"));
    expect(await idOf(plan("T2"))).not.toBe(base);
    expect(await idOf({ ...plan("T"), weeks: [{ weekNumber: 1, sessions: [{ title: "Seuil", durationMin: 47 }] }] })).not.toBe(base);
    expect(await idOf({ ...plan("T"), _provenance: { ...plan("T")._provenance, limiterOrder: { applied: ["VO2max"] } } })).not.toBe(base);
    expect(await idOf({ ...plan("T"), _provenance: { ...plan("T")._provenance, engineVersion: "e2" } })).not.toBe(base);
    expect(await idOf({ ...plan("T"), _provenance: { ...plan("T")._provenance, generatedAt: "2027-01-01T00:00:00.000Z" } })).toBe(base);
  });
  it("renommer crée une nouvelle ligne, l'ancienne et sa provenance stockée restent intactes", async () => {
    const { db, saver } = memDb();
    const old = row(plan("T")); db.set(old.id, JSON.parse(JSON.stringify(old)));
    const before = JSON.stringify(db.get(old.id));
    const r = await saver.save(renamedVersionPayload(old, "Bloc 1"));
    expect(r.status).toBe("CONFIRMED"); expect(r.attemptId).not.toBe(old.id);
    expect(JSON.stringify(db.get(old.id))).toBe(before);
    const nu = db.get(r.attemptId!)!.plan_json as ReturnType<typeof plan> & { _label: string };
    expect(nu._label).toBe("Bloc 1");
    expect(nu._provenance).toEqual(old.plan_json && (old.plan_json as ReturnType<typeof plan>)._provenance); // aucun nouvel horodatage
    expect(db.size).toBe(2);
  });
});

describe("restauration comme plan courant (deux écritures)", () => {
  const version = row(plan("V"));
  const oldCur: CurrentRow = { athlete_id: A, coach_id: C, plan_json: plan("OLD") };
  const ports = (o: { read?: () => Promise<{ data: CurrentRow | null; error: { code?: string } | null }>; write?: (r: CurrentRow) => Promise<{ data: unknown; error: unknown }> } = {}) => {
    let cur: CurrentRow | null = JSON.parse(JSON.stringify(oldCur));
    const p: CurrentPlanPorts = {
      readCurrent: o.read ?? (async () => ({ data: cur, error: null })),
      writeCurrent: o.write ?? (async (r) => { cur = { athlete_id: r.athlete_id, coach_id: r.coach_id, plan_json: r.plan_json }; return { data: cur, error: null }; }),
    };
    return { p, get: () => cur, set: (c: CurrentRow | null) => { cur = c; } };
  };
  it("nominal : ancien courant archivé puis courant remplacé, CONFIRMED", async () => {
    const { db, saver } = memDb(); const P = ports();
    const r = await restoreVersionAsCurrent({ ports: P.p, saver, coachId: C, athleteId: A, version });
    expect(r.status).toBe("CONFIRMED"); expect(r.archive.status).toBe("CONFIRMED");
    expect(db.get(r.archive.id!)!.plan_json).toEqual(oldCur.plan_json);
    expect(P.get()!.plan_json).toEqual(version.plan_json);
  });
  it("panne avant archive ⇒ courant intact, ARCHIVE_NOT_CONFIRMED", async () => {
    const P = ports(); let wrote = false;
    const saver = new AppendOnlyPlanVersionSaver({ transport: { insert: async () => { throw new Error("net"); }, readById: async () => { throw new Error("net"); } } });
    P.p.writeCurrent = async () => { wrote = true; return { data: null, error: null }; };
    const r = await restoreVersionAsCurrent({ ports: P.p, saver, coachId: C, athleteId: A, version });
    expect(r.status).toBe("ARCHIVE_NOT_CONFIRMED"); expect(wrote).toBe(false); expect(P.get()!.plan_json).toEqual(oldCur.plan_json);
  });
  it("archive OK puis courant refusé ⇒ PARTIAL_CURRENT_UNCHANGED, ancien courant conservé", async () => {
    const { saver } = memDb(); const P = ports({ write: async () => ({ data: null, error: { code: "42501", message: "rls" } }) });
    const r = await restoreVersionAsCurrent({ ports: P.p, saver, coachId: C, athleteId: A, version });
    expect(r.status).toBe("PARTIAL_CURRENT_UNCHANGED"); expect(r.archive.status).toBe("CONFIRMED");
  });
  it("réponse perdue après commit ⇒ relecture exacte ⇒ CONFIRMED ; relecture impossible ⇒ PARTIAL_CURRENT_UNKNOWN", async () => {
    const { saver } = memDb(); const P = ports();
    P.p.writeCurrent = async (rw) => { P.set({ athlete_id: rw.athlete_id, coach_id: rw.coach_id, plan_json: rw.plan_json }); throw new Error("lost"); };
    expect((await restoreVersionAsCurrent({ ports: P.p, saver, coachId: C, athleteId: A, version })).status).toBe("CONFIRMED");
    const m2 = memDb(); const Q = ports(); let n = 0;
    const realRead = Q.p.readCurrent;
    Q.p.readCurrent = async (a) => (n++ === 0 ? realRead(a) : { data: null, error: { code: "FETCH" } });
    Q.p.writeCurrent = async () => { throw new Error("lost"); };
    expect((await restoreVersionAsCurrent({ ports: Q.p, saver: m2.saver, coachId: C, athleteId: A, version })).status).toBe("PARTIAL_CURRENT_UNKNOWN");
  });
  it("reprise du même contenu ⇒ ALREADY_CURRENT, aucune écriture ; lecture initiale impossible ⇒ NOT_STARTED", async () => {
    const { saver, db } = memDb(); const P = ports();
    await restoreVersionAsCurrent({ ports: P.p, saver, coachId: C, athleteId: A, version });
    const n = db.size;
    expect((await restoreVersionAsCurrent({ ports: P.p, saver, coachId: C, athleteId: A, version })).status).toBe("ALREADY_CURRENT");
    expect(db.size).toBe(n);
    expect((await restoreVersionAsCurrent({ ports: ports({ read: async () => ({ data: null, error: { code: "x" } }) }).p, saver, coachId: C, athleteId: A, version })).status).toBe("NOT_STARTED");
  });
});

describe("actualisation des valeurs absolues", () => {
  it("refusée sur un plan à séances structurées DET (aucune modification muette)", () => {
    const p = { weeks: [{ weekNumber: 1, sessions: [{ title: "Z3 (250W)", details: "Z3 (250W)", detStructuredWorkout: { nodes: [] } }] }], physioRefs: { ftp: 300 } } as unknown as ParsedPlan;
    const r = refreshPlanAbsoluteValues(p, { ftp: 350 } as never);
    expect(r.refused).toBe("structured_prescription_requires_requalification");
    expect(r.plan).toBe(p); expect(r.changedSessions).toBe(0);
  });
});
