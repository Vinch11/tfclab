import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { checkGuard, overallVerdict, ackLostAfterCommit, readbackUnavailable, syntheticPayload, RECIPE_STEPS, COACH_A, COACH_B, type StepResult } from "../recipe";
import { AppendOnlyPlanVersionSaver, type PlanVersionRow, type PlanVersionTransport } from "@/lib/plan/appendOnlyPlanVersionSave";

const QA_URL = "https://lkjesdacgpolrwfxulbo.supabase.co";
const auth = (uid: string | null) => ({
  getSession: async () => ({ data: { session: uid ? { user: { id: uid } } : null }, error: null }),
  getUser: async () => ({ data: { user: uid ? { id: uid, role: "authenticated" } : null }, error: null }),
});
const dbOwn = (coach: string | null) => {
  const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: coach ? { id: COACH_A.athleteId, coach_id: coach } : null, error: null }) }) }) }));
  return { from };
};

describe("garde recette Coach A", () => {
  it("hors DEV : bloqué sans requête", async () => {
    const db = dbOwn(COACH_A.uid);
    expect((await checkGuard({ isDev: false, backendUrl: QA_URL, auth: auth(COACH_A.uid), db })).kind).toBe("not-dev");
    expect(db.from).not.toHaveBeenCalled();
  });
  it("backend non QA : bloqué", async () => {
    expect((await checkGuard({ isDev: true, backendUrl: "https://other.supabase.co", auth: auth(COACH_A.uid), db: dbOwn(COACH_A.uid) })).kind).toBe("origin-blocked");
  });
  it("déconnecté : aucune lecture de données", async () => {
    const db = dbOwn(COACH_A.uid);
    expect((await checkGuard({ isDev: true, backendUrl: QA_URL, auth: auth(null), db })).kind).toBe("signed-out");
    expect(db.from).not.toHaveBeenCalled();
  });
  it("Coach B : refusé, aucune lecture", async () => {
    const db = dbOwn(COACH_A.uid);
    const g = await checkGuard({ isDev: true, backendUrl: QA_URL, auth: auth(COACH_B), db });
    expect(g).toEqual({ kind: "wrong-account", who: "B" });
    expect(db.from).not.toHaveBeenCalled();
  });
  it("Coach A sans athlète propriétaire : bloqué", async () => {
    expect((await checkGuard({ isDev: true, backendUrl: QA_URL, auth: auth(COACH_A.uid), db: dbOwn(null) })).kind).toBe("athlete-not-owned");
  });
  it("Coach A + athlète A : prêt", async () => {
    expect((await checkGuard({ isDev: true, backendUrl: QA_URL, auth: auth(COACH_A.uid), db: dbOwn(COACH_A.uid) })).kind).toBe("ready");
  });
  it("getUser bloqué : délai explicite", async () => {
    const slow = { ...auth(COACH_A.uid), getUser: () => new Promise<never>(() => {}) };
    const g = await checkGuard({ isDev: true, backendUrl: QA_URL, auth: slow as never, db: dbOwn(COACH_A.uid), ms: 20 });
    expect(g.kind).toBe("blocked");
  });
});

describe("verdict global", () => {
  const all = (v: StepResult["verdict"]) => RECIPE_STEPS.map(s => ({ ...s, verdict: v, detail: "" }));
  it("tout PASS → PASS", () => expect(overallVerdict(all("PASS"))).toBe("PASS"));
  it("une étape NON_EXERCEE → PARTIEL, jamais PASS", () => {
    const s = all("PASS"); s[9] = { ...s[9], verdict: "NON_EXERCEE" };
    expect(overallVerdict(s)).toBe("PARTIEL");
  });
  it("interrompu → PARTIEL", () => expect(overallVerdict(all("PASS").slice(0, 4))).toBe("PARTIEL"));
  it("un FAIL → FAIL", () => { const s = all("PASS"); s[5] = { ...s[5], verdict: "FAIL" }; expect(overallVerdict(s)).toBe("FAIL"); });
  it("identité non PASS → BLOCKED", () => expect(overallVerdict([])).toBe("BLOCKED"));
});

function memory(): PlanVersionTransport & { rows: Map<string, PlanVersionRow> } {
  const rows = new Map<string, PlanVersionRow>();
  return {
    rows,
    insert: async (r) => { if (rows.has(r.id)) return { error: { code: "23505" } }; rows.set(r.id, JSON.parse(JSON.stringify(r))); return { error: null }; },
    readById: async (id) => ({ data: rows.get(id) ?? null, error: null }),
  };
}

describe("simulations autour du vrai transport", () => {
  it("ACK perdu après commit : CONFIRMED par relecture, nouvel essai même ID, une ligne", async () => {
    const m = memory(); const lost = ackLostAfterCommit(m);
    const a = await new AppendOnlyPlanVersionSaver({ transport: lost }).save(syntheticPayload("run", "ack"));
    expect(lost.realInsertError()).toBeNull();
    expect(a).toMatchObject({ status: "CONFIRMED", reason: "readback_match_after_lost" });
    const b = await new AppendOnlyPlanVersionSaver({ transport: m }).save(syntheticPayload("run", "ack"));
    expect(b.attemptId).toBe(a.attemptId); expect(m.rows.size).toBe(1);
  });
  it("relecture indisponible : UNKNOWN, jamais CONFIRMED ; reprise CONFIRMED même ID", async () => {
    const m = memory();
    const u = await new AppendOnlyPlanVersionSaver({ transport: readbackUnavailable(m) }).save(syntheticPayload("run", "rb"));
    expect(u.status).toBe("UNKNOWN");
    const r = await new AppendOnlyPlanVersionSaver({ transport: m }).save(syntheticPayload("run", "rb"));
    expect(r).toMatchObject({ status: "CONFIRMED", attemptId: u.attemptId }); expect(m.rows.size).toBe(1);
  });
  it("payload synthétique marqué non prescriptif, aucune séance", () => {
    const p = syntheticPayload("run", "x").plan_json as Record<string, unknown>;
    expect(p._qaFixture).toBe(true); expect(p._qaNonPrescriptive).toBe(true); expect(p.weeks).toEqual([]);
  });
});
