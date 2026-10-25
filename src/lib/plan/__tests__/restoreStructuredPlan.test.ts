import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { restoreCoachLimiterOrder, restoreStructuredPlan } from "../restoreStructuredPlan";
import { jsonPlanToParsedPlan } from "../jsonPlanToParsedPlan";
import type { MergedPlan } from "../mergePlanChunks";
import { parseSessionDurationMin } from "@/engines/plan/planValidator";
import fixture from "../qa/__tests__/fixtures/2026-10-15_B-5K-BEGINNER_run1.json";
import { QA_PROFILES } from "../qa/syntheticProfiles";
import { buildPilotFormConfig, preparePilotTrainingPlanContext } from "../qa/preparePilotTrainingPlanContext";
import { buildPlanConfigFromDiagnostic } from "@/engines/plan/planConfigBuilder";

const recorded = () => jsonPlanToParsedPlan(structuredClone(fixture.output.mergedPlan) as MergedPlan);
const disk = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

describe("saved structured plan reopening", () => {
  it("the recovered order reaches generation configuration in the same priority order", () => {
    const profile = QA_PROFILES.find(p => p.id === "B-10K")!;
    const prepared = preparePilotTrainingPlanContext(profile);
    const coachOrder = [...prepared.planConfig.identifiedLimitersRaw!].reverse();
    expect(coachOrder.length).toBeGreaterThan(1);
    const saved = disk({ _coachLimiterOrder: coachOrder });
    const config = buildPlanConfigFromDiagnostic(prepared.diagnostic, buildPilotFormConfig(profile.planConfig), restoreCoachLimiterOrder(saved._coachLimiterOrder));
    expect(config.identifiedLimitersRaw).toEqual(coachOrder);
  });

  it("preserves the explicit ranked coach order through a saved archive, without inventing legacy ranks", () => {
    const archive = disk({ ...recorded(), _coachLimiterOrder: ["TTE", "VO2max"] });
    expect(restoreCoachLimiterOrder(archive._coachLimiterOrder)).toEqual(["TTE", "VO2max"]);
    expect(restoreCoachLimiterOrder(undefined)).toEqual([]);
    expect(restoreCoachLimiterOrder(["TTE", 42])).toEqual([]);
    expect(restoreCoachLimiterOrder(["TTE", "TTE", "VO2max"])).toEqual(["TTE", "VO2max"]);
  });

  it("the page archives coach order, restores it, and clears it on athlete change", () => {
    const page = readFileSync(join(__dirname, "../../../pages/AITrainingPlanPage.tsx"), "utf8");
    const restoreAthlete = page.slice(page.indexOf("// Restore persisted CONFIG"), page.indexOf("// Persiste le brouillon non sauvegardé"));
    const archive = page.slice(page.indexOf("const persistPlanVersion ="), page.indexOf("const handleSaveToPlan ="));
    const loader = page.slice(page.indexOf("const applyLoadedVersion ="), page.indexOf("const handleLoadVersion ="));
    expect(restoreAthlete).toContain("setCoachLimiterOrder([])");
    expect(archive).toContain("_coachLimiterOrder: [...coachLimiterOrder]");
    expect(loader).toContain("setCoachLimiterOrder(restoreCoachLimiterOrder(pj._coachLimiterOrder))");
    expect(page).toContain("orderedMetrics={coachLimiterOrder}");
  });

  it("restores a recorded plan without quotas after serialization, without losing structured doses", () => {
    const saved = recorded();
    delete saved.weeklyQuotas;
    const restored = restoreStructuredPlan(disk(saved));
    expect(restored).toEqual(saved);
    expect(restored!.weeks[7].sessions.reduce((sum, s) => sum + parseSessionDurationMin(s), 0)).toBe(165);
  });

  it("keeps edited sessions, race identity, variants, zones and ranked strategic recap across two reopenings", () => {
    const edited = recorded();
    edited.weeks[0].sessions[0] = { ...edited.weeks[0].sessions[0], durationMin: 47, title: "Coach edited", custom: false,
      catalogId: "A_RUN_Z2_EASY", variantKey: "half", zones: ["Z2"], isKeySession: false };
    edited.weeks[11].sessions[6] = { ...edited.weeks[11].sessions[6], title: "COURSE : Ironman 70.3 Tours", sport: "brick",
      custom: true, catalogId: null, durationMin: 330 };
    const before = disk(edited);
    const reopened = restoreStructuredPlan(disk(edited));
    expect(reopened).toEqual(before);
    expect(restoreStructuredPlan(disk(reopened))).toEqual(before);
    reopened!.weeks[0].sessions[0].durationMin = 49;
    expect(edited).toEqual(before);
  });

  it("keeps missing historical session fields absent instead of guessing catalogue values", () => {
    const plan = recorded();
    delete plan.weeks[0].sessions[0].durationMin;
    delete plan.weeks[0].sessions[0].custom;
    const restored = restoreStructuredPlan(disk(plan));
    expect(restored!.weeks[0].sessions[0]).not.toHaveProperty("durationMin");
    expect(restored!.weeks[0].sessions[0]).not.toHaveProperty("custom");
  });

  it.each([null, { _markdown: "# Legacy plan" }, { weeks: "invalid", phases: [] }])("leaves Markdown-only or malformed archives to the legacy path: %j", value => {
    expect(restoreStructuredPlan(value)).toBeNull();
  });

  it("the explicit history loader uses the tested structured recovery path", () => {
    const page = readFileSync(join(__dirname, "../../../pages/AITrainingPlanPage.tsx"), "utf8");
    const loader = page.slice(page.indexOf("const applyLoadedVersion ="), page.indexOf("const handleLoadVersion ="));
    expect(loader).toContain("restoreStructuredPlan(pj)");
    expect(loader).toContain("setPlanOverride(restoredPlan)");
    expect(loader).not.toContain("if (pj.weeklyQuotas");
  });
});
