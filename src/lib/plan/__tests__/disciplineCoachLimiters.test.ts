import { expect, it } from "vitest";
import { preparePrevalidationFixture } from "@/qa/sports-plan-lab/prevalidationFixtures";
import { applyCoachProfileOverrides } from "../coachProfileOverrides";
import {
  detectUnifiedLimiter,
  type UnifiedLimiterInput,
} from "@/lib/v2/unifiedLimiterDetection";
import type { CoachProfileFormPayload } from "@/components/CoachProfileForm";
const input: UnifiedLimiterInput = {
  vo2max: 50,
  ftpKg: 3,
  vlamax: .65,
  wprimeKj: 60,
  cpDataQuality: "good",
  tte: 35,
  fatmax: 40,
  economyScore: 65,
  vma: 15,
  sportFocus: "run",
  availabilityScore: 85,
  hasHealthAlerts: false,
  objectif: "10K",
  ambition: "age_group",
  age: 35,
};
export const defaultCoachPayload: CoachProfileFormPayload = {
  metabolicProfile: "balanced",
  primaryLimiter: "glycolytic",
  primaryLimiterMetric: "VLamax",
  secondaryLimiter: null,
  secondaryLimiterMetric: null,
  prohibitions: [],
  sessionsPerWeek: null,
  durationMode: "free",
  raceDate: null,
  weeksAvailable: 12,
  overriddenByCoach: { primary: false, secondary: false },
};
it("bike-derived W prime stays in the assessment but cannot rank as a CAP prescription limiter", () => {
  const result = detectUnifiedLimiter(input),
    w = result.gapAnalysis.find((g) => g.metric === "W' (kJ)")!;
  expect(w.value).toBe(60);
  expect(w.target).toBeGreaterThan(0);
  expect(w.status).toBe("limiting");
  expect(result.categoryRanking.flatMap((c) => c.metrics.map((g) => g.metric)))
    .not.toContain("W' (kJ)");
  expect(result.primaryLimiter).not.toBe("anaerobic_capacity");
});
it("the actual coach adapter preserves the complete automatic list by default", () => {
  const x = preparePrevalidationFixture("B-10K");
  const base = {
    ...x.planConfig,
    identifiedLimitersRaw: ["VLamax", "FatMax", "VMA", "VO2max", "TTE"],
  };
  const before = structuredClone(base);
  const after = applyCoachProfileOverrides(
    defaultCoachPayload,
    base,
    x.diagnostic,
  );
  expect(after.identifiedLimitersRaw).toEqual(base.identifiedLimitersRaw);
  expect(base).toEqual(before);
});
it("a missing VMA does not make cycling FTP a running prescription limiter", () => {
  const result = detectUnifiedLimiter({
    ...input,
    sportFocus: undefined,
    vma: null,
  });
  expect(result.gapAnalysis.find((g) => g.metric === "VMA")?.status).toBe(
    "unknown",
  );
  expect(result.gapAnalysis.find((g) => g.metric === "FTP/kg")).toBeUndefined();
});
import {
  rankPrescriptionGaps,
  resolveCoachLimiterOrder,
} from "@/lib/limiterPrescription";
import { buildPlanConfigFromDiagnostic } from "@/engines/plan/planConfigBuilder";
import { computeDiagnostic } from "@/engines/diagnostic";
import { buildPilotDiagnosticInput } from "@/lib/plan/qa/preparePilotTrainingPlanContext";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
it.each([
  "5K",
  "10K",
  "Semi",
  "Marathon",
  "Trail",
  "TrailMountain",
  "TrailUltra",
])(
  "%s preserves bike W prime in the diagnostic but excludes its prescription, independently of VMA presence",
  (objectif) => {
    for (const vma of [null, 15]) {
      const x = detectUnifiedLimiter({ ...input, objectif, vma }),
        w = x.gapAnalysis.find((g) => g.metric === "W' (kJ)")!;
      expect(w).toMatchObject({
        value: 60,
        measurementDiscipline: "bike",
        prescriptionApplicable: false,
      });
      expect(rankPrescriptionGaps(x.gapAnalysis).map((g) => g.metric)).not
        .toContain("W' (kJ)");
    }
  },
);
it.each(["Sprint", "Olympic", "703", "IM"])(
  "%s still ranks the valid cycling W prime without changing its numerical assessment",
  (objectif) => {
    const x = detectUnifiedLimiter({ ...input, objectif, sportFocus: "tri" }),
      w = x.gapAnalysis.find((g) => g.metric === "W' (kJ)")!;
    expect(w).toMatchObject({
      value: 60,
      measurementDiscipline: "bike",
      prescriptionApplicable: true,
      status: "limiting",
    });
    expect(x.categoryRanking.flatMap((c) => c.metrics.map((g) => g.metric)))
      .toContain("W' (kJ)");
  },
);
it("the diagnostic bridge retains all original cycling measurements and historical W prime", () => {
  const profile = QA_PROFILES.find((p) => p.id === "B-10K")!;
  const raw = {
    ...buildPilotDiagnosticInput(profile),
    wprimeKj: 60,
    cpDataQuality: "good" as const,
  };
  const before = structuredClone(raw);
  const diagnostic = computeDiagnostic(raw),
    config = buildPlanConfigFromDiagnostic(diagnostic, {
      objective: "10K",
      ambition: "competitor",
      trainingLevel: "light",
      weeksAvailable: 12,
    });
  expect(raw).toEqual(before);
  expect(diagnostic._rawInput.wprimeKj).toBe(60);
  expect(
    diagnostic.limiter.gapAnalysis.find((g) => g.metric === "W' (kJ)")?.value,
  ).toBe(60);
  expect(config.identifiedLimitersRaw).not.toContain("W' (kJ)");
});
it("legacy manual priorities promote choices without erasing the remaining applicable metrics", () => {
  const x = preparePrevalidationFixture("B-10K");
  const base = {
    ...x.planConfig,
    identifiedLimitersRaw: ["VLamax", "FatMax", "VMA", "VO2max", "TTE"],
  };
  const after = applyCoachProfileOverrides(
    {
      ...defaultCoachPayload,
      primaryLimiter: "motor",
      primaryLimiterMetric: "VO2max",
      overriddenByCoach: { primary: true, secondary: false },
    },
    base,
    x.diagnostic,
  );
  expect(after.identifiedLimitersRaw).toEqual([
    "VO2max",
    "VLamax",
    "FatMax",
    "VMA",
    "TTE",
  ]);
});
it("only explicit exclusions remove metrics, and no stale cycling selection can override CAP applicability", () => {
  expect(
    resolveCoachLimiterOrder(["VLamax", "FatMax", "VMA", "VO2max"], {
      order: ["VMA", "VLamax", "FatMax", "VO2max"],
      excluded: ["FatMax"],
    }),
  ).toEqual(["VMA", "VLamax", "VO2max"]);
  const x = preparePrevalidationFixture("B-10K");
  const base = {
    ...x.planConfig,
    identifiedLimitersRaw: ["VLamax", "FatMax", "VMA"],
  };
  const after = applyCoachProfileOverrides(
    {
      ...defaultCoachPayload,
      limiterOrder: ["W' (kJ)", "VMA", "VLamax", "FatMax"],
      excludedLimiterMetrics: ["FatMax"],
    },
    base,
    x.diagnostic,
  );
  expect(after.identifiedLimitersRaw).toEqual(["VMA", "VLamax"]);
  expect(after.prohibitions).toEqual(base.prohibitions);
  expect(after.identifiedLimiters?.join("\n")).toContain(
    "Exclusions explicites",
  );
});
it("cycling W prime cannot alter running prescription readiness when the applicable running measurements are unchanged", () => {
  const p = QA_PROFILES.find((p) => p.id === "B-10K")!;
  const common = {
    ...buildPilotDiagnosticInput(p),
    runEconomyScore: 90,
    cpDataQuality: "good" as const,
  };
  const low = computeDiagnostic({ ...common, wprimeKj: 5 }),
    high = computeDiagnostic({ ...common, wprimeKj: 60 });
  expect({ ...low.readiness, timestamp: undefined }).toEqual({
    ...high.readiness,
    timestamp: undefined,
  });
  expect(low.limiter.primaryLimiter).toBe(high.limiter.primaryLimiter);
});
import { analyzeCriticalPower } from "@/lib/v2/criticalPowerModel";
import { prepareTrainingPlanContext } from "@/engines/plan/prepareTrainingPlanContext";
import { prevalidateGenerationScope } from "@/hooks/useAITrainingPlan";
import { deriveLimiterKeysFromGapAnalysis } from "@/engines/plan/planValidator";
it.each(["10K", "TrailMountain", "703"])(
  "%s transmits all applicable priorities from real offline CP calculation through the coach adapter and prevalidation",
  (objective) => {
    const profile = QA_PROFILES.find((p) => p.id === "B-10K")!;
    // Exact existing page bridge: cycling power fields, not running-power fields.
    const power = {
      pmax_5s: profile.athleteData.pmax5s,
      p30s_w: profile.athleteData.p30s,
      p60s_w: profile.athleteData.p60s,
      map5min_w: profile.athleteData.map5min,
      ftp: profile.athleteData.ftp,
    };
    const cp = analyzeCriticalPower(power);
    expect(cp).not.toBeNull();
    const diagnosticInput = {
      ...buildPilotDiagnosticInput(profile),
      objectif: objective,
      sportFocus: objective === "703" ? "tri" as const : "run" as const,
      wprimeKj: cp!.wprimeKJ,
      cpDataQuality: cp!.dataQuality,
    };
    const x = prepareTrainingPlanContext({
      diagnosticInput,
      formConfig: {
        objective,
        trainingLevel: "light",
        ambition: "competitor",
        weeksAvailable: 12,
        planStartDate: "2026-10-26",
      },
    });
    const before = structuredClone(x.planConfig);
    const config = applyCoachProfileOverrides(
      {
        ...defaultCoachPayload,
        limiterOrder: x.planConfig.identifiedLimitersRaw,
        excludedLimiterMetrics: [],
      },
      x.planConfig,
      x.diagnostic,
    );
    expect(config.identifiedLimitersRaw).toEqual(
      x.planConfig.identifiedLimitersRaw,
    );
    expect(x.planConfig).toEqual(before);
    const report = prevalidateGenerationScope(x.athleteData, {
      ...config,
      _outputFormat: "json",
    });
    expect(report.limiterPriorities).toEqual(
      config.identifiedLimitersRaw ?? [],
    );
    expect(x.diagnostic._rawInput.wprimeKj).toBe(cp!.wprimeKJ);
    if (objective !== "703") {
      expect(report.limiterPriorities).not.toContain("W' (kJ)");
    }
    expect(report.weeks).toHaveLength(12);
  },
);
it("a deliberate coach exclusion is also respected by the existing final limiter-key validator", () => {
  const gaps = [{ metric: "VLamax", weightedImpact: 50, status: "limiting" }, {
    metric: "FatMax",
    weightedImpact: 40,
    status: "limiting",
  }, { metric: "VMA", weightedImpact: 30, status: "limiting" }];
  expect(deriveLimiterKeysFromGapAnalysis(gaps, undefined, ["VMA", "VLamax"]))
    .toEqual(["vlamax", "vo2max"]);
  expect(deriveLimiterKeysFromGapAnalysis(gaps)).toEqual([
    "vlamax",
    "fatmax",
    "vo2max",
  ]);
});
