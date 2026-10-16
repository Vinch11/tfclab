import { describe, expect, it } from "vitest";
import type { PlanConfig } from "@/hooks/useAITrainingPlan";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import { QA_PROFILES } from "../syntheticProfiles";
import { preparePilotTrainingPlanContext } from "../preparePilotTrainingPlanContext";
import { buildSessionPhysiologicalTraceability } from "../sessionPhysiologicalTraceability";

function workout(overrides: Partial<LibraryWorkout> = {}): LibraryWorkout {
  return {
    id: "RUN_VO2_INTERVALS",
    cat: "VO2",
    sport: "run",
    objectif: "Intervalles VO2max",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Fatigue élevée",
    durationMin: [35, 50],
    metricKey: "pace",
    sportKey: "run",
    structure: [
      { part: "Warm-up", text: "10 min Z1-Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "5x4min Z5 récup 3min", zones: ["Z5"] },
      { part: "Cool-down", text: "10 min Z1", zones: ["Z1"] },
    ],
    variants: { "5k": "5x4min" },
    goals: ["5k"],
    tags: ["vo2"],
    ...overrides,
  };
}

function session(overrides: Partial<MergedSession> = {}): MergedSession {
  return {
    weekNumber: 3,
    weekTheme: "Build",
    phase: "build",
    dayName: "Mardi",
    dayIndex: 1,
    sport: "run",
    title: "Intervalles VO2max",
    details: "5x4min Z5 récup 3min",
    isRest: false,
    isKeySession: true,
    catalogId: "RUN_VO2_INTERVALS",
    custom: false,
    durationMin: 45,
    zones: ["Z5"],
    ...overrides,
  };
}

function plan(sessions: MergedSession[]): MergedPlan {
  return {
    title: "Plan test",
    phases: [{ name: "build", weeks: "S1-S4" }],
    weeks: [{ weekNumber: 3, theme: "Build", phase: "build", sessions }],
    totalWeeks: 4,
  };
}

function config(overrides: Partial<PlanConfig> = {}): PlanConfig {
  return {
    objective: "5 KM",
    weeksAvailable: 4,
    identifiedLimitersRaw: ["VO2max"],
    strategyContext: {
      source: "lorang",
      primaryAction: "Développer VO2max",
      confidence: "high",
      levers: [{
        id: "vo2_intervals",
        label: "Intervalles VO2max",
        priority: 1,
        reason: "VO2max sous la cible",
        adaptations: ["Plafond aérobie"],
      }],
      trainingFocus: { do: [], avoid: [] },
      recommendedWeekType: "vo2",
    },
    ...overrides,
  };
}

describe("buildSessionPhysiologicalTraceability", () => {
  it("vérifie la chaîne limiteur → levier → intention → dose sur la séance finale", () => {
    const report = buildSessionPhysiologicalTraceability({
      plan: plan([session()]),
      planConfig: config(),
      catalog: [workout()],
      allowedCatalogIds: ["RUN_VO2_INTERVALS"],
      now: new Date("2026-10-16T00:00:00Z"),
    });

    console.log("TRACE_DEBUG_COHERENT", JSON.stringify(report));

    expect(report.summary).toMatchObject({ activeSessions: 1, verified: 1, critical: 0 });
    expect(report.sessions[0]).toMatchObject({
      status: "verified",
      limiter: { metric: "VO2max", priority: 1 },
      lever: { id: "vo2_intervals", priority: 1 },
      intention: { family: "vo2", source: "catalog_metadata" },
      dose: {
        status: "verified",
        duration: { status: "verified" },
        intensity: { maxZone: 5, catalogMaxZone: 5, status: "verified" },
        volume: { workSeconds: 1200 },
      },
    });
    expect(report.sessions[0].dose.recoverySeconds).toEqual([180]);
  });

  it("laisse une séance custom not_verified au lieu d'inventer une intention", () => {
    const report = buildSessionPhysiologicalTraceability({
      plan: plan([session({ catalogId: null, custom: true, title: "Séance libre", details: "Selon sensations", zones: [] })]),
      planConfig: config(),
      catalog: [workout()],
    });

    expect(report.sessions[0].status).toBe("not_verified");
    expect(report.sessions[0].limiter).toBeNull();
    expect(report.sessions[0].lever).toBeNull();
    expect(report.sessions[0].intention).toBeNull();
    expect(report.sessions[0].anomalies).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "intention_not_identified", severity: "warning" }),
    ]));
  });

  it("détecte un changement d'objectif sportif même à intensité identique", () => {
    const threshold = workout({
      id: "RUN_THRESHOLD_CONTINUOUS",
      cat: "TT",
      objectif: "Seuil continu",
      tags: ["threshold"],
      structure: [{ part: "Main", text: "3x8min au seuil Z4", zones: ["Z4"] }],
    });
    const report = buildSessionPhysiologicalTraceability({
      plan: plan([session({
        catalogId: "RUN_THRESHOLD_CONTINUOUS",
        title: "Allure 5km spécifique course",
        details: "4x1000m allure 5km Z4 récup 2min",
        zones: ["Z4"],
      })]),
      planConfig: config({
        identifiedLimitersRaw: ["TTE"],
        strategyContext: {
          source: "lorang", primaryAction: "Seuil", confidence: "high",
          levers: [{ id: "threshold_work", label: "Travail au seuil", priority: 1, reason: "TTE", adaptations: [] }],
          trainingFocus: { do: [], avoid: [] }, recommendedWeekType: "mixed",
        },
      }),
      catalog: [threshold],
      allowedCatalogIds: ["RUN_THRESHOLD_CONTINUOUS"],
    });

    expect(report.sessions[0].dose.intensity.status).toBe("verified");
    expect(report.sessions[0].anomalies).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "final_intent_differs_from_catalog", severity: "critical" }),
    ]));
    expect(report.sessions[0].status).toBe("uncertain");
  });

  it("détecte une séance incompatible avec une prohibition structurée", () => {
    const sprint = workout({
      id: "RUN_SPRINT_SHORT",
      cat: "Sprint",
      objectif: "Sprints all-out",
      tags: ["sprint", "pmax"],
      structure: [{ part: "Main", text: "8x10s sprint all-out Z7", zones: ["Z7"] }],
    });
    const report = buildSessionPhysiologicalTraceability({
      plan: plan([session({ catalogId: sprint.id, title: "Sprints all-out", details: "8x10s Z7 récup 2min", zones: ["Z7"] })]),
      planConfig: config({ prohibitions: ["🚫 SPRINT BAN — sprints all-out interdits"] }),
      catalog: [sprint],
    });

    expect(report.anomalies).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "prohibition_conflict", severity: "critical" }),
    ]));
  });

  it("signale un décalage quand seule une priorité secondaire est représentée", () => {
    const threshold = workout({
      id: "RUN_THRESHOLD_CONTINUOUS",
      cat: "TT",
      objectif: "Seuil continu",
      tags: ["threshold"],
      structure: [{ part: "Main", text: "3x8min au seuil Z4", zones: ["Z4"] }],
    });
    const report = buildSessionPhysiologicalTraceability({
      plan: plan([session({ catalogId: threshold.id, title: "Seuil continu", details: "3x8min seuil Z4 récup 2min", zones: ["Z4"] })]),
      planConfig: config({
        identifiedLimitersRaw: ["VO2max", "TTE"],
        strategyContext: {
          source: "lorang", primaryAction: "Mixte", confidence: "high",
          levers: [{ id: "threshold_work", label: "Travail au seuil", priority: 2, reason: "TTE", adaptations: [] }],
          trainingFocus: { do: [], avoid: [] }, recommendedWeekType: "mixed",
        },
      }),
      catalog: [threshold],
    });

    console.log("TRACE_DEBUG_PRIORITY", JSON.stringify(report));

    expect(report.sessions[0].status).toBe("verified");
    expect(report.anomalies).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "priority_not_represented", severity: "warning" }),
    ]));
  });

  it("couvre B-5K-BEGINNER et conserve l'incertitude de ses données réelles", () => {
    const profile = QA_PROFILES.find(candidate => candidate.id === "B-5K-BEGINNER");
    if (!profile) throw new Error("Profil B-5K-BEGINNER introuvable");
    const prepared = preparePilotTrainingPlanContext(profile);
    const report = buildSessionPhysiologicalTraceability({
      plan: plan([session({ catalogId: null, custom: true, title: "Footing libre", details: "30min facile", zones: ["Z2"] })]),
      planConfig: prepared.planConfig,
      catalog: [],
    });

    expect(report.context.trainingLevel).toBe("untrained");
    expect(report.context.trainingLevelSource).toBe("manual");
    expect(report.context.diagnosticConfidence).toBe(prepared.trace.diagnostic.confidenceGlobal);
    expect(report.sessions[0].status).toBe("not_verified");
    expect(report.summary.verified).toBe(0);
  });

  it("utilise le niveau réel uniquement pour les prérequis explicitement documentés", () => {
    const demanding = workout({ id: "V3_BIKE_VO2_TABATA", sport: "bike" });
    const report = buildSessionPhysiologicalTraceability({
      plan: plan([session({ catalogId: demanding.id, sport: "bike" })]),
      planConfig: config({
        ambitionMeta: {
          saisie: "finisher", effective: "finisher", saisieLabel: "Découverte", effectiveLabel: "Découverte",
          downgraded: false, trainingLevel: "untrained", trainingLevelSource: "manual", diagnosticNote: null,
        },
      }),
      catalog: [demanding],
    });

    expect(report.anomalies).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "level_prerequisite_conflict", severity: "critical" }),
    ]));
  });
});
