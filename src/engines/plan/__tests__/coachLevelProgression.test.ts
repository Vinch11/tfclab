import { describe, expect, it } from "vitest";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
import { preparePilotTrainingPlanContext, buildPilotFormConfig, buildPilotDiagnosticInput } from "@/lib/plan/qa/preparePilotTrainingPlanContext";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { buildPlanConfigFromDiagnostic, type CoachTrainingLevel } from "../planConfigBuilder";
const profile = QA_PROFILES.find(p => p.id === "B-10K")!;
const prepared = preparePilotTrainingPlanContext(profile);
const levels: CoachTrainingLevel[] = ["untrained", "light", "trained", "highly_trained"];
function config(level: CoachTrainingLevel, weeklyHours?: number) {
  return buildPlanConfigFromDiagnostic(prepared.diagnostic, { ...buildPilotFormConfig(profile.planConfig),
    objective: "10K", ambition: "world_class", weeksAvailable: 12, sessionsPerWeek: undefined,
    trainingLevel: level, weeklyHours,
  });
}
describe("coach level progression without quantitative input", () => {
  it.each(levels)("%s builds the existing ramp even without hours", level => {
    const c = config(level);
    expect(c.ambitionMeta!.trainingLevel).toBe(level);
    expect(c.ambitionMeta!.trainingLevelSource).toBe("manual");
    expect(c.volumeRamp).toBeDefined();
    expect(c.weeklyHours).toBeGreaterThan(0);
  });
});

import { inferWeekType, computeWeekQuotaEntry, applySlFloorIndividualization, buildCoachVolumeBudget, buildQuotaPromptBlock, resolveCoachHoursReference } from "../sessionSizingMatrix";
import { buildWeeklySlotLayout } from "../weeklySlotLayout";
import { validateWeeklyQuotas, type WeekQuotaEntry } from "@/lib/plan/validateWeeklyQuotas";
import { computeFinalValidationIssues } from "@/lib/plan/qa/finalValidation";
import { buildWeekQuotaTransport } from "@/lib/plan/weekQuotaTransport";
import { postProcessParsedPlan } from "../computePlan";
import { restoreStructuredPlan } from "@/lib/plan/restoreStructuredPlan";
import type { ParsedPlan } from "@/lib/aiPlanParser";

function prescribed(level: CoachTrainingLevel) {
  const c = config(level);
  const quotas: Record<number, WeekQuotaEntry> = {};
  let lastLoad = 0;
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1, weekType = inferWeekType(n, 12, "10K", 32);
    const entry = computeWeekQuotaEntry("10K", c.ambition!, c.weeklyHours!, weekType, false)!;
    const floors = applySlFloorIndividualization(entry.floors, n, weekType, c.volumeRamp!).floors;
    const layout = buildWeeklySlotLayout(entry.quota, floors, weekType);
    const budget = buildCoachVolumeBudget(c.volumeRamp, n, weekType, c.weeklyHoursSource);
    quotas[n] = { ...entry, floors, layout, volumeBudget: budget };
    let minutes = budget?.maxMinutes ?? 60;
    if (budget && lastLoad) minutes = Math.min(minutes, Math.floor(lastLoad * (weekType === "recovery" ? 0.7 : 1 + budget.weeklyIncreasePctMax)));
    if (weekType === "load") lastLoad = minutes;
    const slots = layout.days.flatMap((d, dayIndex) => d.slots.map(slot => ({ ...slot, dayName: d.dayName, dayIndex })));
    // An explicit custom prescription, not a rewritten catalogue card.
    const minimum = slots.map(slot => slot.minDurationMin ?? 1);
    const extra = Math.max(0, minutes - minimum.reduce((a, b) => a + b, 0));
    const sessions = slots.map((slot, j) => ({ weekNumber: n, weekTheme: "Fixture existante B-10K", phase: "base",
      dayIndex: slot.dayIndex, dayName: slot.dayName, sport: slot.sport, title: "Endurance facile", details: "", isRest: false,
      custom: true, catalogId: null, zones: ["Z2"], isKeySession: !!slot.isKeySession,
      durationMin: minimum[j] + Math.floor(extra / slots.length) + (j < extra % slots.length ? 1 : 0),
    }));
    return { weekNumber: n, phase: "base", theme: "Fixture", sessions };
  });
  return { c, plan: { title: "Fixture 10K — 12 semaines", totalWeeks: 12, phases: [], weeks, weeklyQuotas: quotas } as ParsedPlan };
}

