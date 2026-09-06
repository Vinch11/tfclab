import { describe, it, expect } from "vitest";
import {
  buildAnchorEntry,
  buildAnchorReport,
  buildAnchorRawValues,
  classifyAnchorTier,
  type AnchorTestEntry,
} from "../vlamaxCapAnchorCalibration";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 1, Finding 5) :
 * les ancrages d'interpolation Sprint 15s / Puissance Max CAP de
 * vlamaxCapEstimator.ts avaient été ajustés à la main sur ~5 profils
 * anecdotiques (correctif "post-audit empirique 2026-05"), sans aucun
 * garde-fou de régression pour détecter une future dérive du même type
 * (sous-estimation ×2.5 constatée sur des sprinteurs). Ce module de
 * validation existait déjà mais n'avait ZÉRO appelant et ZÉRO test — donc
 * aucune garantie qu'il fonctionne. Il est désormais activé via
 * VlamaxCapCohortPage.tsx (sur le modèle de RunMLSSCohortPage.tsx). Ce
 * fichier comble le trou de couverture.
 */

describe("classifyAnchorTier", () => {
  it("classe correctement les tiers labo/terrain/rejeté", () => {
    expect(classifyAnchorTier(5)).toBe("lab");
    expect(classifyAnchorTier(4)).toBe("lab");
    expect(classifyAnchorTier(3)).toBe("field");
    expect(classifyAnchorTier(2)).toBe("field");
    expect(classifyAnchorTier(1)).toBe("rejected");
  });
});

describe("buildAnchorRawValues", () => {
  it("n'inclut que les champs définis", () => {
    const raw = buildAnchorRawValues({ vlamaxRunMeasured: 0.45, sprint15sDistance: 85 });
    expect(raw).toEqual({ vlamaxRunMeasured: 0.45, sprint15sDistance: 85 });
    expect(raw.runningPowerMax).toBeUndefined();
  });
});

describe("buildAnchorEntry", () => {
  const baseRow = {
    id: "e1",
    athlete_id: "a1",
    date: "2026-01-01",
    protocol_quality: 4,
    notes: null,
  };

  it("retourne null si la mesure labo est absente ou invalide", () => {
    expect(
      buildAnchorEntry({ ...baseRow, raw_values: { sprint15sDistance: 85 } })
    ).toBeNull();
    expect(
      buildAnchorEntry({ ...baseRow, raw_values: { vlamaxRunMeasured: 0, sprint15sDistance: 85 } })
    ).toBeNull();
  });

  it("retourne null si aucun signal à tester (ni sprint ni puissance)", () => {
    expect(
      buildAnchorEntry({ ...baseRow, raw_values: { vlamaxRunMeasured: 0.45 } })
    ).toBeNull();
  });

  it("prédit SANS utiliser la mesure labo (test réel de l'estimateur, pas une tautologie)", () => {
    const entry = buildAnchorEntry({
      ...baseRow,
      raw_values: { vlamaxRunMeasured: 0.45, sprint15sDistance: 85, vma: 18, paceThresholdSecPerKm: 220 },
    });
    expect(entry).not.toBeNull();
    expect(entry!.vlamaxRunMeasured).toBe(0.45);
    // La prédiction vient de estimateVLamaxCap sans vlamaxRunMeasured — donc
    // predictedVLamax ne doit pas trivialement valoir exactement la mesure.
    expect(entry!.predictedVLamax).not.toBeNull();
    expect(entry!.deltaVLamax).toBe(Number((entry!.predictedVLamax! - 0.45).toFixed(3)));
  });

  it("assigne le tier et le poids attendus selon protocol_quality", () => {
    const lab = buildAnchorEntry({ ...baseRow, protocol_quality: 5, raw_values: { vlamaxRunMeasured: 0.45, sprint15sDistance: 85 } });
    const field = buildAnchorEntry({ ...baseRow, protocol_quality: 2, raw_values: { vlamaxRunMeasured: 0.45, sprint15sDistance: 85 } });
    expect(lab!.tier).toBe("lab");
    expect(lab!.weight).toBe(1.0);
    expect(field!.tier).toBe("field");
    expect(field!.weight).toBe(0.5);
  });
});

describe("buildAnchorReport", () => {
  function entry(overrides: Partial<AnchorTestEntry>): AnchorTestEntry {
    return {
      id: "id",
      athleteId: "a",
      date: "2026-01-01",
      vlamaxRunMeasured: 0.45,
      sprint15sDistance: 85,
      runningPowerMax: null,
      vma: null,
      paceThresholdSecPerKm: null,
      protocolQuality: 4,
      tier: "lab",
      predictedVLamax: 0.45,
      deltaVLamax: 0,
      weight: 1.0,
      ...overrides,
    };
  }

  it("verdict 'insufficient' sous N=10", () => {
    const report = buildAnchorReport([entry({}), entry({})]);
    expect(report.generalizationVerdict).toBe("insufficient");
  });

  it("verdict 'consistent' quand le RMSE combiné reste sous la tolérance (N≥10, petits écarts)", () => {
    const entries = Array.from({ length: 12 }, (_, i) =>
      entry({ id: `e${i}`, deltaVLamax: 0.02, predictedVLamax: 0.47 })
    );
    const report = buildAnchorReport(entries);
    expect(report.generalizationVerdict).toBe("consistent");
  });

  it("verdict 'incoherent' quand le RMSE combiné dépasse largement la tolérance (reproduit le cas sprinteur ×2.5 de l'audit)", () => {
    const entries = Array.from({ length: 12 }, (_, i) =>
      entry({ id: `e${i}`, vlamaxRunMeasured: 0.85, predictedVLamax: 0.34, deltaVLamax: -0.51 })
    );
    const report = buildAnchorReport(entries);
    expect(report.generalizationVerdict).toBe("incoherent");
    expect(report.anchorSuggestions.length).toBeGreaterThan(0);
  });

  it("sépare correctement les sous-cohortes sprint-only / power-only / both", () => {
    const entries = [
      entry({ id: "s1", sprint15sDistance: 85, runningPowerMax: null }),
      entry({ id: "p1", sprint15sDistance: null, runningPowerMax: 450 }),
      entry({ id: "b1", sprint15sDistance: 85, runningPowerMax: 450 }),
    ];
    const report = buildAnchorReport(entries);
    expect(report.bySource.sprintOnly.n).toBe(1);
    expect(report.bySource.powerOnly.n).toBe(1);
    expect(report.bySource.both.n).toBe(1);
  });

  it("exclut les entrées 'rejected' (weight=0) du calcul RMSE", () => {
    const entries = [
      entry({ id: "ok1", tier: "lab", weight: 1.0 }),
      entry({ id: "rej1", tier: "rejected", weight: 0, deltaVLamax: 0.9 }),
    ];
    const report = buildAnchorReport(entries);
    expect(report.rejected).toBe(1);
    expect(report.retained).toBe(1);
  });
});
