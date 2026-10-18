import { describe, expect, it } from "vitest";
import type { PlanConfig } from "@/hooks/useAITrainingPlan";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import { buildSessionPhysiologicalTraceability } from "../sessionPhysiologicalTraceability";

/**
 * P0 B-5K safety-gate baseline. No model calls, no changes to production
 * validators, and no relaxation of any existing traceability threshold.
 * TODO tests are explicitly UNIMPLEMENTED acceptance criteria, not passes.
 */
const catalog: LibraryWorkout = {
  id: "P0_B5K_RECOVERY_Z1",
  cat: "Récup",
  sport: "run",
  objectif: "Récupération facile",
  necessite: "Recommandé",
  when: "Après séance difficile",
  phase: ["base"],
  avoid: "Intensité élevée",
  durationMin: [25, 45],
  metricKey: "pace",
  sportKey: "run",
  structure: [{ part: "Main", text: "30 min récupération Z1", zones: ["Z1"] }],
  variants: {},
  goals: ["5k"],
  tags: ["recovery"],
};

function makeSession(overrides: Partial<MergedSession> = {}): MergedSession {
  return {
    weekNumber: 1, weekTheme: "Base", phase: "base",
    dayName: "Mercredi", dayIndex: 2, sport: "run",
    title: "Récupération facile", details: "30 min récupération Z1",
    isRest: false, isKeySession: false,
    catalogId: catalog.id, custom: false, durationMin: 30,
    zones: ["Z1"], ...overrides,
  };
}

function trace(session: MergedSession) {
  const plan: MergedPlan = {
    title: "P0 B-5K", phases: [{ name: "base", weeks: "S1" }],
    weeks: [{ weekNumber: 1, theme: "Base", phase: "base", sessions: [session] }],
    totalWeeks: 1,
  };
  const config: PlanConfig = {
    objective: "5 KM", weeksAvailable: 1,
    identifiedLimitersRaw: ["TTE"],
    strategyContext: {
      source: "lorang", primaryAction: "Endurance", confidence: "high",
      levers: [{ id: "z2_volume", label: "Volume Z2", priority: 1, reason: "TTE", adaptations: [] }],
      trainingFocus: { do: [], avoid: [] }, recommendedWeekType: "base",
    },
  };
  return buildSessionPhysiologicalTraceability({
    plan, planConfig: config, catalog: [catalog],
    allowedCatalogIds: [catalog.id],
    now: new Date("2026-10-18T00:00:00Z"),
  });
}

describe("P0 B-5K — existing safety signal baseline", () => {
  it("keeps a Z2 prescription above a Z1-only catalog ceiling as a critical anomaly", () => {
    const result = trace(makeSession({ zones: ["Z2"], details: "30 min Z2" }));
    expect(result.sessions[0].dose.intensity.status).toBe("conflict");
    expect(result.sessions[0].status).not.toBe("verified");
    expect(result.sessions[0].anomalies).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "dose_intensity_exceeds_catalog", severity: "critical" }),
    ]));
  });

  it("flags a duration below the catalog range rather than silently accepting it", () => {
    const result = trace(makeSession({ durationMin: 20 }));
    expect(result.sessions[0].dose.duration).toMatchObject({
      valueMin: 20, catalogRangeMin: [25, 45], status: "conflict",
    });
    expect(result.sessions[0].status).not.toBe("verified");
  });

  it("does not fabricate a verified causal chain for recovery with an unmatched lever", () => {
    const result = trace(makeSession());
    expect(result.sessions[0].status).not.toBe("verified");
    expect(result.sessions[0].anomalies).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "causal_link_not_verified" }),
    ]));
  });
});

describe("P0 B-5K — pending sport-safety acceptance criteria", () => {
  it.todo("enforces the documented week-one ramp cap using the explicitly defined run/strength/total scope");
  it.todo("flags run-load increases over the configured 10% cap with documented deload exceptions");
  it.todo("flags advanced Over-Under prescriptions incompatible with an untrained high-injury-risk runner");
  it.todo("requires historical load justification for a week-one deload workout");
  it.todo("enforces sessionsPerWeek consistently with the configured strength-session accounting");
  it.todo("validates safety and volume on the FINAL merged plan, not only intermediate chunks");
});