describe("actual prescribed plan, after transformations and reopening", () => {
  it.each(levels)("%s: validates real weekly doses, frequency and assimilation without measured load", level => {
    const { c, plan } = prescribed(level);
    expect(c.weeklyHoursSource).toBe("internal-matrix");
    expect(c.recentLoad!.source).toBe("MANUAL"); // qualitative estimate, not Nolio or a measurement
    expect(c.identifiedLimitersRaw).toEqual(config("light").identifiedLimitersRaw);
    expect(validateWeeklyQuotas(plan as never, plan.weeklyQuotas!).filter(i => i.code === "coach_load_violation")).toEqual([]);
    expect(plan.weeks[0].sessions.filter(s => s.sport === "run")).toHaveLength(plan.weeklyQuotas![1].quota.run.min);
    const total = (n: number) => plan.weeks[n - 1].sessions.reduce((a, s) => a + (s.durationMin ?? 0), 0);
    expect(total(1)).toBeLessThanOrEqual(c.volumeRamp!.week1HoursMax * 60);
    expect(total(4)).toBeLessThanOrEqual(total(3) * 0.7);
    expect(total(5)).toBeLessThanOrEqual(total(3) * 1.1);
    const processed = postProcessParsedPlan(plan, { ...c, mode: "ai", weeksAvailable: 12 }).plan;
    const reopened = restoreStructuredPlan(JSON.parse(JSON.stringify(processed)))!;
    const before = JSON.stringify(reopened);
    expect(computeFinalValidationIssues(reopened).issues.filter(i => i.rule === "coach_load_violation")).toEqual([]);
    reopened.weeks[0].sessions[0].durationMin = 1000;
    expect(computeFinalValidationIssues(reopened).issues).toContainEqual(expect.objectContaining({ rule: "coach_load_violation", severity: "error" }));
    expect(JSON.stringify(processed)).toBe(before);
    expect(processed.weeks[0].sessions[0].catalogId).toBeNull();
  });
  it("rejects jumps and false assimilation even below a nominal weekly ceiling", () => {
    const { plan } = prescribed("highly_trained");
    plan.weeks[0].sessions.forEach(s => { s.durationMin = 5; });
    expect(computeFinalValidationIssues(plan).issues.some(i => i.rule === "coach_load_violation" && /progression/.test(i.message))).toBe(true);
    const normal = prescribed("light").plan;
    normal.weeks[3].sessions.forEach(s => { s.durationMin = 100; });
    expect(computeFinalValidationIssues(normal).issues.some(i => i.rule === "coach_load_violation")).toBe(true);
  });
  it("does not silently certify unknown duration, but accepts an official race without a training-volume cap", () => {
    const { plan } = prescribed("light");
    delete plan.weeks[0].sessions[0].durationMin;
    expect(computeFinalValidationIssues(plan).issues.some(i => i.rule === "coach_load_violation" && /non vérifiable/.test(i.message))).toBe(true);
    const race = prescribed("light").plan;
    race.weeks[0].sessions[0] = { ...race.weeks[0].sessions[0], title: "COURSE : 10 km officiel", durationMin: 120 };
    expect(computeFinalValidationIssues({ weeks: [race.weeks[0]], weeklyQuotas: race.weeklyQuotas }).issues.filter(i => i.rule === "coach_load_violation")).toEqual([]);
  });
  it("retains the same budget and source across prompts and targeted regeneration", () => {
    const { plan } = prescribed("light");
    const entry = plan.weeklyQuotas![5];
    const wire = JSON.parse(JSON.stringify(buildWeekQuotaTransport(5, entry)));
    expect(wire._weeklyQuotas[5].volumeBudget).toEqual(entry.volumeBudget);
    expect(buildQuotaPromptBlock([5], wire._weeklyQuotas)).toContain("NON mesurée");
    expect(wire._weeklyQuotasPromptByChunk[0]).toContain(`MAX ${entry.volumeBudget!.maxMinutes} min`);
  });
});

