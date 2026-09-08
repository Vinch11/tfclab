import { describe, it, expect } from "vitest";
import { computeUnifiedReadiness, type UnifiedReadinessInput } from "../readinessSource";
import type { VLamaxEffectif } from "../vlamaxEffectif";
import type { TTEEffectif } from "../tteEffectif";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 2, Phase 2) :
 * computeUnifiedReadiness (source unique consommée par RaceSimulationPage,
 * staffPacingReport, pacingEnvelopeEngine, pacingDisciplineRules) retombait
 * sur le stub 2 facteurs (VLamax+TTE, computePotentielEffectif) au lieu du
 * moteur riche à 4 piliers (computeDecisionTFCL) déjà utilisé par le
 * Dashboard/PDF (PR #153) — 21 points d'écart et verdict opposé pour le
 * même athlète selon l'écran. Ce fichier vérifie que readinessSource.ts
 * passe désormais par computeDiagnostic() et que la garde "Données
 * insuffisantes" reste intacte.
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

describe("computeUnifiedReadiness — moteur riche (computeDiagnostic)", () => {
  it("diverge du stub 2-facteurs pour un profil où le stub donnerait 70/'En progression'", () => {
    const result = computeUnifiedReadiness(BASE_INPUT);
    // Stub 2-facteurs (VLamax=0.45≤0.50 → 70, TTE=40≥30 → 70, moyenne 70) :
    // score attendu 70, niveau "moderate". Le moteur riche doit diverger
    // nettement pour ce même profil (mêmes valeurs qu'en Phase 1).
    expect(result.score).not.toBe(70);
    expect(result.score).not.toBeNull();
  });

  it("un score élevé produit level='optimal' et badge=null (pas de 'Readiness réduit')", () => {
    const result = computeUnifiedReadiness(BASE_INPUT);
    if (result.score !== null && result.score >= 80) {
      expect(result.level).toBe("optimal");
      expect(result.badge).toBeNull();
      expect(result.isReduced).toBe(false);
    }
  });

  it("garde 'Données insuffisantes' intacte quand vlamaxEffectif est absent", () => {
    const result = computeUnifiedReadiness({ ...BASE_INPUT, vlamaxEffectif: null });
    expect(result.score).toBeNull();
    expect(result.level).toBe("insufficient");
    expect(result.badge).toBeNull();
  });

  it("garde 'Données insuffisantes' intacte quand tteEffectif est absent", () => {
    const result = computeUnifiedReadiness({ ...BASE_INPUT, tteEffectif: null });
    expect(result.score).toBeNull();
    expect(result.level).toBe("insufficient");
  });

  it("fonctionne sans les champs enrichis optionnels (vo2max, pmax5s, etc. absents)", () => {
    const minimal: UnifiedReadinessInput = {
      objectif: "IM",
      vlamaxEffectif: VLAMAX_FIXTURE,
      tteEffectif: TTE_FIXTURE,
      ftp: 245,
      weightKg: 70,
      athleteAge: 40,
      ambition: "age_group",
      tss7d: 400,
    };
    const result = computeUnifiedReadiness(minimal);
    // Ne doit pas planter — dataIncomplete peut pénaliser la confiance mais
    // le calcul doit rester possible, comme tout autre appelant de
    // computeDiagnostic (cf. commentaire UnifiedReadinessInput).
    expect(result).toBeDefined();
    expect(["insufficient", "reduced", "moderate", "optimal"]).toContain(result.level);
  });

  it("reste stable et déterministe pour un même input (pas d'aléatoire caché)", () => {
    const a = computeUnifiedReadiness(BASE_INPUT);
    const b = computeUnifiedReadiness(BASE_INPUT);
    expect(a.score).toBe(b.score);
    expect(a.level).toBe(b.level);
  });
});
