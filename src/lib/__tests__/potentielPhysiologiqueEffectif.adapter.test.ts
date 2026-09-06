import { describe, it, expect } from "vitest";
import { adaptPotentielV2ToLegacyShape, insufficientPotentielResult } from "../potentielPhysiologiqueEffectif";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import type { DiagnosticInput } from "@/engines/diagnostic/types";
import type { PotentielV2Result } from "@/lib/v2/potentielTypes";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 2) : deux
 * moteurs de "Potentiel Physiologique" totalement indépendants coexistaient
 * — un stub 2 facteurs (computePotentielEffectif) câblé sur le Dashboard,
 * RaceSimulationPage, l'assistant IA et les recommandations Wahoo, et un
 * moteur riche à 4 piliers (computeDecisionTFCL) câblé uniquement dans le
 * PDF exporté. Pour un même athlète : 70 "En progression" (stub) vs 91
 * "Prêt" (moteur riche) — verdict opposé selon l'écran.
 *
 * Cet adaptateur (adaptPotentielV2ToLegacyShape) permet au Dashboard
 * (Index.tsx) d'utiliser désormais le moteur riche déjà calculé
 * (dashDiagnostic.readiness) au lieu du stub, sans réécrire les
 * consommateurs historiques de la forme PotentielPhysiologiqueEffectif.
 */

function fixtureV2(overrides: Partial<PotentielV2Result> = {}): PotentielV2Result {
  return {
    potential: {
      score: 91,
      confidence: 0.9,
      sources: {
        aerobic: { value: 100, type: "modeled" },
        tolerance: { value: 81.6, type: "modeled" },
        metabolic: { value: 87.5, type: "modeled" },
        robustness: { value: 100, type: "modeled" },
      },
      mainStrength: "Aérobie",
      mainLimitation: null,
      explanation: "Profil Optimal",
    },
    availability: {
      score: 80,
      confidence: 0.5,
      factors: [],
      alerts: [],
      recommendation: "Module disponibilité retiré",
    },
    readiness: {
      score: 91,
      rawScore: 91,
      category: "ready",
      categoryLabel: "Prêt",
      categoryEmoji: "🟢",
      confidenceGlobal: 0.9,
      confidenceLabel: "Fiable",
    },
    flags: {
      healthAlert: false,
      injuryRiskHigh: false,
      fatigueCritical: false,
      dataIncomplete: false,
    },
    penalties: { total: 0, reasons: [] },
    explanation: { why: "Profil Optimal", watchouts: [], suggestedFocus: [] },
    weights: { potential: 1.0, availability: 0.0 },
    timestamp: new Date().toISOString(),
    version: "test",
    disclaimer: "",
    ...overrides,
  };
}

describe("adaptPotentielV2ToLegacyShape", () => {
  it("mappe le score/label/couleur du moteur riche vers la forme legacy", () => {
    const result = adaptPotentielV2ToLegacyShape(fixtureV2());
    expect(result.score).toBe(91);
    expect(result.label).toBe("Prêt");
    expect(result.color).toBe("success");
    expect(result.isInsufficient).toBe(false);
  });

  it("expose potential/availability/governingFactor avec des valeurs réelles (plus de fallback silencieux ?? 80 / ?? 'potential')", () => {
    const result = adaptPotentielV2ToLegacyShape(fixtureV2()) as any;
    expect(result.potential).toBe(91);
    expect(result.availability).toBe(80);
    expect(result.governingFactor).toBe("potential");
  });

  it("retombe sur 'Données insuffisantes' quand flags.dataIncomplete est vrai", () => {
    const result = adaptPotentielV2ToLegacyShape(fixtureV2({ flags: { healthAlert: false, injuryRiskHigh: false, fatigueCritical: false, dataIncomplete: true } }));
    expect(result.isInsufficient).toBe(true);
    expect(result.label).toBe("Données insuffisantes");
    expect(result.color).toBe("muted");
  });

  it("colorForCategory : 'in_progress' → warning, 'preparation_required' → destructive", () => {
    const inProgress = adaptPotentielV2ToLegacyShape(
      fixtureV2({ readiness: { score: 55, rawScore: 55, category: "in_progress", categoryLabel: "En progression", categoryEmoji: "🟠", confidenceGlobal: 0.7, confidenceLabel: "Indicatif" } })
    );
    expect(inProgress.color).toBe("warning");

    const prepRequired = adaptPotentielV2ToLegacyShape(
      fixtureV2({ readiness: { score: 30, rawScore: 30, category: "preparation_required", categoryLabel: "Préparation requise", categoryEmoji: "🔴", confidenceGlobal: 0.6, confidenceLabel: "Indicatif" } })
    );
    expect(prepRequired.color).toBe("destructive");
  });
});

describe("insufficientPotentielResult", () => {
  it("retourne un score 0 avec isInsufficient=true", () => {
    const result = insufficientPotentielResult();
    expect(result.score).toBe(0);
    expect(result.isInsufficient).toBe(true);
  });
});

describe("Intégration — computeDiagnostic().readiness → adaptPotentielV2ToLegacyShape", () => {
  const BASE_INPUT: DiagnosticInput = {
    athleteId: "test-athlete-1",
    athleteName: "Test Athlete",
    age: 40,
    sex: "M",
    weightKg: 70,
    objectif: "IM",
    ambition: "age_group",
    sportFocus: "bike",
    vo2max: 55,
    ftp: 245,
    ftpKg: 3.5,
    pmax5s: null,
    p30sW: null,
    p60sW: null,
    map5minW: null,
    vma: null,
    css: null,
    vlamax: 0.45,
    vlamaxRun: null,
    vlamaxSource: "test",
    vlamaxProtocol: "30-15",
    vlamaxIsReference: true,
    tteObservedMin: 40,
    tteMode: "observed",
    tss7d: 400,
    fatigueState: null,
    runEconomyScore: null,
    runHrDriftPct: null,
    paceThresholdSecPerKm: null,
    runningPower1s: null,
    runningPower5s: null,
    runningPower30s: null,
    runningPower60s: null,
    runningPower5min: null,
    runningPowerThreshold: null,
    sprint15sDistance: null,
    bikeCadenceRpm: null,
    bikeHrDriftFlag: false,
    protocolQuality: 0.85,
    wprimeKj: null,
    cpDataQuality: null,
    fatmax: null,
    forceDevMode: false,
    giIssuesFlag: false,
  };

  it("le score adapté pour le Dashboard vient bien du moteur riche (4 piliers), pas du stub 2 facteurs", () => {
    const diagnostic = computeDiagnostic(BASE_INPUT);
    const adapted = adaptPotentielV2ToLegacyShape(diagnostic.readiness);
    // Le stub 2-facteurs (VLamax=0.45 ≤ 0.50 → 70, TTE=40 ≥ 30 → 70, moyenne 70)
    // donnerait 70/"En progression" pour ce profil — le moteur riche doit
    // diverger nettement (score plus élevé, catégorie différente), confirmant
    // qu'on n'est plus sur l'ancien stub.
    expect(adapted.score).not.toBe(70);
    expect(adapted.label).not.toBe("En progression");
  });
});
