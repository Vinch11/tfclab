import { describe, it, expect } from "vitest";
import { computePotentielEffectifRich } from "../potentielPhysiologiqueEffectif";
import type { UnifiedReadinessInput } from "../readinessSource";
import type { VLamaxEffectif } from "../vlamaxEffectif";
import type { TTEEffectif } from "../tteEffectif";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 2, Phase 3) :
 * 7 appelants du stub 2 facteurs computePotentielEffectif subsistaient en
 * dehors du Dashboard (PR #153) et de RaceSimulationPage (PR #154) —
 * WeekSelectorTFCL, WahooPersonalizedRecommendations, ExportTools (second
 * usage), FatigueComparisonChart, DashboardRecommendationsCard,
 * getAssistantContext, TemplatesPage. computePotentielEffectifRich est un
 * remplacement direct (même forme PotentielPhysiologiqueEffectif) mais
 * backé par le moteur riche à 4 piliers (computeDiagnostic), garantissant
 * que ces 7 écrans/consommateurs affichent désormais le même score que le
 * Dashboard pour un même athlète.
 */

const VLAMAX_FIXTURE: VLamaxEffectif = {
  value: 0.45,
  source: "test",
  confidence: 0.9,
  label: "Test terrain",
};

const TTE_FIXTURE: TTEEffectif = {
  tte_min: 40,
  source: "observed",
  confidence: 0.95,
  label: "Observé",
};

const BASE_INPUT: UnifiedReadinessInput = {
  objectif: "IM",
  vlamaxEffectif: VLAMAX_FIXTURE,
  tteEffectif: TTE_FIXTURE,
  ftp: 245,
  weightKg: 70,
  athleteAge: 40,
  ambition: "age_group",
  tss7d: 400,
  vo2max: 55,
  sportFocus: "bike",
};

describe("computePotentielEffectifRich", () => {
  it("diverge du stub 2-facteurs (70/'En progression') pour un profil où le moteur riche donne un score différent", () => {
    const result = computePotentielEffectifRich(BASE_INPUT);
    // Stub : VLamax=0.45≤0.50 → 70, TTE=40≥30 → 70, moyenne 70, "En progression".
    expect(result.score).not.toBe(70);
    expect(result.label).not.toBe("En progression");
    expect(result.isInsufficient).toBe(false);
  });

  it("retourne la forme PotentielPhysiologiqueEffectif complète (score/label/color/confidence/details)", () => {
    const result = computePotentielEffectifRich(BASE_INPUT);
    expect(typeof result.score).toBe("number");
    expect(typeof result.label).toBe("string");
    expect(typeof result.color).toBe("string");
    expect(typeof result.confidence).toBe("number");
    expect(result.details).toBeDefined();
  });

  it("retourne insufficientPotentielResult (score 0, isInsufficient true) quand vlamaxEffectif est absent", () => {
    const result = computePotentielEffectifRich({ ...BASE_INPUT, vlamaxEffectif: null });
    expect(result.score).toBe(0);
    expect(result.isInsufficient).toBe(true);
    expect(result.label).toBe("Données insuffisantes");
  });

  it("retourne insufficientPotentielResult quand tteEffectif est absent", () => {
    const result = computePotentielEffectifRich({ ...BASE_INPUT, tteEffectif: null });
    expect(result.score).toBe(0);
    expect(result.isInsufficient).toBe(true);
  });

  it("fonctionne sans les champs enrichis optionnels (comme les anciens appelants du stub)", () => {
    const minimal: UnifiedReadinessInput = {
      objectif: "IM",
      vlamaxEffectif: VLAMAX_FIXTURE,
      tteEffectif: TTE_FIXTURE,
      ftp: 245,
      weightKg: 70,
    };
    const result = computePotentielEffectifRich(minimal);
    expect(result).toBeDefined();
    expect(typeof result.score).toBe("number");
  });

  it("est cohérent avec computeRichPotentielV2 (même source de vérité, pas de double implémentation)", async () => {
    const { computeRichPotentielV2 } = await import("../readinessSource");
    const v2 = computeRichPotentielV2(BASE_INPUT);
    const rich = computePotentielEffectifRich(BASE_INPUT);
    expect(v2).not.toBeNull();
    expect(rich.score).toBe(v2!.readiness.score);
  });
});
