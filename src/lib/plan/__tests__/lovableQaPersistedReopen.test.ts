import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { restoreCoachLimiterOrder, restoreStructuredPlan } from "../restoreStructuredPlan";
import captured from "./fixtures/lovableQaPersistedVersions.v3v4.json";

/**
 * Uses exactly the two synthetic plan_json values read from the isolated
 * Lovable QA PostgreSQL database, not generated/mocked training prescriptions.
 * This is a client parser regression, NOT a real JWT/PostgREST or UI E2E test.
 */
const snapshots = captured.versions;
const reread = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

describe("Lovable QA: persisted structured versions V3/V4", () => {
  it("uses only non-prescriptive synthetic fixtures with stable IDs", () => {
    expect(captured.kind).toBe("synthetic_qa_only");
    expect(snapshots.map((v) => v.objective)).toEqual(["QA_UI_V3", "QA_UI_V4"]);
    for (const { plan_json: p } of snapshots) {
      expect(p._qaFixture).toBe(true);
      expect(p._qaNonPrescriptive).toBe(true);
      expect(p._recipeId).toBe("TFCL_QA_UI_20261101");
      expect(p._markdown).toContain("NE PAS TRANSMETTRE");
    }
  });

  it.each([0, 1])("reopens V%s twice without corrupting dose, dates or priorities", index => {
    const saved = reread(snapshots[index].plan_json);
    const one = restoreStructuredPlan(saved);
    expect(one).not.toBeNull();
    expect(one).toEqual(saved);
    const two = restoreStructuredPlan(reread(one));
    expect(two).toEqual(saved);
    expect(one!.weeks).toHaveLength(1);
    expect(one!.phases).toHaveLength(1);
    expect(one!.weeks[0].weekNumber).toBe(1);
    expect(one!.weeks[0].sessions[0].sport).toBe("run");
    expect(one!.weeks[0].sessions[0].durationMin).toBe(index === 0 ? 40 : 45);
    expect(restoreCoachLimiterOrder(saved._coachLimiterOrder))
      .toEqual(["aerobic_ceiling", "fractional_utilization"]);
    expect(saved._raceGoals[0].raceDate).toBe("2027-05-09");
    expect(saved._planStartDate).toBe("2026-11-02");
    one!.weeks[0].sessions[0].durationMin = 999;
    expect(saved.weeks[0].sessions[0].durationMin).toBe(index === 0 ? 40 : 45);
  });

  it("preserves both immutable historical versions as independent JSON objects", () => {
    const [v3, v4] = snapshots.map(v => v.plan_json);
    expect(v3._revision).toBe(3);
    expect(v4._revision).toBe(4);
    expect(v3.weeks[0].sessions[0].durationMin).toBe(40);
    expect(v4.weeks[0].sessions[0].durationMin).toBe(45);
    expect(v4._coachLimiterOrder).toEqual(v3._coachLimiterOrder);
    expect(v4._raceGoals).toEqual(v3._raceGoals);
  });

  it("routes history selection through the structured loader without overwriting calendar", () => {
    const page = readFileSync(resolve(process.cwd(), "src/pages/AITrainingPlanPage.tsx"), "utf8");
    const history = readFileSync(resolve(process.cwd(), "src/components/PlanHistoryCard.tsx"), "utf8");
    expect(history).toContain('from("plan_versions")');
    expect(history).toContain('onLoadVersion(v)');
    expect(page).toContain("restoreStructuredPlan(pj)");
    expect(page).toContain("setPlanOverride(restoredPlan)");
    expect(page).toContain("setCoachLimiterOrder(restoreCoachLimiterOrder(pj._coachLimiterOrder))");
  });
});
