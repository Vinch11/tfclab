import { describe, expect, it } from "vitest";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { freezeAppPlanningInput } from "@/lib/det/appPlanningInput";
import { bindAppPlanMetadata, planArchiveMetadata, type PlanArchiveMetadata } from "../generatedPlanMetadata";
import { AppendOnlyPlanVersionSaver, type PlanVersionRow } from "../appendOnlyPlanVersionSave";
import { restoreStructuredPlan } from "../restoreStructuredPlan";

const A = "9758ace0-da71-4200-87bf-04e74bbb4ed9", C = "6b4c1722-2105-4889-ab14-41bab798cdf7";
const changedForm: PlanArchiveMetadata = { _planStartDate: "2027-05-03", _objective: "IM", _raceName: "Another race", _raceDate: "2027-08-22", _raceGoals: [], _coachLimiterOrder: ["VO2max"] };
const det = () => ({ title: "Generated marathon", phases: [], weeks: [{ weekNumber: 1, sessions: [{ title: "Threshold", details: "Original source prescription", durationMin: 45 }] }],
  _provenance: { engine: "det", planningInput: { source: "app_planning_pipeline", fingerprint: "a".repeat(64) }, limiterOrder: { applied: ["Durabilité", "TTE"] } } }) as unknown as ParsedPlan;
async function boundPlan() {
  const input = await freezeAppPlanningInput({ athleteId: A, athlete: {} as never,
    config: { objective: "Marathon", raceName: "Original race", raceDate: "2027-02-28", raceGoals: [{ objective: "10 km", raceDate: "2027-01-03", priority: "B" }], identifiedLimitersRaw: ["Durabilité", "TTE"] } as never,
    appAutomaticLimiters: ["Durabilité", "TTE"], coachOverride: null, planStartDate: "2026-11-09" });
  return { input, plan: bindAppPlanMetadata(det(), input) };
}

describe("DET generated calendar survives the existing archive path", () => {
  it("binding adds archive metadata without changing sessions, priorities or the app input", async () => {
    const original = det(), before = structuredClone(original);
    const { input } = await boundPlan();
    const frozen = JSON.stringify(input);
    const plan = bindAppPlanMetadata(original, input);
    expect(original).toEqual(before);
    expect(plan.weeks).toEqual(original.weeks);
    expect(plan).toMatchObject({ _provenance: (original as unknown as { _provenance: unknown })._provenance });
    expect(JSON.stringify(input)).toBe(frozen);
    expect(planArchiveMetadata(plan, changedForm)).toMatchObject({ _planStartDate: "2026-11-09", _objective: "Marathon", _raceName: "Original race", _raceDate: "2027-02-28", _coachLimiterOrder: [] });
  });
  it("save, read-back and reopen preserve generated dates/goals despite a changed live form; retry does not create another version", async () => {
    const { plan } = await boundPlan();
    const db = new Map<string, PlanVersionRow>();
    const saver = new AppendOnlyPlanVersionSaver({ transport: {
      insert: async row => { if (db.has(row.id)) return { error: { code: "23505" } }; db.set(row.id, structuredClone(row)); return { error: null }; },
      readById: async id => ({ data: db.get(id) ?? null, error: null }),
    } });
    const metadata = planArchiveMetadata(plan, changedForm);
    const payload = { athlete_id: A, coach_id: C, plan_json: { ...plan, ...metadata }, objective: metadata._objective, weeks_count: 1, sessions_count: 1, validator_score: null, validator_grade: null, validator_summary: null };
    const first = await saver.save(payload);
    expect(first.status).toBe("CONFIRMED");
    const reopened = restoreStructuredPlan(db.get(first.attemptId!)!.plan_json)!;
    expect(reopened.weeks).toEqual(plan.weeks);
    expect(planArchiveMetadata(reopened, changedForm)).toEqual(metadata);
    expect(metadata._raceGoals).toEqual([{ objective: "10 km", raceDate: "2027-01-03", priority: "B" }]);
    const second = await saver.save({ ...payload, plan_json: { ...reopened, ...planArchiveMetadata(reopened, changedForm) } });
    expect(second.status).toBe("CONFIRMED"); expect(second.attemptId).toBe(first.attemptId); expect(db.size).toBe(1);
  });
  it("old coach-input DET uses its generation snapshot, and an unbound DET refuses instead of borrowing form dates", () => {
    const old = { ...det(), _provenance: { engine: "det", coachInputs: { planStartDate: "2026-11-09", objective: "Marathon", raceDate: "2027-02-28" } } } as unknown as ParsedPlan;
    expect(planArchiveMetadata(old, changedForm)).toMatchObject({ _planStartDate: "2026-11-09", _objective: "Marathon", _raceDate: "2027-02-28" });
    expect(() => planArchiveMetadata(det(), changedForm)).toThrow("Dates ou objectif du plan DET indisponibles");
  });
  it("AI and historical plans retain the existing form metadata, including secondary race goals", () => {
    const form = { ...changedForm, _raceGoals: [{ objective: "Semi", priority: "B" }] };
    for (const p of [{ ...det(), _provenance: { engine: "ai" } }, { title: "Historical", weeks: [] }])
      expect(planArchiveMetadata(p as unknown as ParsedPlan, form)).toEqual(form);
  });
});
