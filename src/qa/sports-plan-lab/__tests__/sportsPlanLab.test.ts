import { describe, expect, it } from "vitest";
import { analyzeSportsPlan } from "../analyzePlan";
import { normalizePlanExport } from "../normalizePlanExport";
import { renderMarkdownReport } from "../renderReport";
import { getReferenceScenario, REFERENCE_SCENARIOS } from "../scenarios";
import type { CatalogEvidence } from "../types";
import {
  balanced703, balancedIronman, final10kFor703, intenseRecoveryWeek, marathonWithHalf,
  noSwim703, partialDurations, qualityAccumulation, unauthorizedAdvanced,
  reported703IncidentShape, valid10kNoSwim, valid5kNoSwim,
} from "./fixtures";

function analyze(raw: unknown, scenarioId: string, catalog: CatalogEvidence[] = []) {
  const scenario = getReferenceScenario(scenarioId);
  if (!scenario) throw new Error(`Missing scenario ${scenarioId}`);
  return analyzeSportsPlan(normalizePlanExport(raw), scenario, new Map(catalog.map(item => [item.id, item])));
}

describe("scénarios de référence", () => {
  it("couvre les 14 profils demandés sans présenter de mesures physiologiques fictives", () => {
    expect(REFERENCE_SCENARIOS).toHaveLength(14);
    for (const scenario of REFERENCE_SCENARIOS) {
      expect(scenario.fixtureNotice).toBe("synthetic_non_clinical");
      expect(scenario.athleteData.ftp).toBeUndefined();
      expect(scenario.athleteData.vma).toBeUndefined();
      expect(scenario.athleteData.css).toBeUndefined();
      expect(scenario.athleteData.vo2max).toBeUndefined();
    }
  });
});

describe("normalisation des exports structurés", () => {
  it.each([
    ["direct", balanced703],
    ["mergedPlan", { mergedPlan: balanced703 }],
    ["finalMergedPlan", { finalMergedPlan: balanced703 }],
    ["output.mergedPlan", { output: { mergedPlan: balanced703 } }],
    ["output.finalMergedPlan", { output: { finalMergedPlan: balanced703 } }],
  ])("lit la forme %s", (shape, value) => {
    expect(normalizePlanExport(value).sourceShape).toBe(shape);
  });
});

describe("anomalies sportives obligatoires", () => {
  it("détecte un 70.3 sans natation", () => {
    expect(analyze(noSwim703, "confirmed-703").critical.map(item => item.code)).toContain("required_sport_missing");
  });

  it("détecte un 70.3 dont la compétition finale est un 10 km", () => {
    expect(analyze(final10kFor703, "703-with-10k").critical.map(item => item.code)).toContain("final_objective_mismatch");
  });

  it("accepte un 70.3 équilibré sans critique", () => {
    expect(analyze(balanced703, "confirmed-703").critical).toEqual([]);
  });

  it("n'exige pas de natation pour un plan 10 km valide", () => {
    const report = analyze(valid10kNoSwim, "confirmed-10k");
    expect(report.critical).toEqual([]);
    expect(report.findings.some(item => item.code === "required_sport_missing" && item.message.includes("swim"))).toBe(false);
  });

  it("identifie le semi préparatoire d'un marathon", () => {
    expect(analyze(marathonWithHalf, "marathon-with-half").findings.map(item => item.code)).not.toContain("intermediate_race_missing");
  });

  it("détecte une semaine de récupération excessivement intense", () => {
    expect(analyze(intenseRecoveryWeek, "confirmed-10k").critical.map(item => item.code)).toContain("recovery_week_too_intense");
  });

  it("détecte l'accumulation de séances qualitatives", () => {
    expect(analyze(qualityAccumulation, "confirmed-10k").warnings.map(item => item.code)).toContain("quality_sessions_too_close");
  });

  it("détecte une séance avancée sans autorisation", () => {
    const catalog: CatalogEvidence[] = [{
      id: "ADVANCED_TEST", sport: "run", objective: "Test avancé", physiology: null,
      prerequisites: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
    }];
    expect(analyze(unauthorizedAdvanced, "confirmed-10k", catalog).critical.map(item => item.code)).toContain("advanced_session_unapproved");
  });

  it("maintient un blocage absolu même si l'ID est approuvé dans le scénario", () => {
    const catalog: CatalogEvidence[] = [{
      id: "ADVANCED_TEST", sport: "run", objective: "Protocole bloqué", physiology: null,
      prerequisites: { blockAutomaticSelection: true },
    }];
    const baseScenario = getReferenceScenario("confirmed-10k")!;
    const approvedScenario = {
      ...baseScenario,
      expectations: { ...baseScenario.expectations, approvedAdvancedSessionIds: ["ADVANCED_TEST"] },
    };
    const report = analyzeSportsPlan(normalizePlanExport(unauthorizedAdvanced), approvedScenario, new Map([["ADVANCED_TEST", catalog[0]]]));
    expect(report.critical.map(item => item.code)).toContain("advanced_session_absolute_block");
  });

  it("marque les durées partielles comme non vérifiables sans fabriquer de volume", () => {
    const report = analyze(partialDurations, "confirmed-10k");
    expect(report.notVerifiable.map(item => item.code)).toContain("duration_unknown");
    expect(report.coverage.find(item => item.control === "weekly_and_sport_volume")?.status).toBe("partial");
  });

  it("contrôle les disponibilités uniquement lorsqu'elles sont structurées", () => {
    const report = analyze(valid10kNoSwim, "low-availability");
    expect(report.critical.map(item => item.code)).toContain("availability_conflict");
    expect(report.coverage.find(item => item.control === "availability")?.status).toBe("checked");
  });

  it("détecte une progression incompatible avec un scénario prudent", () => {
    const fixture = structuredClone(valid10kNoSwim);
    fixture.weeks[1].sessions[2].durationMin = 180;
    const report = analyze(fixture, "cautious-progression");
    expect(report.warnings.map(item => item.code)).toContain("weekly_volume_increase");
  });
});

