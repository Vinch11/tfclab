import { describe, expect, it } from "vitest";
import { buildPlanConfigFromDiagnostic } from "../planConfigBuilder";
import { prepareTrainingPlanContext } from "../prepareTrainingPlanContext";
import {
  buildPilotDiagnosticInput,
  buildPilotFormConfig,
  preparePilotTrainingPlanContext,
} from "@/lib/plan/qa/preparePilotTrainingPlanContext";
import { QA_PROFILES, type QAProfile } from "@/lib/plan/qa/syntheticProfiles";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";

function beginnerProfile(): QAProfile {
  const profile = QA_PROFILES.find(candidate => candidate.id === "B-5K-BEGINNER");
  if (!profile) throw new Error("Profil B-5K-BEGINNER introuvable");
  return profile;
}

describe("prepareTrainingPlanContext", () => {
  it("produit la même préparation pour un profil cockpit et le chemin coach partagé", () => {
    const profile = beginnerProfile();
    const cockpit = preparePilotTrainingPlanContext(profile);
    const coachPath = prepareTrainingPlanContext({
      diagnosticInput: buildPilotDiagnosticInput(profile),
      athleteData: profile.athleteData,
      formConfig: buildPilotFormConfig(profile.planConfig),
      fcMax: profile.athleteData.fcMax,
    });

    expect(cockpit.diagnostic.limiter).toEqual(coachPath.diagnostic.limiter);
    expect(cockpit.decision.strategy).toEqual(coachPath.decision.strategy);
    expect(cockpit.planConfig.identifiedLimitersRaw).toEqual(coachPath.planConfig.identifiedLimitersRaw);
    expect(cockpit.planConfig.activeLevers).toEqual(coachPath.planConfig.activeLevers);
    expect(cockpit.planConfig.prohibitions).toEqual(coachPath.planConfig.prohibitions);
    expect(cockpit.planConfig.strategyContext).toEqual(coachPath.planConfig.strategyContext);
  });

  it("exécute diagnostic et décision sans inventer les priorités ni leur origine", () => {
    const prepared = preparePilotTrainingPlanContext(beginnerProfile());
    const ranked = [...prepared.diagnostic.limiter.gapAnalysis]
      .filter(gap => gap.weightedImpact > 0)
      .sort((a, b) => b.weightedImpact - a.weightedImpact);

    expect(prepared.trace.diagnostic.executed).toBe(true);
    expect(prepared.trace.decision.executed).toBe(true);
    expect(prepared.decision.strategy._lorangInput?.athlete.discipline).toBe("10k");
    expect(prepared.trace.diagnostic.limiters.map(item => item.metric)).toEqual(ranked.map(item => item.metric));
    expect(prepared.trace.diagnostic.limiters.map(item => item.priority)).toEqual(ranked.map((_, index) => index + 1));
    expect(prepared.trace.diagnostic.confidenceGlobal).toBe(prepared.diagnostic.meta.confidenceGlobal);
    expect(prepared.trace.diagnostic.dataCompleteness).toBe(prepared.diagnostic.meta.dataCompleteness);
  });

  it("transmet les leviers de la décision avec priorité, adaptation et confiance", () => {
    const prepared = preparePilotTrainingPlanContext(beginnerProfile());
    const expected = [...prepared.decision.strategy.levers].sort((a, b) => a.priority - b.priority);

    expect(prepared.planConfig.activeLevers).toEqual(expected.map(lever => lever.label));
    expect(prepared.planConfig.strategyContext?.levers.map(lever => lever.id)).toEqual(expected.map(lever => lever.lever));
    expect(prepared.planConfig.strategyContext?.levers.map(lever => lever.priority)).toEqual(expected.map(lever => lever.priority));
    expect(prepared.planConfig.strategyContext?.levers.map(lever => lever.adaptations)).toEqual(expected.map(lever => lever.prescription));
    expect(prepared.planConfig.strategyContext?.confidence).toBe(prepared.decision.strategy.confidence);
    expect(prepared.trace.transmission.activeLevers.origin).toBe("decision.strategy.levers");
  });

  it("préserve contraintes, contre-indications et données du profil", () => {
    const profile = beginnerProfile();
    const prepared = preparePilotTrainingPlanContext(profile);

    expect(prepared.planConfig.constraints).toBe(profile.planConfig.constraints);
    expect(prepared.athleteData).toEqual(profile.athleteData);
    for (const rule of prepared.decision.strategy.prohibitions) {
      expect(prepared.planConfig.prohibitions?.some(text => text.includes(rule.label) && text.includes(rule.reason))).toBe(true);
    }
    expect(prepared.trace.transmission.prohibitions.consumers).toContain("workoutCatalogBuilder.prohibitions");
  });

  it("signale explicitement les données insuffisantes et conserve la source réelle de stratégie", () => {
    const base = beginnerProfile();
    const sparse: QAProfile = {
      ...base,
      id: "B-5K-BEGINNER",
      athleteData: {
        nom: "QA sparse",
        sex: "female",
        age: 42,
        weightKg: null,
        vo2max: null,
        vma: null,
        vlamax: null,
        vlamaxRun: null,
        paceThresholdSecPerKm: null,
        runEconomyScore: null,
      },
    };
    const prepared = preparePilotTrainingPlanContext(sparse);

    expect(prepared.trace.diagnostic.dataCompleteness).toBeLessThan(0.75);
    expect(prepared.trace.diagnostic.uncertainty.length).toBeGreaterThan(0);
    expect(prepared.trace.decision.source).toBe(
      prepared.decision.strategy._lorangResult
        ? "lorang"
        : prepared.decision.strategy._matrixResult
          ? "matrix"
          : prepared.decision.strategy.primaryAction
            ? "diagnostic_fallback"
            : "unavailable",
    );
    expect(prepared.trace.transmission.prescriptionIntent.status).toBe("not_verified");
  });

  it("préserve la configuration coach historique tout en ajoutant la décision", () => {
    const profile = beginnerProfile();
    const diagnosticInput = buildPilotDiagnosticInput(profile);
    const formConfig = buildPilotFormConfig(profile.planConfig);
    const prepared = prepareTrainingPlanContext({ diagnosticInput, formConfig });
    const legacyConfig = buildPlanConfigFromDiagnostic(prepared.diagnostic, formConfig);

    for (const key of [
      "objective", "weeksAvailable", "weeklyHours", "sessionsPerWeek", "strengthSessionsPerWeek",
      "ambition", "ambitionMeta", "constraints", "identifiedLimitersRaw", "chantierDurationWeeks",
      "fondationDurationWeeks", "injuryRisk", "recentLoad", "terrainAvailability",
    ] as const) {
      expect(prepared.planConfig[key]).toEqual(legacyConfig[key]);
    }
  });

  it("reste compatible avec les métadonnées fermées des réparations PR #383", () => {
    const prepared = preparePilotTrainingPlanContext(beginnerProfile());
    const catalog = buildWorkoutCatalog("5 KM", 1, 4, 12, {
      maxItems: 80,
      limiters: prepared.planConfig.identifiedLimitersRaw,
      prohibitions: prepared.planConfig.prohibitions,
      beginnerIntensitySignal: prepared.planConfig.ambitionMeta
        ? {
            trainingLevel: prepared.planConfig.ambitionMeta.trainingLevel,
            trainingLevelSource: prepared.planConfig.ambitionMeta.trainingLevelSource,
          }
        : null,
    });

    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.every(entry => entry.repairMetadata.id === entry.id)).toBe(true);
    expect(catalog.every(entry => entry.repairMetadata.metadataVersion === 1)).toBe(true);
    expect(catalog.every(entry => entry.repairMetadata.intentFamily.length > 0)).toBe(true);
  });
});
