import { describe, expect, it } from "vitest";
import type { PlanConfig } from "@/hooks/useAITrainingPlan";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import { classifyIntentEvidence, intentFamilyOf } from "@/lib/plan/intentFamily";
import { buildSessionPhysiologicalTraceability } from "../sessionPhysiologicalTraceability";

/**
 * P3 diagnostic characterization tests.
 *
 * These tests intentionally document CURRENT observable behavior rather than
 * silently changing classifier priorities or loosening verified criteria.
 * A future fix should add corrected-behavior tests before changing production code.
 */
function workout(overrides: Partial<LibraryWorkout> = {}): LibraryWorkout {
  return {
    id: "AUDIT_RUN_Z1_RECOVERY",
    cat: "Récup",
    sport: "run",
    objectif: "Récupération Z1 stricte",
    necessite: "Recommandé",
    when: "Après séance difficile",
    phase: ["base"],
    avoid: "Intensité",
    durationMin: [25, 45],
    metricKey: "pace",
    sportKey: "run",
    structure: [{ part: "Main", text: "30 min récupération Z1", zones: ["Z1"] }],
    variants: {},
    goals: ["5k"],
    tags: ["recovery"],
    ...overrides,
  };
}

function session(overrides: Partial<MergedSession> = {}): MergedSession {
  return {
    weekNumber: 1,
    weekTheme: "Base",
    phase: "base",
    dayName: "Mercredi",
    dayIndex: 2,
    sport: "run",
    title: "Récupération Z1 stricte",
    details: "30 min récupération Z1",
    isRest: false,
    isKeySession: false,
    catalogId: "AUDIT_RUN_Z1_RECOVERY",
    custom: false,
    durationMin: 30,
    zones: ["Z1"],
    ...overrides,
  };
}

function config(overrides: Partial<PlanConfig> = {}): PlanConfig {
  return {
    objective: "5 KM",
    weeksAvailable: 4,
    identifiedLimitersRaw: ["TTE"],
    strategyContext: {
      source: "lorang",
      primaryAction: "Récupérer",
      confidence: "high",
      levers: [{
        id: "hrv_adaptation",
        label: "Adaptation récupération",
        priority: 1,
        reason: "Fatigue",
        adaptations: [],
      }],
      trainingFocus: { do: [], avoid: [] },
      recommendedWeekType: "recovery",
    },
    ...overrides,
  };
}

function report(w: LibraryWorkout, s: MergedSession, c: PlanConfig = config()) {
  const plan: MergedPlan = {
    title: "Audit P3",
    phases: [{ name: "base", weeks: "S1-S4" }],
    weeks: [{ weekNumber: 1, theme: "Base", phase: "base", sessions: [s] }],
    totalWeeks: 4,
  };
  return buildSessionPhysiologicalTraceability({
    plan,
    planConfig: c,
    catalog: [w],
    allowedCatalogIds: [w.id],
    now: new Date("2026-10-17T00:00:00Z"),
  });
}

describe("P3 characterization — intent classifier", () => {
  it("classifies an explicit recovery phrase as recovery", () => {
    expect(classifyIntentEvidence("Récupération Z1 stricte", 1).family).toBe("recuperation");
  });

  it("documents that an incidental test word currently takes precedence over recovery", () => {
    const evidence = classifyIntentEvidence("Récupération Z1 — test de sensations", 1);
    expect(evidence).toMatchObject({ family: "test", source: "pattern" });
  });

  it("documents that force currently takes precedence over proprioception", () => {
    const evidence = classifyIntentEvidence("Proprioception cheville et force du pied", 1);
    expect(evidence).toMatchObject({ family: "force", source: "pattern" });
  });

  it("classifies a pure ankle proprioception description as technique", () => {
    expect(classifyIntentEvidence("Proprioception cheville", 1).family).toBe("technique");
  });

  it("documents that an incidental test term in catalog structure can classify a recovery workout as test", () => {
    const w = workout({
      id: "AUDIT_RUN_Z1_RECOVERY",
      tags: ["recovery"],
      structure: [{ part: "Main", text: "30 min récupération Z1, test de sensations", zones: ["Z1"] }],
    });
    expect(intentFamilyOf(w)).toBe("test");
  });
});

describe("P3 characterization — causal contracts and dose", () => {
  it("does not fabricate a causal pair for HRV recovery when limiter keys are empty", () => {
    const result = report(workout(), session());
    expect(result.sessions[0].limiter).toBeNull();
    expect(result.sessions[0].lever).toBeNull();
    expect(result.sessions[0].status).toBe("uncertain");
    expect(result.sessions[0].anomalies).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "causal_link_not_verified" }),
    ]));
  });

  it("does not certify an otherwise catalog-consistent technical session without a recognized causal lever", () => {
    const w = workout({
      id: "AUDIT_ANKLE_PROPRIO",
      cat: "C",
      objectif: "Proprioception cheville",
      tags: ["proprioception"],
      structure: [{ part: "Main", text: "30 min proprioception cheville Z1", zones: ["Z1"] }],
    });
    const s = session({
      catalogId: w.id,
      title: "Proprioception cheville",
      details: "30 min proprioception cheville Z1",
    });
    const result = report(w, s);
    expect(result.sessions[0].intention?.family).toBe("technique");
    expect(result.sessions[0].limiter).toBeNull();
    expect(result.sessions[0].status).toBe("uncertain");
  });

  it("preserves a genuine critical Z2-versus-Z1 catalog intensity conflict", () => {
    const result = report(workout(), session({
      title: "Récupération Z1-Z2",
      details: "30 min récupération Z1-Z2",
      zones: ["Z2"],
    }));
    expect(result.sessions[0].dose.intensity.status).toBe("conflict");
    expect(result.sessions[0].status).not.toBe("verified");
    expect(result.sessions[0].anomalies).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "dose_intensity_exceeds_catalog",
        severity: "critical",
      }),
    ]));
  });

  it("does not certify an out-of-range duration even when zone is valid", () => {
    const result = report(workout(), session({ durationMin: 20 }));
    expect(result.sessions[0].dose.duration.status).toBe("conflict");
    expect(result.sessions[0].status).not.toBe("verified");
  });
});
