import { describe, expect, it } from "vitest";
import fixture from "./fixtures/2026-10-15_B-5K-BEGINNER_run1.json";
import type { MergedPlan } from "@/lib/plan/mergePlanChunks";
import { jsonPlanToParsedPlan } from "@/lib/plan/jsonPlanToParsedPlan";
import { validatePlanPaces } from "@/lib/validatePlanPaces";
import { validatePlan, parseSessionDurationMin } from "@/engines/plan/planValidator";

function replay(tagged = true) {
  const parsed = jsonPlanToParsedPlan(structuredClone(fixture.output.mergedPlan) as MergedPlan);
  if (tagged) validatePlanPaces(parsed, null, "5 KM");
  return validatePlan(parsed, "5 KM", undefined, undefined, undefined, undefined,
    { ...fixture.input.athleteData, runMLSSEffectiveSource: "predicted" }, undefined, undefined, undefined, "finisher",
    fixture.input.planConfig.constraints, false, undefined,
    { trainingLevel: "untrained", trainingLevelSource: "manual" });
}

describe("replay local B-5K-BEGINNER 2026-10-15 (aucun appel IA)", () => {
  it("ne signale plus les sept vrais repos ni la compétition objectif en affûtage", () => {
    const result = replay();
    expect(result.issues.filter(i => i.rule === "rest_day_coherence")).toEqual([]);
    expect(result.issues.filter(i => i.rule === "phase_coherence" && i.week === 12)).toEqual([]);
  });

  it("les tags d'affichage n'altèrent pas la polarisation ou les séances exigeantes", () => {
    const select = (result: ReturnType<typeof replay>) => result.issues
      .filter(i => ["polarization", "demanding_session_accumulation"].includes(i.rule))
      .map(i => ({ rule: i.rule, week: i.week, severity: i.severity }));
    expect(select(replay())).toEqual(select(replay(false)));
  });

  it("retire la fausse accumulation S8 mais conserve les avertissements de distribution réelle", () => {
    expect(replay().issues.some(i => i.rule === "demanding_session_accumulation" && i.week === 8)).toBe(false);
    expect(replay().issues.some(i => i.rule === "lorang_categories" && i.week === 8)).toBe(true);
    expect(replay().issues.some(i => i.rule === "demanding_session_accumulation" && i.week === 11)).toBe(false);
  });

  it("ne lit pas Z3 haut comme 3 heures, tout en conservant les durées en heures", () => {
    const parsed = jsonPlanToParsedPlan(structuredClone(fixture.output.mergedPlan) as MergedPlan);
    const session = parsed.weeks.find(w => w.weekNumber === 8)!.sessions.find(s => s.dayName === "Dimanche")!;
    expect(parseSessionDurationMin(session)).toBe(60); // durée prescrite enregistrée
    expect(parseSessionDurationMin({ ...session, durationMin: undefined })).toBe(55); // legacy : jamais235min
    expect(parseSessionDurationMin({ ...session, durationMin: undefined, title: "Endurance", details: "1h30 Z2" })).toBe(90);
    expect(parseSessionDurationMin({ ...session, durationMin: undefined, title: "Endurance", details: "2 h 15 Z2" })).toBe(135);
    expect(replay().weekMetrics.find(w => w.weekNumber === 8)!.totalDurationMin).toBe(165);
  });
});