describe("intention physiologique et rapport", () => {
  it("ne certifie pas l'intention finale sur la seule métadonnée du catalogue", () => {
    const catalog: CatalogEvidence[] = [{ id: "ADVANCED_TEST", sport: "run", objective: "VO2", physiology: { primary: "vo2max", secondary: [] }, prerequisites: null }];
    const report = analyze(unauthorizedAdvanced, "confirmed-10k", catalog);
    expect(report.notVerifiable.map(item => item.code)).toContain("final_intent_not_verifiable");
  });

  it("signale une intention finale structurée qui contredit la fiche auditée", () => {
    const fixture = structuredClone(unauthorizedAdvanced);
    fixture.weeks[0].sessions[0].finalPhysiologicalIntent = "mlss";
    const catalog: CatalogEvidence[] = [{ id: "ADVANCED_TEST", sport: "run", objective: "VO2", physiology: { primary: "vo2max", secondary: [] }, prerequisites: null }];
    expect(analyze(fixture, "confirmed-10k", catalog).critical.map(item => item.code)).toContain("physiological_intent_mismatch");
  });

  it("est en lecture seule et rend les sections exploitables", () => {
    const before = JSON.stringify(balanced703);
    const report = analyze(balanced703, "confirmed-703");
    expect(JSON.stringify(balanced703)).toBe(before);
    const markdown = renderMarkdownReport(report);
    expect(markdown).toContain("## Synthèse par discipline");
    expect(markdown).toContain("## Tableau hebdomadaire");
    expect(markdown).toContain("## Anomalies critiques");
    expect(markdown).toContain("## Points non vérifiables");
    expect(markdown).toContain("## Couverture réelle");
  });
});

describe("validation complémentaire des cas rapportés et risque de faux positifs", () => {
  it("détecte les trois symptômes publiés de l'incident 70.3 sur une reconstruction explicitement synthétique", () => {
    const normalized = normalizePlanExport(reported703IncidentShape);
    const counts = normalized.weeks.flatMap(week => week.sessions).reduce<Record<string, number>>((acc, session) => {
      if (!session.isRest) acc[session.sport] = (acc[session.sport] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts.swim ?? 0).toBe(0);
    expect(counts.bike).toBe(7);
    expect(counts.run).toBe(163);

    const report = analyzeSportsPlan(normalized, getReferenceScenario("confirmed-703")!);
    expect(report.critical.map(item => item.code)).toContain("required_sport_missing");
    expect(report.warnings.some(item => item.code === "discipline_share_outside_range" && item.message.startsWith("bike "))).toBe(true);
    expect(report.critical.map(item => item.code)).toContain("final_objective_mismatch");
  });

  it.each([
    ["5 km", valid5kNoSwim, "beginner-5k"],
    ["marathon avec semi préparatoire", marathonWithHalf, "marathon-with-half"],
    ["70.3 équilibré", balanced703, "confirmed-703"],
    ["Ironman équilibré", balancedIronman, "confirmed-ironman"],
  ])("ne fabrique pas de critique sur le scénario valide %s", (_label, fixture, scenarioId) => {
    expect(analyze(fixture, scenarioId).critical).toEqual([]);
  });

  it("ne traite pas un export texte/PDF comme un export structuré réel", () => {
    expect(() => normalizePlanExport("Plan TFCL — 10K — Structure Qualifiable — Objectif 38min")).toThrow();
  });
});