describe("existing inputs and disciplines remain supported", () => {
  it.each(levels)("%s preserves explicit hours and the existing coefficients", level => {
    const c = config(level, 6);
    expect(c.weeklyHours).toBe(6);
    expect(c.weeklyHoursSource).toBe("coach");
    expect(c.volumeRamp!.week1PctTarget).toBe({ untrained: 0.4, light: 0.6, trained: 0.8, highly_trained: 0.95 }[level]);
  });
  it.each(["703", "IM", "Marathon", "Semi", "Sprint", "Olympic", "5K", "StartToRun"])("%s uses its own existing matrix, never a run-only reference", objective => {
    const ref = resolveCoachHoursReference(objective, "age_group");
    expect(ref?.source).toBe("internal-matrix");
    expect(ref!.hours).toBeGreaterThan(0);
    expect(resolveCoachHoursReference(objective, "age_group", 12)).toEqual({ hours: 12, source: "coach" });
    expect(computeWeekQuotaEntry(objective, "age_group", ref!.hours, "load", false)).not.toBeNull();
  });
  it("no selected level keeps the historical no-ramp path unchanged", () => {
    const c = buildPlanConfigFromDiagnostic(prepared.diagnostic, { ...buildPilotFormConfig(profile.planConfig), trainingLevel: undefined, weeklyHours: undefined });
    expect(c.volumeRamp).toBeUndefined();
    expect(c.weeklyHours).toBeUndefined();
  });
});

describe("physiology and recovery protections", () => {
  it("a good existing physiological fixture never promotes a low selected training level", () => {
    expect(profile.athleteData.vma).toBe(18);
    expect(profile.athleteData.vo2max).toBe(58);
    const c = config("untrained");
    expect(c.ambitionMeta!.effective).toBe("finisher");
    expect(c.volumeRamp!.week1PctTarget).toBe(0.4);
    expect(c.volumeRamp!.weeklyIncreasePctMax).toBe(0.1);
    expect(c.identifiedLimitersRaw).toEqual(config("highly_trained").identifiedLimitersRaw);
  });
  it("keeps the existing recovery adjustment and its reason without replacing the manual level", () => {
    const diagnostic = computeDiagnostic({ ...buildPilotDiagnosticInput(profile), objectif: "Marathon", tss7d: 650 });
    const c = buildPlanConfigFromDiagnostic(diagnostic, { objective: "Marathon", ambition: "world_class", trainingLevel: "highly_trained", weeksAvailable: 12 });
    expect(c.ambitionMeta!.trainingLevel).toBe("highly_trained");
    expect(c.volumeRamp!.trainingLevel).toBe("highly_trained");
    expect(c.volumeRamp!.recentLoadAdjustment!.effectiveLevel).toBe("light");
    expect(c.volumeRamp!.recentLoadAdjustment!.reason).toBeTruthy();
    expect(c.volumeRamp!.weeklyIncreasePctMax).toBe(0.07);
    const b = buildCoachVolumeBudget(c.volumeRamp, 1, "load", c.weeklyHoursSource)!;
    expect(b.maxMinutes).toBeLessThanOrEqual(8 * 60);
    expect(b.weeklyIncreasePctMax).toBe(0.07);
  });
});
