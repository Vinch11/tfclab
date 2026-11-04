import { describe, it, expect } from "vitest";
import { derivePlanVersionId, freezePayload, rowMatches, type PlanVersionPayload } from "../appendOnlyPlanVersionSave";

const base = (generatedAt: string, extra: Record<string, unknown> = {}): PlanVersionPayload => ({
  athlete_id: "9758ace0-da71-4200-87bf-04e74bbb4ed9", coach_id: "6b4c1722-2105-4889-ab14-41bab798cdf7",
  plan_json: { weeks: [{ weekNumber: 1, sessions: [{ title: "EF", durationMin: 45 }] }], _provenance: { engine: "det", engineVersion: "a".repeat(64), generatedAt, limiterOrder: { mode: "coach", order: ["TTE"] }, ...extra } },
  objective: "Marathon", weeks_count: 1, sessions_count: 1, validator_score: null, validator_grade: null, validator_summary: null,
} as PlanVersionPayload);

describe("régénération à l'identique (nouvel onglet/contexte)", () => {
  it("même plan, autre horodatage de génération ⇒ même identifiant et ligne reconnue", async () => {
    const a = freezePayload(base("2026-11-02T19:12:54.006Z")), b = freezePayload(base("2026-11-02T19:23:26.857Z"));
    const ida = await derivePlanVersionId(a), idb = await derivePlanVersionId(b);
    expect(idb).toBe(ida);
    expect(rowMatches({ ...b, id: idb }, { ...a, id: ida })).toBe(true);
  });
  it("tout autre champ de provenance (ordre des limiteurs, version moteur) change l'identifiant", async () => {
    const ref = await derivePlanVersionId(freezePayload(base("t")));
    expect(await derivePlanVersionId(freezePayload(base("t", { limiterOrder: { mode: "automatic", order: ["TTE"] } })))).not.toBe(ref);
    expect(await derivePlanVersionId(freezePayload(base("t", { engineVersion: "b".repeat(64) })))).not.toBe(ref);
  });
  it("une dose différente n'est jamais acceptée comme la même ligne", async () => {
    const a = freezePayload(base("t")); const id = await derivePlanVersionId(a);
    const changed = JSON.parse(JSON.stringify(a)); changed.plan_json.weeks[0].sessions[0].durationMin = 50;
    expect(rowMatches({ ...a, id }, { ...changed, id })).toBe(false);
  });
});
